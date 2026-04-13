import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageTemplates } from '@/lib/schedule-permissions';
import { logAudit } from '@/lib/audit';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!(await canManageTemplates(session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tpl = await prisma.$transaction(async (tx) => {
    await (tx as any).orderOfServiceTemplate.updateMany({ data: { isDefault: false } });
    return (tx as any).orderOfServiceTemplate.update({
      where: { id: params.id }, data: { isDefault: true },
    });
  });

  await logAudit({
    action: 'SCHEDULE_TEMPLATE_DEFAULTED', category: 'SCHEDULE',
    description: `Template "${tpl.name}" set as default`,
    userId: session!.userId, userName: session!.name,
    targetId: tpl.id, targetType: 'OrderOfServiceTemplate',
  });
  return NextResponse.json({ template: tpl });
}
