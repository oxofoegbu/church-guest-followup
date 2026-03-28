import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || 'noreply@gracelifecenter.org';
const FROM_NAME      = process.env.RESEND_FROM_NAME  || 'GLC Harvest';
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL || 'https://harvest.gracelifecenter.com';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent user enumeration
    const safeResponse = NextResponse.json({
      ok: true,
      message: 'If that email is registered, a sign-in link has been sent.',
    });

    if (!user || !user.active) return safeResponse;

    // Generate a secure token valid for 15 minutes
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await (prisma as any).magicLinkToken.upsert({
      where:  { userId: user.id },
      update: { token, expiresAt, used: false },
      create: { userId: user.id, token, expiresAt },
    });

    const magicUrl = `${APP_URL}/api/auth/magic-link/verify?token=${token}`;

    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:    `${FROM_NAME} <${FROM_EMAIL}>`,
          to:      [user.email],
          subject: '🔐 Your sign-in link — Grace Life Center',
          html: `
            <div style="font-family:Georgia,serif;max-width:580px;margin:0 auto;padding:0;">
              <!-- Header -->
              <div style="background:#102a43;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
                <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:bold;">⛪ Grace Life Center</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px;font-family:sans-serif;">Harvest Staff Portal</p>
              </div>

              <!-- Body -->
              <div style="background:#ffffff;border:1px solid #e4eaf0;border-top:none;border-radius:0 0 12px 12px;padding:36px 32px;">
                <p style="margin:0 0 8px;font-size:17px;color:#102a43;">Hi <strong>${user.name}</strong>,</p>
                <p style="margin:0 0 28px;font-size:15px;color:#486581;line-height:1.6;">
                  Click the button below to sign in to Harvest. This link expires in <strong>15 minutes</strong> and can only be used once.
                </p>

                <div style="text-align:center;margin:0 0 32px;">
                  <a href="${magicUrl}"
                    style="display:inline-block;background:#d57d2a;color:#ffffff;padding:16px 36px;border-radius:10px;text-decoration:none;font-family:sans-serif;font-size:17px;font-weight:bold;letter-spacing:0.01em;">
                    Sign In to Harvest →
                  </a>
                </div>

                <p style="margin:0 0 8px;font-size:13px;color:#829ab1;font-family:sans-serif;">
                  Didn't request this? You can safely ignore this email — your account is secure.
                </p>
                <p style="margin:0;font-size:12px;color:#b0bec5;font-family:sans-serif;word-break:break-all;">
                  Or copy this link: ${magicUrl}
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align:center;padding:20px 0 0;">
                <p style="margin:0;font-size:12px;color:#9ca3af;font-family:sans-serif;">
                  Grace Life Center · Charismatic Renewal Ministries
                </p>
              </div>
            </div>
          `,
        }),
      }).catch(e => console.error('[magic-link email]', e));
    }

    return safeResponse;
  } catch (error) {
    console.error('[magic-link POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
