import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  const level = getPermissionLevel(session.role, customRolesSetting?.value);
  if (level !== 'ADMIN_ACCESS' && level !== 'LEADER_ACCESS') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const guest = await prisma.guest.findUnique({ where: { id: params.id } });
  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.guest.update({
    where: { id: params.id },
    data: { dripPausedAt: null } as any,
  });

  const guestName = `${guest.firstName} ${guest.lastName}`;
  await logAudit({
    action: 'GUEST_DRIP_RESUMED',
    category: 'DRIP',
    description: `${session.name} resumed drip for "${guestName}"`,
    userId: session.userId,
    userName: session.name,
    targetId: guest.id,
    targetType: 'GUEST',
    targetName: guestName,
  });

  return NextResponse.json({ ok: true });
}
