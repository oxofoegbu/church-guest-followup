import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// GET /api/my-tracks — the session user's own enrollments (any permission level)
// Run 12: modules are shaped server-side — the workbook content Json stays out
// of this payload (fetched per-module on expand) and hasContent flags which
// weeks have in-app content.
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

    const shaped = enrollments.map((e: any) => ({
      ...e,
      track: {
        ...e.track,
        modules: e.track.modules.map((m: any) => ({
          id: m.id,
          weekNumber: m.weekNumber,
          title: m.title,
          summary: m.summary,
          kind: m.kind || 'CORE', // Run 16 — CORE | INTRO | APPENDIX
          hasContent: !!m.content,
        })),
      },
    }));
    return NextResponse.json({ enrollments: shaped });
  } catch (error) {
    return handleAuthError(error);
  }
}
