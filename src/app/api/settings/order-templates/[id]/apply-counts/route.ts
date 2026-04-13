import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageTemplates } from '@/lib/schedule-permissions';
import { logAudit } from '@/lib/audit';

// GET ?scope=future|all&overwriteCustomized=0|1  -> counts preview
// POST body {scope, overwriteCustomized, apply:true} -> apply
async function buildWhere(scope: string, overwriteCustomized: boolean) {
  const where: any = {};
  if (scope === 'future') where.date = { gte: new Date() };
  if (!overwriteCustomized) where.orderCustomized = false;
  return where;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!(await canManageTemplates(session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'future';
  const overwrite = url.searchParams.get('overwriteCustomized') === '1';
  const where = await buildWhere(scope, overwrite);
  const [affected, totalInScope] = await Promise.all([
    (prisma as any).serviceSchedule.count({ where }),
    (prisma as any).serviceSchedule.count({ where: scope === 'future' ? { date: { gte: new Date() } } : {} }),
  ]);
  return NextResponse.json({ affected, totalInScope, skipped: totalInScope - affected });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!(await canManageTemplates(session))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { scope = 'future', overwriteCustomized = false } = await req.json();
  const tpl = await (prisma as any).orderOfServiceTemplate.findUnique({ where: { id: params.id } });
  if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const where = await buildWhere(scope, !!overwriteCustomized);
  const targets = await (prisma as any).serviceSchedule.findMany({ where, select: { id: true } });

  let updated = 0;
  for (const s of targets) {
    const items = JSON.parse(JSON.stringify(tpl.items)); // deep copy
    await ((prisma as any).serviceSchedule.update as any)({
      where: { id: s.id },
      data: { orderOfService: items, orderCustomized: false },
    });
    updated++;
  }

  await logAudit({
    action: 'SCHEDULE_TEMPLATE_APPLIED', category: 'SCHEDULE',
    description: `Template "${tpl.name}" applied to ${updated} schedule(s) (scope=${scope}, overwrite=${overwriteCustomized})`,
    userId: session!.userId, userName: session!.name,
    targetId: tpl.id, targetType: 'OrderOfServiceTemplate',
    metadata: { updated, scope, overwriteCustomized },
  });
  return NextResponse.json({ updated });
}
