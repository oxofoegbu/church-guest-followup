import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const setting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, setting?.value ?? null);

    // All users can see clusters; only admins/leaders see membership counts
    const clusters = await (prisma as any).cluster.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
        createdByUser: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ clusters });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const setting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const permLevel = getPermissionLevel(session.role, setting?.value ?? null);
    if (permLevel !== 'ADMIN_ACCESS') {
      return NextResponse.json({ error: 'Only admins can create clusters' }, { status: 403 });
    }

    const { name, description, color, memberIds } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const cluster = await (prisma as any).cluster.create({
      data: {
        name:        name.trim(),
        description: description?.trim() || null,
        color:       color || '#6366f1',
        createdById: session.userId,
        members: memberIds?.length > 0 ? {
          create: (memberIds as string[]).map((userId: string) => ({ userId })),
        } : undefined,
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ cluster }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
