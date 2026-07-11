import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// PATCH /api/tracks/[id]/cohorts/[cohortId] — edit a cohort (admin only)
export async function PATCH(request: NextRequest, { params }: { params: { id: string; cohortId: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!body.name?.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      data.name = body.name.trim();
    }
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.meetingDay !== undefined) data.meetingDay = body.meetingDay?.trim() || null;
    if (body.meetingTime !== undefined) data.meetingTime = body.meetingTime?.trim() || null;
    if (body.facilitatorUserId !== undefined) data.facilitatorUserId = body.facilitatorUserId || null;
    if (body.status !== undefined) data.status = body.status;

    const cohort = await (prisma as any).trackCohort.update({
      where: { id: params.cohortId },
      data,
      include: {
        facilitator: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } },
      },
    });
    return NextResponse.json({ cohort });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE /api/tracks/[id]/cohorts/[cohortId] — delete a cohort (admin only)
// Enrollments keep existing (cohortId set null via SetNull relation)
export async function DELETE(request: NextRequest, { params }: { params: { id: string; cohortId: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    await (prisma as any).trackCohort.delete({ where: { id: params.cohortId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
