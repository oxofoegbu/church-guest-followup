import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageTemplates } from '@/lib/schedule-permissions';
import { logAudit } from '@/lib/audit';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!(await canManageTemplates(session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const src = await (prisma as any).orderOfServiceTemplate.findUnique({ where: { id: params.id } });
  if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const items = JSON.parse(JSON.stringify(src.items));
  const copy = await (prisma as any).orderOfServiceTemplate.create({
    data: { name: `${src.name} (copy)`, items, isDefault: false },
  });

  await logAudit({
    action: 'SCHEDULE_TEMPLATE_CREATED', category: 'SCHEDULE',
    description: `Template "${copy.name}" duplicated from "${src.name}"`,
    userId: session!.userId, userName: session!.name,
    targetId: copy.id, targetType: 'OrderOfServiceTemplate',
  });
  return NextResponse.json({ template: copy });
}
