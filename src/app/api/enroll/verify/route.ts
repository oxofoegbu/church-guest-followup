import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashOtpCode, OTP_MAX_ATTEMPTS, beginAudienceLabel } from '@/lib/enroll';
import { notifyAdminsOfEnrollmentRequest } from '@/lib/enrollment-notifications';

// Run 14 — public endpoint, step 2 of self-enrollment.
// Body: { requestId, code }. Confirms the emailed 6-digit code and promotes
// the request from UNVERIFIED to PENDING (which is when admins are alerted
// and it appears in the review queue).

export async function POST(request: NextRequest) {
  try {
    const { requestId, code } = await request.json();
    if (typeof requestId !== 'string' || typeof code !== 'string' || !/^[0-9]{6}$/.test(code.trim())) {
      return NextResponse.json({ error: 'Please enter the 6-digit code from your email.' }, { status: 400 });
    }

    const req = await (prisma as any).enrollmentRequest.findUnique({
      where: { id: requestId },
      include: {
        track: { select: { name: true } },
        cohort: { select: { name: true } },
      },
    });
    if (!req || req.status !== 'UNVERIFIED') {
      return NextResponse.json({ error: 'This request is no longer awaiting verification. Please start again from the enrollment page.' }, { status: 400 });
    }
    if (!req.verifyCodeHash || !req.verifyExpiresAt || new Date(req.verifyExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'That code has expired \u2014 tap \u201cResend code\u201d to get a new one.' }, { status: 400 });
    }
    if (req.verifyAttempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many incorrect attempts \u2014 tap \u201cResend code\u201d to get a new one.' }, { status: 400 });
    }

    if (hashOtpCode(req.id, code.trim()) !== req.verifyCodeHash) {
      await (prisma as any).enrollmentRequest.update({
        where: { id: req.id },
        data: { verifyAttempts: { increment: 1 } },
      });
      const remaining = OTP_MAX_ATTEMPTS - req.verifyAttempts - 1;
      return NextResponse.json({
        error: remaining > 0
          ? `That code is not right \u2014 please check your email and try again (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left).`
          : 'Too many incorrect attempts \u2014 tap \u201cResend code\u201d to get a new one.',
      }, { status: 400 });
    }

    // Verified — promote to PENDING and clear the code
    await (prisma as any).enrollmentRequest.update({
      where: { id: req.id },
      data: {
        status: 'PENDING',
        verifiedAt: new Date(),
        verifyCodeHash: null,
        verifyExpiresAt: null,
      },
    });

    // Now (and only now) alert the admins — the queue never sees unverified rows
    await notifyAdminsOfEnrollmentRequest({
      firstName: req.firstName,
      lastName: req.lastName,
      email: req.email,
      phone: req.phone,
      trackName: req.track.name,
      cohortName: req.cohort?.name || null,
      // Run 19 -- present on Welcome Track "Begin" requests
      audienceLabel: beginAudienceLabel(req.audience),
      shareNote: req.shareNote || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Enroll verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
