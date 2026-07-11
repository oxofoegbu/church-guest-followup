import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

// POST /api/tracks/[id]/enrollments/[enrollmentId]/progress — toggle module completion
// Body: { moduleId, completed: boolean } (admins and leaders)
export async function POST(request: NextRequest, { params }: { params: { id: string; enrollmentId: string } }) {
  try {
    const session = await requireAuth(request, ['LEADER']);
    const { moduleId, completed } = await request.json();
    if (!moduleId) return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });

    if (completed) {
      await (prisma as any).moduleProgress.upsert({
        where: { enrollmentId_moduleId: { enrollmentId: params.enrollmentId, moduleId } },
        update: { markedByUserId: session.userId },
        create: {
          enrollmentId: params.enrollmentId,
          moduleId,
          markedByUserId: session.userId,
        },
      });
    } else {
      await (prisma as any).moduleProgress.deleteMany({
        where: { enrollmentId: params.enrollmentId, moduleId },
      });
    }

    const progress = await (prisma as any).moduleProgress.findMany({
      where: { enrollmentId: params.enrollmentId },
      select: { moduleId: true, completedAt: true },
    });
    return NextResponse.json({ progress });
  } catch (error) {
    return handleAuthError(error);
  }
}
