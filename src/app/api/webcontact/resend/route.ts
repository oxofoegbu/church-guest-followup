// Run 47 — public endpoint. Body: { id }. Sends a fresh verification code for
// an UNVERIFIED WebContact, at most once per minute. Issuing a new code resets
// the attempt counter. Mirrors /api/enroll/resend.
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateOtpCode, hashOtpCode, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS } from '@/lib/enroll';
import { sendWebContactVerificationEmail } from '@/lib/webcontact';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const wc = await (prisma as any).webContact.findUnique({ where: { id } });
    if (!wc || wc.status !== 'UNVERIFIED') {
      return NextResponse.json({ error: 'This request is no longer awaiting verification. Please start again.' }, { status: 400 });
    }

    const sentAgo = wc.verifySentAt ? Date.now() - new Date(wc.verifySentAt).getTime() : Infinity;
    if (sentAgo < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - sentAgo) / 1000);
      return NextResponse.json({ error: `Please wait ${wait}s before requesting another code.` }, { status: 429 });
    }

    const code = generateOtpCode();
    await (prisma as any).webContact.update({
      where: { id: wc.id },
      data: {
        verifyCodeHash: hashOtpCode(wc.id, code),
        verifyExpiresAt: new Date(Date.now() + OTP_TTL_MS),
        verifySentAt: new Date(),
        verifyAttempts: 0,
      },
    });
    const sent = await sendWebContactVerificationEmail({ name: wc.name, email: wc.email, code });
    if (!sent) {
      return NextResponse.json({ error: 'We could not send the verification email. Please try again in a moment.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('WebContact resend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
