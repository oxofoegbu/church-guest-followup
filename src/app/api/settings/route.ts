import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { auditSettingsChanged } from '@/lib/audit';

// Keys any authenticated user can read (non-sensitive)
const PUBLIC_KEYS = ['target_config', 'custom_roles', 'schedule_coordinators'];

// Keys only admins can read
const ADMIN_KEYS  = ['notify_emails', 'notify_whatsapp', 'notify_on_new_guest', 'notify_on_assignment'];

// All writable keys (admin only)
const WRITABLE_KEYS = [...PUBLIC_KEYS, ...ADMIN_KEYS];

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const isAdmin = user.role === 'ADMIN';

    const settings = await prisma.appSetting.findMany();
    const settingsMap: Record<string, string> = {};

    for (const s of settings) {
      // All authenticated users can read public keys
      if (PUBLIC_KEYS.includes(s.key)) {
        settingsMap[s.key] = s.value;
      }
      // Only admins can read sensitive keys
      if (isAdmin && ADMIN_KEYS.includes(s.key)) {
        settingsMap[s.key] = s.value;
      }
    }

    // Pending account requests count (admins only)
    if (isAdmin) {
      const pendingRequests = await (prisma as any).accountRequest
        .count({ where: { status: 'PENDING' } })
        .catch(() => 0);
      settingsMap._pendingRequests = String(pendingRequests);
    }

    return NextResponse.json(settingsMap);
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      if (!WRITABLE_KEYS.includes(key)) continue;
      await prisma.appSetting.upsert({
        where:  { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    const changedKeys = Object.keys(body).filter(k => WRITABLE_KEYS.includes(k));
    if (changedKeys.length > 0) {
      auditSettingsChanged(user.userId, user.name, changedKeys).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
