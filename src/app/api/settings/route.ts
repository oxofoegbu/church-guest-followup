import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { auditSettingsChanged } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await prisma.appSetting.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  // Also include pending account requests count
  const pendingRequests = await (prisma as any).accountRequest
    .count({ where: { status: 'PENDING' } })
    .catch(() => 0);

  return NextResponse.json({ ...settingsMap, _pendingRequests: pendingRequests });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const allowedKeys = [
    'notify_emails',
    'notify_whatsapp',
    'notify_on_new_guest',
    'notify_on_assignment',
    'custom_targets',
    'custom_roles',
    'target_config',
    'schedule_coordinators', // NEW: who can assign schedule roles
  ];

  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.includes(key)) continue;
    await prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  const changedKeys = Object.keys(body).filter(k => allowedKeys.includes(k));
  if (changedKeys.length > 0) {
    auditSettingsChanged(user.userId, user.name, changedKeys).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
