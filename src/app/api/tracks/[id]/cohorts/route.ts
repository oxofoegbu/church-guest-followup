import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// POST /api/tracks/[id]/cohorts — create a cohort (admin only)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    const { name, startDate, meetingDay, meetingTime, facilitatorUserId } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Cohort name is required' }, { status: 400 });

    const cohort = await (prisma as any).trackCohort.create({
      data: {
        trackId: params.id,
        name: name.trim(),
        startDate: startDate ? new Date(startDate) : null,
        meetingDay: meetingDay?.trim() || null,
        meetingTime: meetingTime?.trim() || null,
        facilitatorUserId: facilitatorUserId || null,
      },
      include: {
        facilitator: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } },
      },
    });
    return NextResponse.json({ cohort }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
