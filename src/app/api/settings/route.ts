import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET all settings (admin only)
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

  return NextResponse.json(settingsMap);
}

// PATCH update settings (admin only)
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
  ];

  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.includes(key)) continue;
    await prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  return NextResponse.json({ ok: true });
}
