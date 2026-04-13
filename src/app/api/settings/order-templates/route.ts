import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canEditSchedule, canManageTemplates } from '@/lib/schedule-permissions';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!(await canEditSchedule(session))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const templates = await (prisma as any).orderOfServiceTemplate.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!(await canManageTemplates(session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { name, items, isDefault } = body ?? {};
  if (!name || !Array.isArray(items)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const created = await prisma.$transaction(async (tx) => {
    if (isDefault) await (tx as any).orderOfServiceTemplate.updateMany({ data: { isDefault: false } });
    return (tx as any).orderOfServiceTemplate.create({ data: { name, items, isDefault: !!isDefault } });
  });

  await logAudit({
    action: 'SCHEDULE_TEMPLATE_CREATED', category: 'SCHEDULE',
    description: `Template "${name}" created`,
    userId: session!.userId, userName: session!.name,
    targetId: created.id, targetType: 'OrderOfServiceTemplate',
  });
  return NextResponse.json({ template: created });
}
