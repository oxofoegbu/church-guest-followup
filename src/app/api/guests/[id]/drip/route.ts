import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const guest = await prisma.guest.findUnique({ where: { id: params.id } });
  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  const level = getPermissionLevel(session.role, customRolesSetting?.value);

  // Volunteers can view drip state only for guests assigned to them.
  if (level === 'VOLUNTEER_ACCESS' && guest.assignedVolunteerId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const steps = await (prisma as any).guestDripStep.findMany({
    where: { guestId: params.id },
    include: { dripTemplate: true },
    orderBy: { scheduledFor: 'asc' },
  });

  return NextResponse.json({
    enabled: (guest as any).dripEnabled,
    pausedAt: (guest as any).dripPausedAt,
    steps: steps.map((s: any) => ({
      id: s.id,
      templateName: s.dripTemplate?.name || '(deleted template)',
      dayOffset: s.dripTemplate?.dayOffset ?? 0,
      channel: s.dripTemplate?.channel || 'EMAIL',
      scheduledFor: s.scheduledFor,
      sentAt: s.sentAt,
      status: s.status,
      errorMessage: s.errorMessage,
    })),
  });
}
