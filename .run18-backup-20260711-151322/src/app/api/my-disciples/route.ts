import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// Run 17 — GET /api/my-disciples
// Enrollments where the session user is the assigned discipler (any
// permission level — discipling is a per-enrollment assignment, not a role).
// Shaped like /api/my-tracks: the workbook content Json stays OUT of this
// payload (hasContent flags which modules have in-app content; the full
// module + the disciple's reflections are fetched on expand through the
// existing session module route, which already enforces the privacy model:
// read = participant / discipler / ADMIN).
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const enrollments = await (prisma as any).trackEnrollment.findMany({
      where: { disciplerUserId: session.userId },
      include: {
        track: { include: { modules: { orderBy: { weekNumber: 'asc' } } } },
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        user: { select: { name: true, email: true, phone: true, photoUrl: true } },
        cohort: { select: { name: true, meetingDay: true, meetingTime: true } },
        progress: { select: { moduleId: true, completedAt: true } },
      },
      orderBy: { startedAt: 'asc' },
    });

    const shaped = enrollments.map((e: any) => ({
      id: e.id,
      trackId: e.trackId,
      status: e.status,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      notes: e.notes,
      participant: e.user
        ? { name: e.user.name, email: e.user.email, phone: e.user.phone, photoUrl: e.user.photoUrl, kind: 'MEMBER' }
        : e.guest
          ? { name: `${e.guest.firstName} ${e.guest.lastName}`.trim(), email: e.guest.email, phone: e.guest.phone, photoUrl: null, kind: 'GUEST' }
          : { name: 'Unknown participant', email: null, phone: null, photoUrl: null, kind: 'GUEST' },
      cohort: e.cohort,
      progress: e.progress,
      track: {
        id: e.track.id,
        name: e.track.name,
        description: e.track.description,
        milestoneLabel: e.track.milestoneLabel,
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
