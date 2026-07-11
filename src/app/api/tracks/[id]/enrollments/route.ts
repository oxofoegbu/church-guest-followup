import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { sendDisciplerAssignedEmail, sendEnrollmentCreatedEmail } from '@/lib/enrollment-notifications';

const ENROLLMENT_INCLUDE = {
  guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
  discipler: { select: { id: true, name: true, email: true, phone: true } },
  cohort: { select: { id: true, name: true } },
  progress: { select: { moduleId: true, completedAt: true } },
};

// POST /api/tracks/[id]/enrollments — enroll a participant (admins and leaders)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request, ['LEADER']);
    const { guestId, userId, disciplerUserId, cohortId, notes } = await request.json();

    if ((!guestId && !userId) || (guestId && userId)) {
      return NextResponse.json({ error: 'Provide exactly one participant: a guest OR a user' }, { status: 400 });
    }

    const track = await (prisma as any).track.findUnique({ where: { id: params.id } });
    if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 });

    // Prevent duplicate non-withdrawn enrollment for the same person on the same track
    const existing = await (prisma as any).trackEnrollment.findFirst({
      where: {
        trackId: params.id,
        status: { in: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
        ...(guestId ? { guestId } : { userId }),
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'This person is already enrolled in this track' }, { status: 400 });
    }

    const enrollment = await (prisma as any).trackEnrollment.create({
      data: {
        trackId: params.id,
        guestId: guestId || null,
        userId: userId || null,
        disciplerUserId: disciplerUserId || null,
        cohortId: cohortId || null,
        notes: notes?.trim() || null,
      },
      include: ENROLLMENT_INCLUDE,
    });

    const participantName = enrollment.guest
      ? `${enrollment.guest.firstName} ${enrollment.guest.lastName}`
      : enrollment.user?.name || 'Unknown';

    await logAudit({
      action: 'TRACK_ENROLLED', category: 'TRACK',
      description: `${participantName} enrolled in "${track.name}"`,
      userId: session.userId, userName: session.name,
      targetId: enrollment.id, targetType: 'TRACK_ENROLLMENT', targetName: participantName,
      metadata: { trackId: track.id, trackName: track.name },
    });

    // Run 20 -- welcome the participant with their journey-page link
    // (fire-safe, email only; skipped silently when no email is on file).
    const participantEmail = enrollment.guest?.email || enrollment.user?.email || null;
    if (participantEmail) {
      const firstName = enrollment.guest
        ? enrollment.guest.firstName
        : (enrollment.user?.name || '').split(' ')[0] || 'friend';
      await sendEnrollmentCreatedEmail({
        participantFirstName: firstName,
        email: participantEmail,
        trackName: track.name,
        portalToken: enrollment.portalToken,
        cohortName: enrollment.cohort?.name || null,
        disciplerName: enrollment.discipler?.name || null,
      });
    }

    // Run 19 -- tell the discipler they have a new disciple (fire-safe, email
    // only). Only fires when a discipler was chosen at enrollment time.
    if (enrollment.discipler?.email) {
      await sendDisciplerAssignedEmail({
        disciplerName: enrollment.discipler.name,
        disciplerEmail: enrollment.discipler.email,
        participantName,
        trackName: track.name,
      });
    }

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
