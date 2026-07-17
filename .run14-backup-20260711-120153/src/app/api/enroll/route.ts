import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { SELF_ENROLL_TRACK_SLUGS, enrollRequestSchema } from '@/lib/enroll';
import { notifyAdminsOfEnrollmentRequest } from '@/lib/enrollment-notifications';

// Run 13 — public endpoint. Creates a PENDING EnrollmentRequest for Become or
// Leaders Track. If the email belongs to a registered User, the request is
// linked to that account (matchedUserId) so approval enrolls them directly;
// otherwise approval will create the account first. Nothing is enrolled here —
// every request waits for admin acceptance.

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

    // Track must be open for self-enrollment
    const track = await (prisma as any).track.findFirst({
      where: { id: trackId, isActive: true, slug: { in: SELF_ENROLL_TRACK_SLUGS } },
      select: { id: true, name: true },
    });
    if (!track) {
      return NextResponse.json({ error: 'This track is not open for self-enrollment.' }, { status: 400 });
    }

    // Cohort, if chosen, must belong to this track and be active
    let cohort: { id: string; name: string; meetingDay: string | null; meetingTime: string | null } | null = null;
    if (cohortId) {
      cohort = await (prisma as any).trackCohort.findFirst({
        where: { id: cohortId, trackId: track.id, status: 'ACTIVE' },
        select: { id: true, name: true, meetingDay: true, meetingTime: true },
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

    // Guard: a pending request for the same email + track already exists
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

    await (prisma as any).enrollmentRequest.create({
      data: {
        trackId: track.id,
        cohortId: cohort?.id || null,
        firstName,
        lastName,
        email,
        phone,
        matchedUserId: matchedUser?.id || null,
      },
    });

    // Alert admins (non-blocking by design; failures are logged inside)
    await notifyAdminsOfEnrollmentRequest({
      firstName, lastName, email, phone,
      trackName: track.name,
      cohortName: cohort?.name || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Enroll POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
