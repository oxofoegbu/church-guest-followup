import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Public endpoint — secured only by the unguessable portalToken (same pattern
// as the public OoS PDF endpoint). Exposes the minimum needed for the portal.

async function findEnrollment(token: string) {
  return (prisma as any).trackEnrollment.findUnique({
    where: { portalToken: token },
    include: {
      track: { include: { modules: { orderBy: { weekNumber: 'asc' } } } },
      guest: { select: { firstName: true, lastName: true } },
      user: { select: { name: true } },
      discipler: { select: { name: true, email: true, phone: true, photoUrl: true } },
      cohort: { select: { name: true, meetingDay: true, meetingTime: true } },
      progress: { select: { moduleId: true, completedAt: true } },
    },
  });
}

function shape(enrollment: any, churchName: string) {
  const participantFirstName = enrollment.guest
    ? enrollment.guest.firstName
    : (enrollment.user?.name || '').split(' ')[0];
  return {
    churchName,
    participantFirstName,
    status: enrollment.status,
    startedAt: enrollment.startedAt,
    completedAt: enrollment.completedAt,
    track: {
      name: enrollment.track.name,
      description: enrollment.track.description,
      milestoneLabel: enrollment.track.milestoneLabel,
      workbookUrl: enrollment.track.workbookUrl,
      modules: enrollment.track.modules.map((m: any) => ({
        id: m.id, weekNumber: m.weekNumber, title: m.title, summary: m.summary,
        kind: m.kind || 'CORE', // Run 16 — CORE | INTRO | APPENDIX
        hasContent: !!m.content, // Run 12 — content itself is fetched per-module
      })),
    },
    discipler: enrollment.discipler,
    cohort: enrollment.cohort,
    progress: enrollment.progress,
  };
}

// GET /api/track-portal/[token] — everything the participant portal needs
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const enrollment = await findEnrollment(params.token);
    if (!enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const churchSetting = await prisma.appSetting.findUnique({ where: { key: 'church_name' } });
    return NextResponse.json({ portal: shape(enrollment, churchSetting?.value || 'Grace Life Center') });
  } catch (error) {
    console.error('Portal GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/track-portal/[token] — participant marks their own week
// Body: { moduleId, completed: boolean }. Only while the enrollment is ACTIVE.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const enrollment = await findEnrollment(params.token);
    if (!enrollment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (enrollment.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This enrollment is not active' }, { status: 400 });
    }

    const { moduleId, completed } = await request.json();
    const validModule = enrollment.track.modules.some((m: any) => m.id === moduleId);
    if (!validModule) return NextResponse.json({ error: 'Invalid module' }, { status: 400 });

    if (completed) {
      await (prisma as any).moduleProgress.upsert({
        where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId } },
        update: {},
        create: { enrollmentId: enrollment.id, moduleId, markedByUserId: null },
      });
    } else {
      await (prisma as any).moduleProgress.deleteMany({
        where: { enrollmentId: enrollment.id, moduleId },
      });
    }

    const progress = await (prisma as any).moduleProgress.findMany({
      where: { enrollmentId: enrollment.id },
      select: { moduleId: true, completedAt: true },
    });
    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Portal POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
