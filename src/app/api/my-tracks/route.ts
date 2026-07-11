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
      // Run 18 — stack by the formation pathway (Track.ordering: Welcome 1,
      // Become 2, Leaders 3), then by enrollment date within the same track.
      orderBy: [{ track: { ordering: 'asc' } }, { startedAt: 'asc' }],
    });

    // Run 20 -- announcements: cohort posts + personal notes, newest first,
    // fetched in one query and attached per enrollment.
    const enrollmentIds = enrollments.map((e: any) => e.id);
    const cohortIds = enrollments.map((e: any) => e.cohortId).filter(Boolean);
    const announcements = enrollmentIds.length
      ? await (prisma as any).trackAnnouncement.findMany({
          where: {
            OR: [
              { enrollmentId: { in: enrollmentIds } },
              ...(cohortIds.length ? [{ cohortId: { in: cohortIds } }] : []),
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true, title: true, body: true, createdAt: true,
            cohortId: true, enrollmentId: true,
            author: { select: { name: true } },
          },
        })
      : [];

    const shaped = enrollments.map((e: any) => ({
      ...e,
      announcements: announcements.filter((a: any) =>
        a.enrollmentId === e.id || (a.cohortId && a.cohortId === e.cohortId)
      ),
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
