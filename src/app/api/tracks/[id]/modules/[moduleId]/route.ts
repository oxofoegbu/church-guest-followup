import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// PATCH /api/tracks/[id]/modules/[moduleId] — edit a module (admin only)
export async function PATCH(request: NextRequest, { params }: { params: { id: string; moduleId: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) {
      if (!body.title?.trim()) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      data.title = body.title.trim();
    }
    if (body.summary !== undefined) data.summary = body.summary?.trim() || null;
    if (body.weekNumber !== undefined) {
      const clash = await (prisma as any).trackModule.findFirst({
        where: { trackId: params.id, weekNumber: body.weekNumber, NOT: { id: params.moduleId } },
      });
      if (clash) return NextResponse.json({ error: `Week ${body.weekNumber} already exists on this track` }, { status: 400 });
      data.weekNumber = body.weekNumber;
    }
    const module_ = await (prisma as any).trackModule.update({ where: { id: params.moduleId }, data });
    return NextResponse.json({ module: module_ });
  } catch (error) {
    return handleAuthError(error);
  }
}

// DELETE /api/tracks/[id]/modules/[moduleId] — remove a module (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string; moduleId: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    await (prisma as any).trackModule.delete({ where: { id: params.moduleId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
