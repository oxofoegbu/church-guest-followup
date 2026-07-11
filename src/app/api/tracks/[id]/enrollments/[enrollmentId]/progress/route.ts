import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';

// POST /api/tracks/[id]/enrollments/[enrollmentId]/progress — toggle module completion
// Body: { moduleId, completed: boolean }
// Allowed: admins and leaders for anyone, OR any logged-in user for their OWN enrollment (Run 10)
export async function POST(request: NextRequest, { params }: { params: { id: string; enrollmentId: string } }) {
  try {
    const session = await requireAuth(request);
    const { moduleId, completed } = await request.json();
    if (!moduleId) return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });

    const enrollment = await (prisma as any).trackEnrollment.findUnique({
      where: { id: params.enrollmentId },
      select: { userId: true },
    });
    if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

    const isSelf = enrollment.userId === session.userId;
    if (!isSelf) {
      const setting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
      const permLevel = getPermissionLevel(session.role, setting?.value ?? null);
      if (permLevel !== 'ADMIN_ACCESS' && permLevel !== 'LEADER_ACCESS') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

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
