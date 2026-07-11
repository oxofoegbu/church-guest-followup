import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// GET /api/my-tracks — the session user's own enrollments (any permission level)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const enrollments = await (prisma as any).trackEnrollment.findMany({
      where: { userId: session.userId },
      include: {
        track: { include: { modules: { orderBy: { weekNumber: 'asc' } } } },
        discipler: { select: { name: true, email: true, phone: true, photoUrl: true } },
        cohort: { select: { name: true, meetingDay: true, meetingTime: true } },
        progress: { select: { moduleId: true, completedAt: true } },
      },
      orderBy: { startedAt: 'asc' },
    });
    return NextResponse.json({ enrollments });
  } catch (error) {
    return handleAuthError(error);
  }
}
