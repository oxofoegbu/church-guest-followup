import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export async function POST(_req: Request, { params }: { params: { id: string; stepId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  const level = getPermissionLevel(session.role, customRolesSetting?.value);
  if (level !== 'ADMIN_ACCESS' && level !== 'LEADER_ACCESS') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const step = await (prisma as any).guestDripStep.findUnique({
    where: { id: params.stepId },
    include: { dripTemplate: true },
  });
  if (!step || step.guestId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (step.status !== 'PENDING') {
    return NextResponse.json({ error: 'Only pending steps can be skipped' }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({ where: { id: params.id } });

  await (prisma as any).guestDripStep.update({
    where: { id: params.stepId },
    data: { status: 'SKIPPED', errorMessage: `Manually skipped by ${session.name}` },
  });

  const guestName = guest ? `${guest.firstName} ${guest.lastName}` : params.id;
  await logAudit({
    action: 'GUEST_DRIP_STEP_SKIPPED',
    category: 'DRIP',
    description: `${session.name} skipped drip step "${step.dripTemplate?.name}" for "${guestName}"`,
    userId: session.userId,
    userName: session.name,
    targetId: params.id,
    targetType: 'GUEST',
    targetName: guestName,
    metadata: { stepId: params.stepId, templateName: step.dripTemplate?.name },
  });

  return NextResponse.json({ ok: true });
}
