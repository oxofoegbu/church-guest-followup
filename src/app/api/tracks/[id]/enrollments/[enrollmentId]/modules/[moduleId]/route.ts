import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { getSavableIds, MAX_REFLECTION_LENGTH } from '@/lib/workbook';

// Run 12 — session-authenticated module content + reflections.
//
// Privacy model for reflections (deliberately stricter than progress):
//   READ:  the participant themselves, the enrollment's discipler,
//          or ADMIN_ACCESS (Senior Pastor / head of discipleship).
//          Plain LEADER_ACCESS is NOT sufficient — reflections are personal.
//   WRITE: the participant themselves only, while the enrollment is ACTIVE.

async function loadEnrollment(trackId: string, enrollmentId: string) {
  return (prisma as any).trackEnrollment.findFirst({
    where: { id: enrollmentId, trackId },
    select: { id: true, status: true, trackId: true, userId: true, disciplerUserId: true },
  });
}

async function loadModule(trackId: string, moduleId: string) {
  return (prisma as any).trackModule.findFirst({
    where: { id: moduleId, trackId },
    select: { id: true, weekNumber: true, title: true, content: true },
  });
}

async function canRead(session: { userId: string; role: string }, enrollment: any) {
  if (enrollment.userId === session.userId) return true;
  if (enrollment.disciplerUserId === session.userId) return true;
  const setting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  return getPermissionLevel(session.role, setting?.value ?? null) === 'ADMIN_ACCESS';
}

// GET /api/tracks/[id]/enrollments/[enrollmentId]/modules/[moduleId]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; enrollmentId: string; moduleId: string } }
) {
  try {
    const session = await requireAuth(request);
    const enrollment = await loadEnrollment(params.id, params.enrollmentId);
    if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

    if (!(await canRead(session, enrollment))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const module_ = await loadModule(enrollment.trackId, params.moduleId);
    if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    const reflections = await (prisma as any).moduleReflection.findMany({
      where: { enrollmentId: enrollment.id, moduleId: module_.id },
      select: { promptId: true, response: true, updatedAt: true },
    });
    return NextResponse.json({ module: module_, reflections });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST — save one reflection. Body: { promptId, response }.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; enrollmentId: string; moduleId: string } }
) {
  try {
    const session = await requireAuth(request);
    const enrollment = await loadEnrollment(params.id, params.enrollmentId);
    if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

    if (enrollment.userId !== session.userId) {
      return NextResponse.json({ error: 'Only the participant can write their reflections' }, { status: 403 });
    }
    if (enrollment.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This enrollment is not active' }, { status: 400 });
    }

    const module_ = await loadModule(enrollment.trackId, params.moduleId);
    if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    const { promptId, response } = await request.json();
    if (typeof promptId !== 'string' || typeof response !== 'string') {
      return NextResponse.json({ error: 'promptId and response are required' }, { status: 400 });
    }
    if (response.length > MAX_REFLECTION_LENGTH) {
      return NextResponse.json({ error: 'Response is too long' }, { status: 400 });
    }
    if (!getSavableIds(module_.content).includes(promptId)) {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const saved = await (prisma as any).moduleReflection.upsert({
      where: {
        enrollmentId_moduleId_promptId: {
          enrollmentId: enrollment.id,
          moduleId: module_.id,
          promptId,
        },
      },
      update: { response },
      create: { enrollmentId: enrollment.id, moduleId: module_.id, promptId, response },
      select: { promptId: true, updatedAt: true },
    });
    return NextResponse.json({ ok: true, saved });
  } catch (error) {
    return handleAuthError(error);
  }
}
