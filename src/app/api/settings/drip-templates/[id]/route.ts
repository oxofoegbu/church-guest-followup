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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminOrLeader();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const session = auth.session!;

  const existing = await (prisma as any).dripTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data: any = {};
  let toggledOnly = true;

  if (typeof body.name === 'string') {
    const trimmed = body.name.trim();
    if (!trimmed) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    data.name = trimmed;
    toggledOnly = false;
  }
  if (body.dayOffset !== undefined) {
    const n = Number(body.dayOffset);
    if (!Number.isInteger(n) || n < 0) {
      return NextResponse.json({ error: 'dayOffset must be a non-negative integer' }, { status: 400 });
    }
    data.dayOffset = n;
    toggledOnly = false;
  }
  if (body.channel !== undefined) {
    if (body.channel !== 'EMAIL' && body.channel !== 'WHATSAPP') {
      return NextResponse.json({ error: 'channel must be EMAIL or WHATSAPP' }, { status: 400 });
    }
    data.channel = body.channel;
    toggledOnly = false;
  }
  if (body.subject !== undefined) {
    data.subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : null;
    toggledOnly = false;
  }
  if (typeof body.body === 'string') {
    if (!body.body.trim()) {
      return NextResponse.json({ error: 'Body cannot be empty' }, { status: 400 });
    }
    data.body = body.body;
    toggledOnly = false;
  }
  if (typeof body.enabled === 'boolean') {
    data.enabled = body.enabled;
  }
  // If channel is being changed to WHATSAPP, force subject null
  if (data.channel === 'WHATSAPP') data.subject = null;

  const updated = await (prisma as any).dripTemplate.update({
    where: { id: params.id },
    data,
  });

  const isToggle = toggledOnly && typeof body.enabled === 'boolean';
  await logAudit({
    action: isToggle ? 'DRIP_TEMPLATE_TOGGLED' : 'DRIP_TEMPLATE_UPDATED',
    category: 'DRIP',
    description: isToggle
      ? `${updated.enabled ? 'Enabled' : 'Disabled'} drip template "${updated.name}"`
      : `Updated drip template "${updated.name}"`,
    userId: session.userId,
    userName: session.name,
    targetId: updated.id,
    targetType: 'DripTemplate',
    targetName: updated.name,
  });

  return NextResponse.json({ template: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminOrLeader();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const session = auth.session!;

  const existing = await (prisma as any).dripTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await (prisma as any).dripTemplate.delete({ where: { id: params.id } });

  await logAudit({
    action: 'DRIP_TEMPLATE_DELETED',
    category: 'DRIP',
    description: `Deleted drip template "${existing.name}"`,
    userId: session.userId,
    userName: session.name,
    targetId: existing.id,
    targetType: 'DripTemplate',
    targetName: existing.name,
  });

  return NextResponse.json({ ok: true });
}
