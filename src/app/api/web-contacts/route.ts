// Run 48 — Web Contacts Admin: list endpoint. Admin-level. Returns verified
// contacts (NEW/HANDLED) newest-first, filterable by type + status, plus a
// per-type count for the filter chips. Assigned-user names are resolved
// separately (assignedToId is a plain string, not a relation).
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

const VERIFIED = ['NEW', 'HANDLED'];

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);
    const sp = new URL(request.url).searchParams;
    const type = sp.get('type');
    const status = sp.get('status');

    const where: any = {};
    if (type && type !== 'ALL') where.type = type;
    if (status && status !== 'ALL') where.status = status;
    else where.status = { in: VERIFIED };

    const contacts = await (prisma as any).webContact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    // Resolve assigned-user names.
    const ids = Array.from(new Set(contacts.map((c: any) => c.assignedToId).filter(Boolean))) as string[];
    const nameById: Record<string, string> = {};
    if (ids.length > 0) {
      const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      users.forEach((u: { id: string; name: string }) => { nameById[u.id] = u.name; });
    }
    const withNames = contacts.map((c: any) => ({
      ...c,
      assignedToName: c.assignedToId ? (nameById[c.assignedToId] || null) : null,
    }));

    // Per-type counts (verified only) for the chips.
    const verified = await (prisma as any).webContact.findMany({
      where: { status: { in: VERIFIED } },
      select: { type: true },
    });
    const byType: Record<string, number> = { ALL: verified.length };
    verified.forEach((r: any) => { byType[r.type] = (byType[r.type] || 0) + 1; });

    return NextResponse.json({ contacts: withNames, byType });
  } catch (error) {
    return handleAuthError(error);
  }
}
