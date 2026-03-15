import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';

type Params = { params: { id: string } };

async function requireAdmin(request: NextRequest) {
  const session = await requireAuth(request);
  const setting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  const permLevel = getPermissionLevel(session.role, setting?.value ?? null);
  if (permLevel !== 'ADMIN_ACCESS') throw new Error('Forbidden');
  return session;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { name, description, color, addMemberIds, removeMemberIds } = body;

    const data: any = {};
    if (name)        data.name        = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (color)       data.color       = color;

    const cluster = await (prisma as any).cluster.update({
      where: { id: params.id },
      data,
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
    });

    // Add members
    if (addMemberIds?.length > 0) {
      await (prisma as any).clusterMember.createMany({
        data: (addMemberIds as string[]).map((userId: string) => ({ clusterId: params.id, userId })),
        skipDuplicates: true,
      });
    }

    // Remove members
    if (removeMemberIds?.length > 0) {
      await (prisma as any).clusterMember.deleteMany({
        where: { clusterId: params.id, userId: { in: removeMemberIds } },
      });
    }

    // Re-fetch with updated members
    const updated = await (prisma as any).cluster.findUnique({
      where: { id: params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        createdByUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ cluster: updated });
  } catch (error: any) {
    if (error?.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return handleAuthError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin(request);
    await (prisma as any).clusterMember.deleteMany({ where: { clusterId: params.id } });
    await (prisma as any).cluster.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return handleAuthError(error);
  }
}
