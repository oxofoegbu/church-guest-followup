import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError, hashPassword } from '@/lib/auth';
import { generateTempPassword } from '@/lib/enroll';
import {
  sendEnrollmentApprovedNotification,
  sendEnrollmentRejectedEmail,
} from '@/lib/enrollment-notifications';

// POST /api/enrollment-requests/[id]/decide — admin-level only.
// Body: { action: 'approve' | 'reject' }
//
// Approve:
//   1. Re-match the email against Users at decision time (the person may have
//      been registered since submitting, or the matched account removed).
//   2. No user -> create one (role VOLUNTEER, generated temp password;
//      User.mustChangePassword defaults to true so first sign-in forces a
//      password change — reusing the app's existing flow).
//   3. Create the TrackEnrollment (same duplicate guard as admin enrollment).
//   4. Mark the request APPROVED and notify the participant (email + WhatsApp
//      when a phone was given), including credentials for new accounts.
//
// The steps are sequential and safe to retry: if a user was created but a
// later step failed, re-approving matches the existing user and continues.

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const { action } = await request.json();
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }

    const req = await (prisma as any).enrollmentRequest.findUnique({
      where: { id: params.id },
      include: {
        track: { select: { id: true, name: true } },
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
    // 1. Find or create the user account
    let user = await prisma.user.findFirst({
      where: { email: { equals: req.email, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    let newAccount: { email: string; tempPassword: string } | null = null;
    if (!user) {
      const tempPassword = generateTempPassword();
      try {
        user = await prisma.user.create({
          data: {
            name: `${req.firstName} ${req.lastName}`.trim(),
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
    if (!user) {
      return NextResponse.json({ error: 'Could not resolve a user account for this request' }, { status: 500 });
    }

    // 2. Duplicate-enrollment guard (mirrors the admin enrollment endpoint)
    const existing = await (prisma as any).trackEnrollment.findFirst({
      where: {
        trackId: req.track.id,
        userId: user.id,
        status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
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
          matchedUserId: user.id,
          enrollmentId: existing.id,
        },
      });
      return NextResponse.json({ ok: true, request: updated, note: 'Person was already enrolled in this track' });
    }

    // 3. Create the enrollment (only attach the cohort if it is still active)
    const cohortId = req.cohort && req.cohort.status === 'ACTIVE' ? req.cohort.id : null;
    const enrollment = await (prisma as any).trackEnrollment.create({
      data: {
        trackId: req.track.id,
        userId: user.id,
        cohortId,
        notes: 'Self-enrollment (approved request)',
      },
      select: { id: true, portalToken: true },
    });

    // 4. Mark approved + notify the participant
    const updated = await (prisma as any).enrollmentRequest.update({
      where: { id: req.id },
      data: {
        status: 'APPROVED',
        decidedAt: new Date(),
        decidedByUserId: session.userId,
        matchedUserId: user.id,
        enrollmentId: enrollment.id,
      },
    });
    await sendEnrollmentApprovedNotification({
      ...baseInfo,
      portalToken: enrollment.portalToken,
      newAccount,
    });

    return NextResponse.json({ ok: true, request: updated, createdAccount: !!newAccount });
  } catch (error) {
    return handleAuthError(error);
  }
}
