import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  generateOtpCode,
  hashOtpCode,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
} from '@/lib/enroll';
import { sendEnrollmentVerificationEmail } from '@/lib/enrollment-notifications';

// Run 14 — public endpoint. Body: { requestId }. Sends a fresh verification
// code for an UNVERIFIED request, at most once per minute. Issuing a new code
// resets the attempt counter.

export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json();
    if (typeof requestId !== 'string') {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    const req = await (prisma as any).enrollmentRequest.findUnique({
      where: { id: requestId },
      include: { track: { select: { name: true } } },
    });
    if (!req || req.status !== 'UNVERIFIED') {
      return NextResponse.json({ error: 'This request is no longer awaiting verification. Please start again from the enrollment page.' }, { status: 400 });
    }

    const sentAgo = req.verifySentAt ? Date.now() - new Date(req.verifySentAt).getTime() : Infinity;
    if (sentAgo < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - sentAgo) / 1000);
      return NextResponse.json({ error: `Please wait ${wait}s before requesting another code.` }, { status: 429 });
    }

    const code = generateOtpCode();
    await (prisma as any).enrollmentRequest.update({
      where: { id: req.id },
      data: {
        verifyCodeHash: hashOtpCode(req.id, code),
        verifyExpiresAt: new Date(Date.now() + OTP_TTL_MS),
        verifySentAt: new Date(),
        verifyAttempts: 0,
      },
    });
    const sent = await sendEnrollmentVerificationEmail({
      firstName: req.firstName,
      email: req.email,
      trackName: req.track.name,
      code,
    });
    if (!sent) {
      return NextResponse.json({ error: 'We could not send the verification email \u2014 please try again in a moment.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Enroll resend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
