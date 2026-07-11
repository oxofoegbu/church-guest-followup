import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSavableIds, MAX_REFLECTION_LENGTH } from '@/lib/workbook';

// Run 12 — public endpoint, secured only by the unguessable portalToken
// (same trust model as /api/track-portal/[token]). Serves one module's
// workbook content plus the participant's own reflections, and lets the
// participant save a reflection while the enrollment is ACTIVE.

async function findEnrollmentAndModule(token: string, moduleId: string) {
  const enrollment = await (prisma as any).trackEnrollment.findUnique({
    where: { portalToken: token },
    select: { id: true, status: true, trackId: true },
  });
  if (!enrollment) return { enrollment: null, module: null };

  const module_ = await (prisma as any).trackModule.findFirst({
    where: { id: moduleId, trackId: enrollment.trackId },
    select: { id: true, weekNumber: true, title: true, content: true },
  });
  return { enrollment, module: module_ };
}

// GET /api/track-portal/[token]/module/[moduleId] — content + own reflections
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string; moduleId: string } }
) {
  try {
    const { enrollment, module } = await findEnrollmentAndModule(params.token, params.moduleId);
    if (!enrollment || !module) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const reflections = await (prisma as any).moduleReflection.findMany({
      where: { enrollmentId: enrollment.id, moduleId: module.id },
      select: { promptId: true, response: true, updatedAt: true },
    });
    return NextResponse.json({ module, reflections });
  } catch (error) {
    console.error('Portal module GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/track-portal/[token]/module/[moduleId] — save one reflection
// Body: { promptId, response }. Only while the enrollment is ACTIVE.
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string; moduleId: string } }
) {
  try {
    const { enrollment, module } = await findEnrollmentAndModule(params.token, params.moduleId);
    if (!enrollment || !module) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (enrollment.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This enrollment is not active' }, { status: 400 });
    }

    const { promptId, response } = await request.json();
    if (typeof promptId !== 'string' || typeof response !== 'string') {
      return NextResponse.json({ error: 'promptId and response are required' }, { status: 400 });
    }
    if (response.length > MAX_REFLECTION_LENGTH) {
      return NextResponse.json({ error: 'Response is too long' }, { status: 400 });
    }
    if (!getSavableIds(module.content).includes(promptId)) {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const saved = await (prisma as any).moduleReflection.upsert({
      where: {
        enrollmentId_moduleId_promptId: {
          enrollmentId: enrollment.id,
          moduleId: module.id,
          promptId,
        },
      },
      update: { response },
      create: { enrollmentId: enrollment.id, moduleId: module.id, promptId, response },
      select: { promptId: true, updatedAt: true },
    });
    return NextResponse.json({ ok: true, saved });
  } catch (error) {
    console.error('Portal module POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
