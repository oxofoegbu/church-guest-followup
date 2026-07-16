// Run 48 — Web Contacts Admin: CSV export. Admin-level. Honors the same type +
// status filters as the list (defaults to verified NEW/HANDLED).
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { toCSV, formatDateTime } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);
    const sp = new URL(request.url).searchParams;
    const type = sp.get('type');
    const status = sp.get('status');

    const where: any = {};
    if (type && type !== 'ALL') where.type = type;
    if (status && status !== 'ALL') where.status = status;
    else where.status = { in: ['NEW', 'HANDLED'] };

    const rows = await (prisma as any).webContact.findMany({ where, orderBy: { createdAt: 'desc' } });

    const ids = Array.from(new Set(rows.map((c: any) => c.assignedToId).filter(Boolean))) as string[];
    const nameById: Record<string, string> = {};
    if (ids.length > 0) {
      const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      users.forEach((u: { id: string; name: string }) => { nameById[u.id] = u.name; });
    }

    const csv = toCSV(
      rows.map((c: any) => ({
        type: c.type,
        status: c.status,
        name: c.name,
        email: c.email,
        phone: c.phone,
        message: c.message,
        source: c.source,
        created: formatDateTime(c.createdAt),
        verified: formatDateTime(c.verifiedAt),
        assigned: c.assignedToId ? (nameById[c.assignedToId] || '') : '',
        handled: formatDateTime(c.handledAt),
      })),
      [
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'message', label: 'Message' },
        { key: 'source', label: 'Source' },
        { key: 'created', label: 'Received' },
        { key: 'verified', label: 'Verified' },
        { key: 'assigned', label: 'Assigned To' },
        { key: 'handled', label: 'Handled' },
      ]
    );
    const filename = `web-contacts-${new Date().toISOString().split('T')[0]}.csv`;
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
