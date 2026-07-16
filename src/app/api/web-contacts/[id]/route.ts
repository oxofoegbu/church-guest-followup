// Run 48 — Web Contacts Admin: update a contact (status / internal notes /
// assignment). Admin-level. Marking HANDLED stamps who + when.
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

const STATUSES = ['NEW', 'HANDLED', 'SPAM', 'UNSUBSCRIBED'];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const body = await request.json().catch(() => ({}));

    const data: any = {};
    if (typeof body.status === 'string') {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      data.status = body.status;
      if (body.status === 'HANDLED') {
        data.handledAt = new Date();
        data.handledByUserId = session.userId;
      } else {
        data.handledAt = null;
        data.handledByUserId = null;
      }
    }
    if (typeof body.notes === 'string') data.notes = body.notes.slice(0, 4000);
    if ('assignedToId' in body) data.assignedToId = body.assignedToId || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const contact = await (prisma as any).webContact.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true, contact });
  } catch (error) {
    return handleAuthError(error);
  }
}
