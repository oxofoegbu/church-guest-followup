import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { logAudit } from '@/lib/audit';
import { scheduleDripStepsForGuest } from '@/lib/drip-scheduler';

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
    data: { dripEnabled: true, dripPausedAt: null } as any,
  });

  const { created, skipped } = await scheduleDripStepsForGuest(params.id);

  const guestName = `${guest.firstName} ${guest.lastName}`;
  await logAudit({
    action: 'GUEST_DRIP_ENABLED',
    category: 'DRIP',
    description: `${session.name} enabled drip for "${guestName}" (${created} scheduled, ${skipped} skipped as past-dated)`,
    userId: session.userId,
    userName: session.name,
    targetId: guest.id,
    targetType: 'GUEST',
    targetName: guestName,
    metadata: { stepsCreated: created, stepsSkippedPastDated: skipped },
  });

  return NextResponse.json({ ok: true, stepsCreated: created, stepsSkippedPastDated: skipped });
}
