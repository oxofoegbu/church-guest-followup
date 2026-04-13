import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';
import { logAudit } from '@/lib/audit';

async function getCustomRoles() {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  return setting?.value ? JSON.stringify(setting.value) : '[]';
}

async function requireAdminOrLeader() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401 as const, session: null };
  const customRoles = await getCustomRoles();
  const level = getPermissionLevel(session.role, customRoles);
  if (level !== 'ADMIN_ACCESS' && level !== 'LEADER_ACCESS') {
    return { error: 'Forbidden', status: 403 as const, session: null };
  }
  return { error: null, status: 200 as const, session };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrLeader();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const templates = await (prisma as any).dripTemplate.findMany({
    orderBy: [{ dayOffset: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOrLeader();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const session = auth.session!;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const dayOffset = Number(body.dayOffset);
  const channel = body.channel;
  const subject = typeof body.subject === 'string' ? body.subject.trim() : null;
  const messageBody = typeof body.body === 'string' ? body.body : '';
  const enabled = body.enabled !== false;

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!Number.isInteger(dayOffset) || dayOffset < 0) {
    return NextResponse.json({ error: 'dayOffset must be a non-negative integer' }, { status: 400 });
  }
  if (channel !== 'EMAIL' && channel !== 'WHATSAPP') {
    return NextResponse.json({ error: 'channel must be EMAIL or WHATSAPP' }, { status: 400 });
  }
  if (!messageBody.trim()) {
    return NextResponse.json({ error: 'Body is required' }, { status: 400 });
  }

  const created = await (prisma as any).dripTemplate.create({
    data: {
      name,
      dayOffset,
      channel,
      subject: channel === 'EMAIL' ? subject : null,
      body: messageBody,
      enabled,
    },
  });

  await logAudit({
    action: 'DRIP_TEMPLATE_CREATED',
    category: 'DRIP',
    description: `Created drip template "${name}" (day ${dayOffset}, ${channel})`,
    userId: session.userId,
    userName: session.name,
    targetId: created.id,
    targetType: 'DripTemplate',
    targetName: name,
  });

  return NextResponse.json({ template: created });
}
