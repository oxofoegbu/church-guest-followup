import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request);
    if (!['ADMIN', 'SENIOR_LEADER'].includes(session.role)) {
      return NextResponse.json({ error: 'Only admins can convert guests to users' }, { status: 403 });
    }

    const guest = await prisma.guest.findUnique({ where: { id: params.id } });
    if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

    const guestEmail = guest.email?.toLowerCase().trim();
    if (!guestEmail) {
      return NextResponse.json({ error: 'Guest must have an email address to be converted to a user' }, { status: 400 });
    }

    // Check no existing user
    const existing = await prisma.user.findUnique({ where: { email: guestEmail } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    const { role = 'VOLUNTEER', customMessage } = await request.json().catch(() => ({}));

    // Generate a temporary password they'll be forced to change
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashed = await hashPassword(tempPassword);

    const newUser = await prisma.user.create({
      data: {
        name:               `${guest.firstName} ${guest.lastName}`,
        email:              guestEmail,
        phone:              guest.phone || null,
        password:           hashed,
        role,
        active:             true,
        mustChangePassword: true,
      },
    });

    await logAudit({
      action:      'GUEST_CONVERTED_TO_USER',
      category:    'USER',
      description: `${session.name} converted guest "${guest.firstName} ${guest.lastName}" to a user account`,
      userId:      session.userId,
      userName:    session.name,
      targetId:    newUser.id,
      targetType:  'USER',
      targetName:  newUser.name,
      metadata:    { guestId: params.id, role },
    }).catch(() => {});

    // Send welcome email
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const APP_URL        = process.env.NEXT_PUBLIC_APP_URL || 'https://church-guest-followup.vercel.app';
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Grace Life Center <${process.env.RESEND_FROM_EMAIL || 'noreply@gracelifecenter.org'}>`,
          to: [guestEmail],
          subject: '🎉 Welcome to the Grace Life Center Staff System',
          html: `
            <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="background:#102a43;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:20px;">⛪ Grace Life Center</h1>
              </div>
              <div style="border:1px solid #d9e2ec;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
                <p>Hi <strong>${guest.firstName}</strong>,</p>
                <p>Welcome to the Grace Life Center team! Your staff account has been set up.</p>
                ${customMessage ? `<p style="font-style:italic;color:#486581;">"${customMessage}"</p>` : ''}
                <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f7f9fc;border-radius:8px;">
                  <tr><td style="padding:10px 14px;color:#627d98;width:100px;">Email</td><td style="padding:10px 14px;font-weight:bold;">${guestEmail}</td></tr>
                  <tr style="border-top:1px solid #e4eaf0;"><td style="padding:10px 14px;color:#627d98;">Temp Password</td><td style="padding:10px 14px;font-family:monospace;font-weight:bold;">${tempPassword}</td></tr>
                </table>
                <p style="font-size:13px;color:#627d98;">You'll be asked to change your password on first login.</p>
                <a href="${APP_URL}/login" style="display:inline-block;background:#d57d2a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
                  Log In Now →
                </a>
              </div>
            </div>`,
        }),
      }).catch(e => console.error('[convert-user email]', e));
    }

    return NextResponse.json({ ok: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, tempPassword } });
  } catch (error) {
    console.error('[convert-to-user]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
