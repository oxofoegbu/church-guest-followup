import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  SELF_ENROLL_TRACK_SLUGS,
  enrollRequestSchema,
  generateOtpCode,
  hashOtpCode,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  UNVERIFIED_MAX_AGE_MS,
} from '@/lib/enroll';
import { sendEnrollmentVerificationEmail } from '@/lib/enrollment-notifications';

// Run 13/14 — public endpoint, step 1 of self-enrollment.
// Creates an UNVERIFIED EnrollmentRequest and emails a 6-digit code. The
// request only becomes PENDING (visible to admins) after the code is
// confirmed at /api/enroll/verify. Re-submitting for the same email + track
// reuses the unverified row and acts as a resend (with cooldown).

export async function POST(request: NextRequest) {
  try {
    const parsed = enrollRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please fill in your first name, last name, and a valid email.' }, { status: 400 });
    }
    const { trackId, firstName, lastName } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    const phone = parsed.data.phone?.trim() || null;
    const cohortId = parsed.data.cohortId || null;

    // Opportunistic sweep of stale unverified rows (no cron needed)
    await (prisma as any).enrollmentRequest.deleteMany({
      where: { status: 'UNVERIFIED', createdAt: { lt: new Date(Date.now() - UNVERIFIED_MAX_AGE_MS) } },
    });

    // Track must be open for self-enrollment
    const track = await (prisma as any).track.findFirst({
      where: { id: trackId, isActive: true, slug: { in: SELF_ENROLL_TRACK_SLUGS } },
      select: { id: true, name: true },
    });
    if (!track) {
      return NextResponse.json({ error: 'This track is not open for self-enrollment.' }, { status: 400 });
    }

    // Cohort, if chosen, must belong to this track and be active
    let cohort: { id: string } | null = null;
    if (cohortId) {
      cohort = await (prisma as any).trackCohort.findFirst({
        where: { id: cohortId, trackId: track.id, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!cohort) {
        return NextResponse.json({ error: 'That group is no longer available \u2014 please pick another.' }, { status: 400 });
      }
    }

    // Match an existing registered user by email (this is how "already a
    // Harvest user" is detected — no login required on the public page)
    const matchedUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });

    // Guard: already actively enrolled in this track (as a user or a guest)?
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
      return NextResponse.json({ error: 'Good news \u2014 you are already enrolled in this track! Check your email for your journey page link, or ask your discipler.' }, { status: 400 });
    }

    // Guard: a verified request for the same email + track is already waiting
    const pending = await (prisma as any).enrollmentRequest.findFirst({
      where: {
        trackId: track.id,
        status: 'PENDING',
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (pending) {
      return NextResponse.json({ error: 'You have already requested to join this track \u2014 your request is waiting for approval. You will get an email once it is accepted.' }, { status: 400 });
    }

    // Reuse an unverified attempt for the same email + track (acts as resend)
    const unverified = await (prisma as any).enrollmentRequest.findFirst({
      where: {
        trackId: track.id,
        status: 'UNVERIFIED',
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true, verifySentAt: true },
    });

    const now = Date.now();
    if (unverified) {
      const sentAgo = unverified.verifySentAt ? now - new Date(unverified.verifySentAt).getTime() : Infinity;
      const withinCooldown = sentAgo < OTP_RESEND_COOLDOWN_MS;

      if (withinCooldown) {
        // Update details but keep the current code — it was just emailed
        await (prisma as any).enrollmentRequest.update({
          where: { id: unverified.id },
          data: { firstName, lastName, phone, cohortId: cohort?.id || null, matchedUserId: matchedUser?.id || null },
        });
        return NextResponse.json({ requiresVerification: true, requestId: unverified.id, resent: false });
      }

      const code = generateOtpCode();
      await (prisma as any).enrollmentRequest.update({
        where: { id: unverified.id },
        data: {
          firstName, lastName, phone,
          cohortId: cohort?.id || null,
          matchedUserId: matchedUser?.id || null,
          verifyCodeHash: hashOtpCode(unverified.id, code),
          verifyExpiresAt: new Date(now + OTP_TTL_MS),
          verifySentAt: new Date(now),
          verifyAttempts: 0,
        },
      });
      const sent = await sendEnrollmentVerificationEmail({ firstName, email, trackName: track.name, code });
      if (!sent) {
        return NextResponse.json({ error: 'We could not send the verification email \u2014 please check the address and try again.' }, { status: 502 });
      }
      return NextResponse.json({ requiresVerification: true, requestId: unverified.id, resent: true });
    }

    // Fresh request: create UNVERIFIED, then attach the code hash (the hash
    // is salted with the row id, so the row must exist first)
    const created = await (prisma as any).enrollmentRequest.create({
      data: {
        trackId: track.id,
        cohortId: cohort?.id || null,
        firstName, lastName, email, phone,
        matchedUserId: matchedUser?.id || null,
        status: 'UNVERIFIED',
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
      return NextResponse.json({ error: 'We could not send the verification email \u2014 please check the address and try again.' }, { status: 502 });
    }

    return NextResponse.json({ requiresVerification: true, requestId: created.id });
  } catch (error) {
    console.error('Enroll POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
