import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// POST /api/tracks/[id]/modules — add a module (admin only)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    const { weekNumber, title, summary } = await request.json();
    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    let week = weekNumber;
    if (typeof week !== 'number') {
      const last = await (prisma as any).trackModule.findFirst({
        where: { trackId: params.id }, orderBy: { weekNumber: 'desc' },
      });
      week = (last?.weekNumber || 0) + 1;
    }

    const clash = await (prisma as any).trackModule.findFirst({
      where: { trackId: params.id, weekNumber: week },
    });
    if (clash) return NextResponse.json({ error: `Week ${week} already exists on this track` }, { status: 400 });

    const module_ = await (prisma as any).trackModule.create({
      data: {
        trackId: params.id,
        weekNumber: week,
        title: title.trim(),
        summary: summary?.trim() || null,
      },
    });
    return NextResponse.json({ module: module_ }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
