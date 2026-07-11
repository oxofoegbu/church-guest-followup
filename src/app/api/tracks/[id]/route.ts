import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET /api/tracks/[id] — full track detail: modules, cohorts, enrollments + progress
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(request);
    const track = await (prisma as any).track.findUnique({
      where: { id: params.id },
      include: {
        modules: { orderBy: { weekNumber: 'asc' } },
        cohorts: {
          include: {
            facilitator: { select: { id: true, name: true } },
            _count: { select: { enrollments: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        enrollments: {
          include: {
            guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
            user: { select: { id: true, name: true, email: true, phone: true } },
            discipler: { select: { id: true, name: true, email: true, phone: true } },
            cohort: { select: { id: true, name: true } },
            progress: { select: { moduleId: true, completedAt: true } },
          },
          orderBy: { startedAt: 'asc' },
        },
      },
    });
    if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    return NextResponse.json({ track });
  } catch (error) {
    return handleAuthError(error);
  }
}

// PATCH /api/tracks/[id] — update track fields (admin only)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!body.name?.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      data.name = body.name.trim();
    }
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.ordering !== undefined) data.ordering = body.ordering;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.milestoneLabel !== undefined) data.milestoneLabel = body.milestoneLabel?.trim() || null;
    if (body.workbookUrl !== undefined) data.workbookUrl = body.workbookUrl?.trim() || null;

    const track = await (prisma as any).track.update({ where: { id: params.id }, data });

    await logAudit({
      action: 'TRACK_UPDATED', category: 'TRACK',
      description: `Track "${track.name}" updated`,
      userId: session.userId, userName: session.name,
      targetId: track.id, targetType: 'TRACK', targetName: track.name,
    });

    return NextResponse.json({ track });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE /api/tracks/[id] — delete a track and all its data (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const track = await (prisma as any).track.findUnique({
      where: { id: params.id },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    if (track._count.enrollments > 0) {
      return NextResponse.json(
        { error: `This track has ${track._count.enrollments} enrollment(s). Withdraw or delete them first.` },
        { status: 400 },
      );
    }
    await (prisma as any).track.delete({ where: { id: params.id } });

    await logAudit({
      action: 'TRACK_DELETED', category: 'TRACK',
      description: `Track "${track.name}" deleted`,
      userId: session.userId, userName: session.name,
      targetId: track.id, targetType: 'TRACK', targetName: track.name,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
