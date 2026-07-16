// Run 48 — Web Contacts Admin: reply to a contact by email (via Resend). Admin-
// level. Records the reply on the record (meta.replies) and auto-marks a NEW
// contact HANDLED. Fire-safe wording; requires the contact left an email.
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { sendEmailViaResend } from '@/lib/notifications';

function esc(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const { body } = await request.json().catch(() => ({}));
    if (typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ error: 'A reply message is required.' }, { status: 400 });
    }

    const wc = await (prisma as any).webContact.findUnique({ where: { id: params.id } });
    if (!wc) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    if (!wc.email) return NextResponse.json({ error: 'This contact left no email to reply to.' }, { status: 400 });

    const subject = 'Re: your message to Grace Life Center';
    const html =
      `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;color:#2A2622">` +
      `<p style="white-space:pre-wrap;font-size:16px">${esc(body)}</p>` +
      `<hr><p style="color:#6A6157;font-size:13px">With love, Grace Life Center — Laurel, Maryland</p>` +
      `</div>`;
    const result: any = await (sendEmailViaResend(wc.email, subject, html) as Promise<any>).catch((e: unknown) => ({ error: e }));
    if (result && result.error) {
      return NextResponse.json({ error: 'Could not send the reply. Please try again.' }, { status: 502 });
    }

    const meta = (wc.meta && typeof wc.meta === 'object') ? wc.meta : {};
    const replies = Array.isArray((meta as any).replies) ? (meta as any).replies : [];
    replies.push({ by: session.name, at: new Date().toISOString(), body });

    const wasNew = wc.status === 'NEW';
    const contact = await (prisma as any).webContact.update({
      where: { id: wc.id },
      data: {
        meta: { ...meta, replies },
        status: wasNew ? 'HANDLED' : wc.status,
        handledAt: wasNew ? new Date() : wc.handledAt,
        handledByUserId: wasNew ? session.userId : wc.handledByUserId,
      },
    });
    return NextResponse.json({ ok: true, contact });
  } catch (error) {
    return handleAuthError(error);
  }
}
