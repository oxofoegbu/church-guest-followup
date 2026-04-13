import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

export async function POST(req: Request, { params }: { params: { id: string; stepId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  const level = getPermissionLevel(session.role, customRolesSetting?.value);
  if (level !== 'ADMIN_ACCESS' && level !== 'LEADER_ACCESS') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const scheduledForRaw = body?.scheduledFor;
  if (!scheduledForRaw || typeof scheduledForRaw !== 'string') {
    return NextResponse.json({ error: 'scheduledFor is required (ISO string)' }, { status: 400 });
  }
  const scheduledFor = new Date(scheduledForRaw);
  if (isNaN(scheduledFor.getTime())) {
    return NextResponse.json({ error: 'scheduledFor is not a valid date' }, { status: 400 });
  }

  const step = await (prisma as any).guestDripStep.findUnique({
    where: { id: params.stepId },
    include: { dripTemplate: true },
  });
  if (!step || step.guestId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (step.status !== 'PENDING') {
    return NextResponse.json({ error: 'Only pending steps can be rescheduled' }, { status: 400 });
  }

  const guest = await prisma.guest.findUnique({ where: { id: params.id } });
  const previousScheduledFor = step.scheduledFor;

  await (prisma as any).guestDripStep.update({
    where: { id: params.stepId },
    data: { scheduledFor },
  });

  const guestName = guest ? `${guest.firstName} ${guest.lastName}` : params.id;
  await logAudit({
    action: 'GUEST_DRIP_STEP_RESCHEDULED',
    category: 'DRIP',
    description: `${session.name} rescheduled drip step "${step.dripTemplate?.name}" for "${guestName}" from ${new Date(previousScheduledFor).toISOString()} to ${scheduledFor.toISOString()}`,
    userId: session.userId,
    userName: session.name,
    targetId: params.id,
    targetType: 'GUEST',
    targetName: guestName,
    metadata: {
      stepId: params.stepId,
      templateName: step.dripTemplate?.name,
      previousScheduledFor,
      newScheduledFor: scheduledFor.toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
