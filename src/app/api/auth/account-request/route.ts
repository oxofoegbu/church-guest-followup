import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || 'noreply@gracelifecenter.org';
const FROM_NAME      = process.env.RESEND_FROM_NAME  || 'Grace Life Center';
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL || 'https://church-guest-followup.vercel.app';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, message } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Try the password reset option.' }, { status: 400 });
    }

    // Save request
    await (prisma as any).accountRequest.upsert({
      where: { email: email.toLowerCase().trim() },
      update: { name: name.trim(), phone: phone?.trim() || null, message: message?.trim() || null, status: 'PENDING' },
      create: {
        name:    name.trim(),
        email:   email.toLowerCase().trim(),
        phone:   phone?.trim() || null,
        message: message?.trim() || null,
        status:  'PENDING',
      },
    });

    // Notify all admins
    if (RESEND_API_KEY) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', active: true },
        select: { email: true, name: true },
      });

      for (const admin of admins) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [admin.email],
            subject: `👤 New Account Request — ${name}`,
            html: `
              <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;">
                <div style="background:#102a43;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
                  <h1 style="margin:0;font-size:20px;">⛪ Grace Life Center</h1>
                  <p style="margin:4px 0 0;opacity:0.75;font-size:13px;">New Account Access Request</p>
                </div>
                <div style="border:1px solid #d9e2ec;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
                  <p>Hi <strong>${admin.name}</strong>,</p>
                  <p>Someone has requested access to the staff system:</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f7f9fc;border-radius:8px;">
                    <tr><td style="padding:10px 14px;color:#627d98;width:100px;font-size:14px;">Name</td><td style="padding:10px 14px;font-weight:bold;">${name}</td></tr>
                    <tr style="border-top:1px solid #e4eaf0;"><td style="padding:10px 14px;color:#627d98;font-size:14px;">Email</td><td style="padding:10px 14px;">${email}</td></tr>
                    ${phone ? `<tr style="border-top:1px solid #e4eaf0;"><td style="padding:10px 14px;color:#627d98;font-size:14px;">Phone</td><td style="padding:10px 14px;">${phone}</td></tr>` : ''}
                    ${message ? `<tr style="border-top:1px solid #e4eaf0;"><td style="padding:10px 14px;color:#627d98;font-size:14px;">Message</td><td style="padding:10px 14px;font-style:italic;">${message}</td></tr>` : ''}
                  </table>
                  <a href="${APP_URL}/dashboard/users" style="display:inline-block;background:#d57d2a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                    Review in Users Dashboard →
                  </a>
                  <p style="margin-top:16px;font-size:13px;color:#829ab1;">You can create their account from the Users page.</p>
                </div>
              </div>`,
          }),
        }).catch(e => console.error('[account-request email]', e));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[account-request]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const requests = await (prisma as any).accountRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
