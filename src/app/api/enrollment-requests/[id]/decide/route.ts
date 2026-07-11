import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError, hashPassword } from '@/lib/auth';
import { generateTempPassword, WELCOME_TRACK_SLUG, beginAudienceLabel } from '@/lib/enroll';
import {
  sendEnrollmentApprovedNotification,
  sendEnrollmentRejectedEmail,
  sendDisciplerAssignedEmail,
} from '@/lib/enrollment-notifications';

// POST /api/enrollment-requests/[id]/decide — admin-level only.
// Body: { action: 'approve' | 'reject', disciplerUserId?: string }
//
// Approve (Become / Leaders — unchanged from Runs 13–14):
//   1. Re-match the email against Users at decision time.
//   2. No user -> create one (role VOLUNTEER, temp password, forced change on
//      first sign-in via mustChangePassword).
//   3. Create the TrackEnrollment (same duplicate guard as admin enrollment).
//   4. Mark APPROVED and notify the participant (credentials for new accounts).
//
// Approve (Welcome Track — Run 19, requests from /begin):
//   Participants become GUESTS, not Users — no account, no temp password.
//   1. If the email matches an existing User (a member re-anchoring), enroll
//      them as that User — still no account creation needed.
//   2. Otherwise reuse an existing Guest matched by email, or create a new
//      Guest (source GUEST_FORM, status NEW_GUEST) so they enter the normal
//      guest follow-up pipeline; their share/prayer note becomes the guest's
//      prayerRequest.
//   3. Create the TrackEnrollment and send the warmer guest-variant welcome
//      email (portal link only — no sign-in language).
//
// Run 19 (both paths): an optional discipler can be assigned at approval;
// when one is, the discipler gets a fire-safe email pointing at My Disciples.
//
// The steps are sequential and safe to retry: if a user/guest was created but
// a later step failed, re-approving matches the existing record and continues.

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const { action, disciplerUserId } = await request.json();
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }

    const req = await (prisma as any).enrollmentRequest.findUnique({
      where: { id: params.id },
      include: {
        track: { select: { id: true, name: true, slug: true } },
        cohort: { select: { id: true, name: true, meetingDay: true, meetingTime: true, status: true } },
      },
    });
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (req.status !== 'PENDING') {
      return NextResponse.json({ error: `This request was already ${req.status.toLowerCase()}` }, { status: 400 });
    }

    const cohortMeeting = req.cohort
      ? [req.cohort.meetingDay ? `${req.cohort.meetingDay}s` : '', req.cohort.meetingTime ? `at ${req.cohort.meetingTime}` : '']
          .filter(Boolean).join(' ') || null
      : null;
    const baseInfo = {
      firstName: req.firstName,
      lastName: req.lastName,
      email: req.email,
      phone: req.phone,
      trackName: req.track.name,
      cohortName: req.cohort?.name || null,
      cohortMeeting,
    };

    // ---- Reject ------------------------------------------------------------
    if (action === 'reject') {
      const updated = await (prisma as any).enrollmentRequest.update({
        where: { id: req.id },
        data: { status: 'REJECTED', decidedAt: new Date(), decidedByUserId: session.userId },
      });
      await sendEnrollmentRejectedEmail(baseInfo);
      return NextResponse.json({ ok: true, request: updated });
    }

    // ---- Approve -----------------------------------------------------------
    // Run 19: optional discipler chosen at approval time — validate up front
    let discipler: { id: string; name: string; email: string } | null = null;
    if (disciplerUserId) {
      discipler = await prisma.user.findFirst({
        where: { id: disciplerUserId, active: true },
        select: { id: true, name: true, email: true },
      });
      if (!discipler) {
        return NextResponse.json({ error: 'The chosen discipler could not be found (or is deactivated).' }, { status: 400 });
      }
    }

    const isWelcome = req.track.slug === WELCOME_TRACK_SLUG;
    const participantName = `${req.firstName} ${req.lastName}`.trim();

    // 1. Resolve the participant: User (matched by email) for every track;
    //    for the Welcome Track an unmatched person becomes a GUEST instead of
    //    getting a Harvest account.
    let user = await prisma.user.findFirst({
      where: { email: { equals: req.email, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    let guest: { id: string } | null = null;
    let newAccount: { email: string; tempPassword: string } | null = null;

    if (!user && isWelcome) {
      // Reuse an existing guest with this email, or create one so they enter
      // the normal guest follow-up pipeline.
      guest = await prisma.guest.findFirst({
        where: { email: { equals: req.email, mode: 'insensitive' }, archivedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (!guest) {
        guest = await prisma.guest.create({
          data: {
            firstName: req.firstName,
            lastName: req.lastName || '',
            email: req.email,
            phone: req.phone || null,
            howHeardAboutUs: 'Welcome Track sign-up (Begin page)',
            prayerRequest: req.shareNote || null,
            source: 'GUEST_FORM',
            addedByUserId: session.userId,
          },
          select: { id: true },
        });
      }
    } else if (!user) {
      // Become / Leaders — create a Harvest account (unchanged behavior)
      const tempPassword = generateTempPassword();
      try {
        user = await prisma.user.create({
          data: {
            name: participantName,
            email: req.email,
            phone: req.phone || null,
            role: 'VOLUNTEER',
            password: await hashPassword(tempPassword),
            // mustChangePassword defaults to true — first sign-in forces a change
          },
          select: { id: true, name: true },
        });
        newAccount = { email: req.email, tempPassword };
      } catch (err: any) {
        if (err?.code === 'P2002') {
          // Race: the account appeared between the check and the create
          user = await prisma.user.findFirst({
            where: { email: { equals: req.email, mode: 'insensitive' } },
            select: { id: true, name: true },
          });
        }
        if (!user) throw err;
      }
    }
    if (!user && !guest) {
      return NextResponse.json({ error: 'Could not resolve a participant for this request' }, { status: 500 });
    }

    // 2. Duplicate-enrollment guard (covers both user and guest identities)
    const existing = await (prisma as any).trackEnrollment.findFirst({
      where: {
        trackId: req.track.id,
        status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
        OR: [
          ...(user ? [{ userId: user.id }] : []),
          ...(guest ? [{ guestId: guest.id }] : []),
          { guest: { email: { equals: req.email, mode: 'insensitive' } } },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      // Already in — mark approved and link the existing enrollment
      const updated = await (prisma as any).enrollmentRequest.update({
        where: { id: req.id },
        data: {
          status: 'APPROVED',
          decidedAt: new Date(),
          decidedByUserId: session.userId,
          matchedUserId: user?.id || null,
          enrollmentId: existing.id,
        },
      });
      return NextResponse.json({ ok: true, request: updated, note: 'Person was already enrolled in this track' });
    }

    // 3. Create the enrollment (only attach the cohort if it is still active)
    const cohortId = req.cohort && req.cohort.status === 'ACTIVE' ? req.cohort.id : null;
    const audienceLabel = beginAudienceLabel(req.audience);
    const noteParts = [
      isWelcome ? 'Welcome Track sign-up (approved request)' : 'Self-enrollment (approved request)',
      audienceLabel ? `Describes themselves as: ${audienceLabel}` : '',
      req.shareNote ? `They shared: ${req.shareNote}` : '',
    ].filter(Boolean);
    const enrollment = await (prisma as any).trackEnrollment.create({
      data: {
        trackId: req.track.id,
        userId: user?.id || null,
        guestId: user ? null : guest?.id || null,
        disciplerUserId: discipler?.id || null,
        cohortId,
        notes: noteParts.join('\n'),
      },
      select: { id: true, portalToken: true },
    });

    // 4. Mark approved + notify the participant (+ the discipler, Run 19)
    const updated = await (prisma as any).enrollmentRequest.update({
      where: { id: req.id },
      data: {
        status: 'APPROVED',
        decidedAt: new Date(),
        decidedByUserId: session.userId,
        matchedUserId: user?.id || null,
        enrollmentId: enrollment.id,
      },
    });
    await sendEnrollmentApprovedNotification({
      ...baseInfo,
      portalToken: enrollment.portalToken,
      newAccount,
      guestParticipant: isWelcome && !user,
    });
    if (discipler) {
      await sendDisciplerAssignedEmail({
        disciplerName: discipler.name,
        disciplerEmail: discipler.email,
        participantName,
        trackName: req.track.name,
      });
    }

    return NextResponse.json({
      ok: true,
      request: updated,
      createdAccount: !!newAccount,
      createdGuest: isWelcome && !user,
      disciplerAssigned: !!discipler,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
