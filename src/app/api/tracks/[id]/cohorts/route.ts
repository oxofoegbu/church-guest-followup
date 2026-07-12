import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { normalizeSessionPlan, planStartDate } from '@/lib/cohort-sessions';

// POST /api/tracks/[id]/cohorts — create a cohort (admin only)
// Run 22: accepts an optional sessionPlan (explicit session dates, each
// covering one or more module weeks). When a plan is present the cohort's
// startDate is derived from the first session so pickers and the calendar
// stay truthful.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    const { name, startDate, meetingDay, meetingTime, facilitatorUserId, sessionPlan } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Cohort name is required' }, { status: 400 });

    const normalized = normalizeSessionPlan(sessionPlan);
    if (normalized.error) return NextResponse.json({ error: normalized.error }, { status: 400 });
    const plan = normalized.plan;

    const cohort = await (prisma as any).trackCohort.create({
      data: {
        trackId: params.id,
        name: name.trim(),
        startDate: plan ? planStartDate(plan) : startDate ? new Date(startDate) : null,
        meetingDay: meetingDay?.trim() || null,
        meetingTime: meetingTime?.trim() || null,
        facilitatorUserId: facilitatorUserId || null,
        ...(plan ? { sessionPlan: plan } : {}),
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
