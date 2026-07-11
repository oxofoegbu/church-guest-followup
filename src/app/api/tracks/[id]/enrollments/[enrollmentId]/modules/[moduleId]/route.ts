import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { getSavableIds, getComparisonRefIds, MAX_REFLECTION_LENGTH } from '@/lib/workbook';
import { sendDisciplerCommentEmail } from '@/lib/enrollment-notifications';

// Run 12 — session-authenticated module content + reflections.
//
// Privacy model for reflections (deliberately stricter than progress):
//   READ:  the participant themselves, the enrollment's discipler,
//          or ADMIN_ACCESS (Senior Pastor / head of discipleship).
//          Plain LEADER_ACCESS is NOT sufficient — reflections are personal.
//   WRITE: the participant themselves only, while the enrollment is ACTIVE.
//
// Run 18 — DisciplerNote: the discipler's ONE general comment per module.
//   READ:  same as reflections (participant / discipler / ADMIN) — the GET
//          below returns it alongside the reflections.
//   WRITE: the enrollment's discipler or ADMIN, via PUT (edited in place;
//          an empty note deletes the row).

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

// Run 18 — who may write the discipler's module comment.
async function canComment(session: { userId: string; role: string }, enrollment: any) {
  if (enrollment.disciplerUserId && enrollment.disciplerUserId === session.userId) return true;
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

    // Run 16 — comparison blocks may reference rating ids saved in OTHER
    // modules (e.g. the Before assessment lives in the Introduction module).
    // Fetch those across the whole enrollment and merge; the module's own
    // reflections win on any overlap.
    const refIds = getComparisonRefIds(module_.content);
    if (refIds.length > 0) {
      const own = new Set(reflections.map((r: any) => r.promptId));
      const missing = refIds.filter(id => !own.has(id));
      if (missing.length > 0) {
        const extra = await (prisma as any).moduleReflection.findMany({
          where: { enrollmentId: enrollment.id, promptId: { in: missing } },
          select: { promptId: true, response: true, updatedAt: true },
        });
        reflections.push(...extra);
      }
    }
    // Run 18 — the discipler's one general comment for this module.
    const disciplerNote = await (prisma as any).disciplerNote.findUnique({
      where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: module_.id } },
      select: { note: true, updatedAt: true, author: { select: { name: true } } },
    });

    return NextResponse.json({
      module: module_,
      reflections,
      disciplerNote,
      canComment: await canComment(session, enrollment),
    });
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

// Run 18 — PUT: the discipler (or ADMIN) saves their ONE general comment for
// this module. Body: { note }. Edited in place; an empty note deletes it.
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; enrollmentId: string; moduleId: string } }
) {
  try {
    const session = await requireAuth(request);
    const enrollment = await loadEnrollment(params.id, params.enrollmentId);
    if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

    if (!(await canComment(session, enrollment))) {
      return NextResponse.json({ error: 'Only the discipler can comment on this module' }, { status: 403 });
    }

    const module_ = await loadModule(enrollment.trackId, params.moduleId);
    if (!module_) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    const { note } = await request.json();
    if (typeof note !== 'string') {
      return NextResponse.json({ error: 'note is required' }, { status: 400 });
    }
    if (note.length > MAX_REFLECTION_LENGTH) {
      return NextResponse.json({ error: 'Comment is too long' }, { status: 400 });
    }

    const where = { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: module_.id } };

    // Run 20 -- remember the prior note so the participant is only emailed on
    // a NEW or CHANGED comment (never on an unchanged resave or a deletion).
    const priorNote = await (prisma as any).disciplerNote.findUnique({
      where,
      select: { note: true },
    });

    if (note.trim() === '') {
      await (prisma as any).disciplerNote.deleteMany({
        where: { enrollmentId: enrollment.id, moduleId: module_.id },
      });
      return NextResponse.json({ ok: true, disciplerNote: null });
    }

    const saved = await (prisma as any).disciplerNote.upsert({
      where,
      update: { note, authorUserId: session.userId },
      create: { enrollmentId: enrollment.id, moduleId: module_.id, note, authorUserId: session.userId },
      select: { note: true, updatedAt: true, author: { select: { name: true } } },
    });

    // Run 20 -- notify the disciple (fire-safe, email only; skipped when the
    // participant has no email on file or the note text did not change).
    if (!priorNote || priorNote.note !== note) {
      const full = await (prisma as any).trackEnrollment.findUnique({
        where: { id: enrollment.id },
        select: {
          portalToken: true,
          track: { select: { name: true } },
          guest: { select: { firstName: true, email: true } },
          user: { select: { name: true, email: true } },
        },
      });
      const email = full?.guest?.email || full?.user?.email || null;
      if (full && email) {
        const firstName = full.guest
          ? full.guest.firstName
          : (full.user?.name || '').split(' ')[0] || 'friend';
        await sendDisciplerCommentEmail({
          participantFirstName: firstName,
          email,
          trackName: full.track.name,
          moduleTitle: module_.title,
          disciplerName: saved.author?.name || 'Your discipler',
          note,
          portalToken: full.portalToken,
        });
      }
    }

    return NextResponse.json({ ok: true, disciplerNote: saved });
  } catch (error) {
    return handleAuthError(error);
  }
}
