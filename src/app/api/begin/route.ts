import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  WELCOME_TRACK_SLUG,
  beginRequestSchema,
  generateOtpCode,
  hashOtpCode,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  UNVERIFIED_MAX_AGE_MS,
} from '@/lib/enroll';
import { sendEnrollmentVerificationEmail } from '@/lib/enrollment-notifications';

// Run 19 — public endpoint, step 1 of the Welcome Track "Begin" flow.
// The Welcome Track deliberately has its own warmer front door (/begin),
// separate from /enroll. Same trusted machinery underneath: creates an
// UNVERIFIED EnrollmentRequest and emails a 6-digit code; the request only
// becomes PENDING (visible in the admin queue) after /api/enroll/verify.
// Re-submitting with the same email reuses the unverified row (acts as a
// resend, with cooldown). Verify + resend endpoints are shared with /enroll.

export async function POST(request: NextRequest) {
  try {
    const parsed = beginRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Mind checking your first name and email? That\u2019s all we need to save your place.' }, { status: 400 });
    }

    // Honeypot — humans never see or fill this field. Pretend success so
    // bots learn nothing; no row is created and no email is sent.
    if (parsed.data.website && parsed.data.website.trim() !== '') {
      return NextResponse.json({ requiresVerification: true, requestId: 'ok' });
    }

    const firstName = parsed.data.firstName;
    const lastName = parsed.data.lastName?.trim() || '';
    const email = parsed.data.email.toLowerCase();
    const phone = parsed.data.phone?.trim() || null;
    const cohortId = parsed.data.cohortId || null;
    const audience = parsed.data.audience || null;
    const shareNote = parsed.data.shareNote?.trim() || null;

    // Opportunistic sweep of stale unverified rows (no cron needed)
    await (prisma as any).enrollmentRequest.deleteMany({
      where: { status: 'UNVERIFIED', createdAt: { lt: new Date(Date.now() - UNVERIFIED_MAX_AGE_MS) } },
    });

    const track = await (prisma as any).track.findFirst({
      where: { slug: WELCOME_TRACK_SLUG, isActive: true },
      select: { id: true, name: true },
    });
    if (!track) {
      return NextResponse.json({ error: 'The Welcome Track is not open for sign-ups right now \u2014 please reach out to us directly and we\u2019ll help you begin.' }, { status: 400 });
    }

    // Cohort, if chosen, must belong to the Welcome Track and be active
    let cohort: { id: string } | null = null;
    if (cohortId) {
      cohort = await (prisma as any).trackCohort.findFirst({
        where: { id: cohortId, trackId: track.id, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!cohort) {
        return NextResponse.json({ error: 'That start date is no longer available \u2014 please pick another, or choose \u201cJust tell me when the next one starts.\u201d' }, { status: 400 });
      }
    }

    // Match an existing registered user by email (a member re-anchoring)
    const matchedUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });

    // Guard: already enrolled in the Welcome Track (as a user or a guest)?
    const existingEnrollment = await (prisma as any).trackEnrollment.findFirst({
      where: {
        trackId: track.id,
        status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
        OR: [
          ...(matchedUser ? [{ userId: matchedUser.id }] : []),
          { guest: { email: { equals: email, mode: 'insensitive' } } },
        ],
      },
      select: { id: true },
    });
    if (existingEnrollment) {
      return NextResponse.json({ error: 'Good news \u2014 your place is already saved! Check your email for your personal journey page link, or reach out and we\u2019ll send it again.' }, { status: 400 });
    }

    // Guard: a verified request for the same email is already waiting
    const pending = await (prisma as any).enrollmentRequest.findFirst({
      where: {
        trackId: track.id,
        status: 'PENDING',
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (pending) {
      return NextResponse.json({ error: 'You\u2019re already on our list \u2014 someone from our family will be in touch very soon. We\u2019re glad you\u2019re coming.' }, { status: 400 });
    }

    // Reuse an unverified attempt for the same email (acts as resend)
    const unverified = await (prisma as any).enrollmentRequest.findFirst({
      where: {
        trackId: track.id,
        status: 'UNVERIFIED',
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true, verifySentAt: true },
    });

    const details = {
      firstName,
      lastName,
      phone,
      cohortId: cohort?.id || null,
      matchedUserId: matchedUser?.id || null,
      audience,
      shareNote,
    };

    const now = Date.now();
    if (unverified) {
      const sentAgo = unverified.verifySentAt ? now - new Date(unverified.verifySentAt).getTime() : Infinity;
      const withinCooldown = sentAgo < OTP_RESEND_COOLDOWN_MS;

      if (withinCooldown) {
        // Update details but keep the current code — it was just emailed
        await (prisma as any).enrollmentRequest.update({
          where: { id: unverified.id },
          data: details,
        });
        return NextResponse.json({ requiresVerification: true, requestId: unverified.id, resent: false });
      }

      const code = generateOtpCode();
      await (prisma as any).enrollmentRequest.update({
        where: { id: unverified.id },
        data: {
          ...details,
          verifyCodeHash: hashOtpCode(unverified.id, code),
          verifyExpiresAt: new Date(now + OTP_TTL_MS),
          verifySentAt: new Date(now),
          verifyAttempts: 0,
        },
      });
      const sent = await sendEnrollmentVerificationEmail({ firstName, email, trackName: track.name, code });
      if (!sent) {
        return NextResponse.json({ error: 'Hmm \u2014 we couldn\u2019t reach that email address. Mind checking it and trying once more?' }, { status: 502 });
      }
      return NextResponse.json({ requiresVerification: true, requestId: unverified.id, resent: true });
    }

    // Fresh request: create UNVERIFIED, then attach the code hash (the hash
    // is salted with the row id, so the row must exist first)
    const created = await (prisma as any).enrollmentRequest.create({
      data: {
        trackId: track.id,
        email,
        status: 'UNVERIFIED',
        ...details,
      },
      select: { id: true },
    });
    const code = generateOtpCode();
    await (prisma as any).enrollmentRequest.update({
      where: { id: created.id },
      data: {
        verifyCodeHash: hashOtpCode(created.id, code),
        verifyExpiresAt: new Date(now + OTP_TTL_MS),
        verifySentAt: new Date(now),
      },
    });
    const sent = await sendEnrollmentVerificationEmail({ firstName, email, trackName: track.name, code });
    if (!sent) {
      // Roll back so a retry starts clean instead of hitting the cooldown
      await (prisma as any).enrollmentRequest.delete({ where: { id: created.id } }).catch(() => {});
      return NextResponse.json({ error: 'Hmm \u2014 we couldn\u2019t reach that email address. Mind checking it and trying once more?' }, { status: 502 });
    }

    return NextResponse.json({ requiresVerification: true, requestId: created.id });
  } catch (error) {
    console.error('Begin POST error:', error);
    return NextResponse.json({ error: 'Something didn\u2019t go through on our end \u2014 mind trying once more?' }, { status: 500 });
  }
}
