import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const ENROLLMENT_INCLUDE = {
  guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
  discipler: { select: { id: true, name: true, email: true, phone: true } },
  cohort: { select: { id: true, name: true } },
  progress: { select: { moduleId: true, completedAt: true } },
};

const VALID_STATUSES = ['ACTIVE', 'COMPLETED', 'PAUSED', 'WITHDRAWN'];

// PATCH /api/tracks/[id]/enrollments/[enrollmentId] — update (admins and leaders)
export async function PATCH(request: NextRequest, { params }: { params: { id: string; enrollmentId: string } }) {
  try {
    const session = await requireAuth(request, ['LEADER']);
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.disciplerUserId !== undefined) data.disciplerUserId = body.disciplerUserId || null;
    if (body.cohortId !== undefined) data.cohortId = body.cohortId || null;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      data.status = body.status;
      data.completedAt = body.status === 'COMPLETED' ? new Date() : null;
    }

    const enrollment = await (prisma as any).trackEnrollment.update({
      where: { id: params.enrollmentId },
      data,
      include: { ...ENROLLMENT_INCLUDE, track: { select: { id: true, name: true } } },
    });

    if (body.status === 'COMPLETED') {
      const participantName = enrollment.guest
        ? `${enrollment.guest.firstName} ${enrollment.guest.lastName}`
        : enrollment.user?.name || 'Unknown';
      await logAudit({
        action: 'TRACK_COMPLETED', category: 'TRACK',
        description: `${participantName} completed "${enrollment.track.name}"`,
        userId: session.userId, userName: session.name,
        targetId: enrollment.id, targetType: 'TRACK_ENROLLMENT', targetName: participantName,
        metadata: { trackId: enrollment.track.id, trackName: enrollment.track.name },
      });
    }

    return NextResponse.json({ enrollment });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE /api/tracks/[id]/enrollments/[enrollmentId] — remove entirely (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string; enrollmentId: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    await (prisma as any).trackEnrollment.delete({ where: { id: params.enrollmentId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
