import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { auditSettingsChanged } from '@/lib/audit';

// Keys any authenticated user can read (non-sensitive).
// Run 6.1: added 'church_name' — it's not sensitive (appears in every drip
// email header) and the drip scheduler / executor read it at runtime.
const PUBLIC_KEYS = ['target_config', 'custom_roles', 'schedule_coordinators', 'church_name'];

// Keys only admins can read
const ADMIN_KEYS  = ['notify_emails', 'notify_whatsapp', 'notify_on_new_guest', 'notify_on_assignment', 'summary_emails', 'summary_whatsapp'];

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

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    if (url.searchParams.get('action') !== 'clearDemo') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    const demoGuests = await prisma.guest.findMany({
      where: { isDemo: true },
      select: { id: true },
    });
    const ids = demoGuests.map((g: any) => g.id);
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0, message: 'No demo data found — already clear!' });
    }
    await prisma.followUpActivity.deleteMany({ where: { guestId: { in: ids } } });
    await prisma.guestServiceReturn.deleteMany({ where: { guestId: { in: ids } } });
    await prisma.notificationLog.deleteMany({ where: { guestId: { in: ids } } });
    await prisma.actionItem.deleteMany({ where: { guestId: { in: ids } } });
    const result = await prisma.guest.deleteMany({ where: { isDemo: true } });
    return NextResponse.json({ ok: true, deleted: result.count, message: `Successfully deleted ${result.count} demo guest records. Your app is now ready for live use!` });
  } catch (error) {
    console.error('[clearDemo]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
