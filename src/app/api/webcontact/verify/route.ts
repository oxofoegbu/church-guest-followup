// Run 47 — public endpoint, step 2 of every website contact form. Body:
// { id, code }. Confirms the emailed 6-digit code, promotes the WebContact from
// UNVERIFIED to NEW, and runs the type-specific side effects (notify the team;
// a Plan-a-Visit also becomes a Guest). The team is alerted ONLY here, so an
// unverified/bot submission never reaches an inbox.
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashOtpCode, OTP_MAX_ATTEMPTS } from '@/lib/enroll';
import { finalizeWebContact } from '@/lib/webcontact';

export async function POST(request: NextRequest) {
  try {
    const { id, code } = await request.json();
    if (typeof id !== 'string' || typeof code !== 'string' || !/^[0-9]{6}$/.test(code.trim())) {
      return NextResponse.json({ error: 'Please enter the 6-digit code from your email.' }, { status: 400 });
    }

    const wc = await (prisma as any).webContact.findUnique({ where: { id } });
    if (!wc || wc.status !== 'UNVERIFIED') {
      return NextResponse.json({ error: 'This request is no longer awaiting verification. Please start again.' }, { status: 400 });
    }
    if (!wc.verifyCodeHash || !wc.verifyExpiresAt || new Date(wc.verifyExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'That code has expired. Tap "Resend code" to get a new one.' }, { status: 400 });
    }
    if (wc.verifyAttempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Tap "Resend code" to get a new one.' }, { status: 400 });
    }

    if (hashOtpCode(wc.id, code.trim()) !== wc.verifyCodeHash) {
      await (prisma as any).webContact.update({
        where: { id: wc.id },
        data: { verifyAttempts: { increment: 1 } },
      });
      const remaining = OTP_MAX_ATTEMPTS - wc.verifyAttempts - 1;
      return NextResponse.json({
        error: remaining > 0
          ? `That code is not right. Please check your email and try again (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left).`
          : 'Too many incorrect attempts. Tap "Resend code" to get a new one.',
      }, { status: 400 });
    }

    // Verified — promote to NEW, clear the code, then run side effects.
    const updated = await (prisma as any).webContact.update({
      where: { id: wc.id },
      data: { status: 'NEW', verifiedAt: new Date(), verifyCodeHash: null, verifyExpiresAt: null },
    });

    await finalizeWebContact(updated);

    return NextResponse.json({ ok: true, type: wc.type });
  } catch (error) {
    console.error('WebContact verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
