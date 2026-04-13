import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageTemplates } from '@/lib/schedule-permissions';
import { logAudit } from '@/lib/audit';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!(await canManageTemplates(session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { name, items } = await req.json();
  const updated = await (prisma as any).orderOfServiceTemplate.update({
    where: { id: params.id },
    data: { name, items },
  });
  await logAudit({
    action: 'SCHEDULE_TEMPLATE_UPDATED', category: 'SCHEDULE',
    description: `Template "${updated.name}" updated`,
    userId: session!.userId, userName: session!.name,
    targetId: updated.id, targetType: 'OrderOfServiceTemplate',
  });
  return NextResponse.json({ template: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!(await canManageTemplates(session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const existing = await (prisma as any).orderOfServiceTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.isDefault) return NextResponse.json({ error: 'Cannot delete default template' }, { status: 400 });
  await (prisma as any).orderOfServiceTemplate.delete({ where: { id: params.id } });
  await logAudit({
    action: 'SCHEDULE_TEMPLATE_DELETED', category: 'SCHEDULE',
    description: `Template "${existing.name}" deleted`,
    userId: session!.userId, userName: session!.name,
    targetId: existing.id, targetType: 'OrderOfServiceTemplate',
  });
  return NextResponse.json({ ok: true });
}
