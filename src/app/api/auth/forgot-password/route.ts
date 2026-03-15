import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

const RESEND_API_KEY  = process.env.RESEND_API_KEY;
const FROM_EMAIL      = process.env.RESEND_FROM_EMAIL || 'noreply@gracelifecenter.org';
const FROM_NAME       = process.env.RESEND_FROM_NAME  || 'Grace Life Center';
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL || 'https://church-guest-followup.vercel.app';

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Find user by email first, then verify name loosely
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return the same message to prevent user enumeration
    const safeMessage = 'If your name and email match our records, a reset link has been sent.';

    if (!user || !user.active) {
      return NextResponse.json({ message: safeMessage });
    }

    // Loose name match (case-insensitive, partial)
    const nameMatch = user.name.toLowerCase().includes(name.toLowerCase().trim()) ||
      name.toLowerCase().trim().includes(user.name.toLowerCase().split(' ')[0]);

    if (!nameMatch) {
      return NextResponse.json({ message: safeMessage });
    }

    // Generate token (expires in 1 hour)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await (prisma as any).passwordResetToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt, used: false },
      create: { userId: user.id, token, expiresAt },
    });

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [user.email],
          subject: '🔑 Password Reset — Grace Life Center',
          html: `
            <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="background:#102a43;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:20px;">⛪ Grace Life Center</h1>
                <p style="margin:4px 0 0;opacity:0.75;font-size:13px;">Password Reset Request</p>
              </div>
              <div style="border:1px solid #d9e2ec;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
                <p>Hi <strong>${user.name}</strong>,</p>
                <p>We received a request to reset your password. Click the button below to set a new one:</p>
                <div style="text-align:center;margin:24px 0;">
                  <a href="${resetUrl}" style="display:inline-block;background:#d57d2a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
                    Reset My Password →
                  </a>
                </div>
                <p style="font-size:13px;color:#627d98;">This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
                <p style="font-size:12px;color:#9ca3af;margin-top:16px;">Or copy this link: ${resetUrl}</p>
              </div>
            </div>`,
        }),
      }).catch(e => console.error('[reset-email]', e));
    }

    return NextResponse.json({ message: safeMessage });
  } catch (error) {
    console.error('[forgot-password]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
