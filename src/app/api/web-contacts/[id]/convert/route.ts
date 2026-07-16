// Run 48 — Web Contacts Admin: convert a contact into a Guest (prospect) in the
// Harvest CRM so it enters the follow-up pipeline. Admin-level. Idempotent: if
// the contact already links a Guest (e.g. a verified Plan-a-Visit), returns it.
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const wc = await (prisma as any).webContact.findUnique({ where: { id: params.id } });
    if (!wc) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

    if (wc.guestId) {
      return NextResponse.json({ ok: true, guestId: wc.guestId, note: 'Already linked to a guest.' });
    }

    const parts = String(wc.name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || (wc.email ? String(wc.email).split('@')[0] : 'Web contact');
    const lastName = parts.slice(1).join(' ') || '';

    const guest = await prisma.guest.create({
      data: {
        firstName,
        lastName,
        email: wc.email || null,
        phone: wc.phone || null,
        prayerRequest: wc.message || null,
        howHeardAboutUs: `Web contact (${String(wc.type).toLowerCase()})`,
        source: 'PROSPECT',
        status: 'NEW_GUEST',
        addedByUserId: session.userId,
      },
      select: { id: true },
    });

    const contact = await (prisma as any).webContact.update({
      where: { id: wc.id },
      data: {
        guestId: guest.id,
        status: wc.status === 'NEW' ? 'HANDLED' : wc.status,
        handledAt: new Date(),
        handledByUserId: session.userId,
      },
    });

    return NextResponse.json({ ok: true, guestId: guest.id, contact });
  } catch (error) {
    return handleAuthError(error);
  }
}
