import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

type OrderItem = {
  id: string;
  type: 'section' | 'item';
  time?: string;
  title: string;
  person?: string;
  durationMin?: number;
  notes?: string;
};

function validateOrder(body: unknown): OrderItem[] | null {
  if (!Array.isArray(body)) return null;
  const out: OrderItem[] = [];
  for (const raw of body) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (r.type !== 'section' && r.type !== 'item') return null;
    if (typeof r.title !== 'string' || !r.title.trim()) return null;
    out.push({
      id: typeof r.id === 'string' ? r.id : Math.random().toString(36).slice(2),
      type: r.type,
      title: r.title.trim(),
      time: typeof r.time === 'string' ? r.time : undefined,
      person: typeof r.person === 'string' ? r.person : undefined,
      durationMin:
        typeof r.durationMin === 'number' && r.durationMin >= 0
          ? Math.floor(r.durationMin)
          : undefined,
      notes: typeof r.notes === 'string' ? r.notes : undefined,
    });
  }
  return out;
}

async function canEditSchedule(session: { userId: string; role: string }) {
  const customRolesRow = await prisma.appSetting.findUnique({
    where: { key: 'custom_roles' },
  });
  const level = getPermissionLevel(session.role, customRolesRow?.value ?? null);
  if (level === 'ADMIN_ACCESS' || level === 'LEADER_ACCESS') return true;

  const coordRow = await prisma.appSetting.findUnique({
    where: { key: 'schedule_coordinators' },
  });
  if (!coordRow) return false;
  try {
    const arr = JSON.parse(coordRow.value) as Array<{ userId: string }>;
    return arr.some((c) => c.userId === session.userId);
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const schedule = await prisma.serviceSchedule.findUnique({
    where: { id: params.id },
    select: { id: true, date: true, topic: true, orderOfService: true } as any,
      orderCustomized: true,
  });
  if (!schedule) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    id: schedule.id,
    date: schedule.date,
    topic: schedule.topic,
    orderOfService:
      ((schedule as any).orderOfService as OrderItem[] | null) ?? [],
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await canEditSchedule(session))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const order = validateOrder(body?.orderOfService ?? body);
  if (order === null) {
    return NextResponse.json(
      { error: 'Invalid order of service payload' },
      { status: 400 },
    );
  }

  const existing = await prisma.serviceSchedule.findUnique({
    where: { id: params.id },
    select: { id: true, date: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await (prisma.serviceSchedule.update as any)({
    where: { id: params.id },
    data: { orderOfService: order 
      },
  });

  await logAudit({
    action: 'SCHEDULE_ORDER_UPDATED',
    category: 'SCHEDULE',
    description: `Order of Service updated for ${new Date(existing.date)
      .toISOString()
      .slice(0, 10)} (${order.length} items)`,
    userId: session.userId,
    userName: session.name,
    targetId: existing.id,
    targetType: 'ServiceSchedule',
    metadata: { itemCount: order.length },
  });

  return NextResponse.json({
    id: updated.id,
    orderOfService: updated.orderOfService,
  });
}
