import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { sendEmailViaResend, sendWhatsAppViaWhapi } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://harvest.gracelifecenter.com';

function buildEmailHtml(name: string, trackName: string, churchName: string, link: string, disciplerName: string | null) {
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #102a43; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">✝️ ${churchName}</h1>
      </div>
      <div style="border: 1px solid #d9e2ec; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Welcome to <strong>${trackName}</strong>! We are so glad you are on this journey with us.</p>
        <p>Below is your personal journey page. You can see each week, mark your progress, and reach
        ${disciplerName ? `<strong>${disciplerName}</strong>, who is walking with you,` : 'the person walking with you'}
        any time you have a question or just want to talk.</p>
        <a href="${link}" style="display: inline-block; background: #d57d2a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 8px;">
          Open My Journey →
        </a>
        <p style="margin-top: 24px; color: #829ab1; font-size: 14px;">
          This link is personal to you — no password needed. God bless!
        </p>
      </div>
    </div>
  `;
}

// POST /api/tracks/[id]/enrollments/[enrollmentId]/send-link
// Sends the portal link via email and/or WhatsApp to whatever contact info exists.
export async function POST(request: NextRequest, { params }: { params: { id: string; enrollmentId: string } }) {
  try {
    const session = await requireAuth(request, ['LEADER']);

    const enrollment = await (prisma as any).trackEnrollment.findUnique({
      where: { id: params.enrollmentId },
      include: {
        track: { select: { name: true } },
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        user: { select: { name: true, email: true, phone: true } },
        discipler: { select: { name: true } },
      },
    });
    if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });

    const name = enrollment.guest
      ? `${enrollment.guest.firstName} ${enrollment.guest.lastName}`
      : enrollment.user?.name || 'Friend';
    const firstName = name.split(' ')[0];
    const email = enrollment.guest?.email || enrollment.user?.email || null;
    const phone = enrollment.guest?.phone || enrollment.user?.phone || null;
    const link = `${APP_URL}/track/${enrollment.portalToken}`;

    const churchSetting = await prisma.appSetting.findUnique({ where: { key: 'church_name' } });
    const churchName = churchSetting?.value || 'Grace Life Center';
    const disciplerName = enrollment.discipler?.name || null;

    const results: { channel: string; ok: boolean; error?: string }[] = [];

    if (email) {
      const r = await sendEmailViaResend(
        email,
        `Your ${enrollment.track.name} journey — ${churchName}`,
        buildEmailHtml(firstName, enrollment.track.name, churchName, link, disciplerName),
      );
      results.push({ channel: 'EMAIL', ok: !r.error, error: r.error });
    }
    if (phone) {
      const msg = `Hello ${firstName}! Welcome to ${enrollment.track.name} at ${churchName}. ` +
        `Here is your personal journey page — see each week, track your progress, and reach ` +
        `${disciplerName || 'the person walking with you'} any time: ${link}`;
      const r = await sendWhatsAppViaWhapi(phone, msg);
      results.push({ channel: 'WHATSAPP', ok: !r.error, error: r.error });
    }

    if (results.length === 0) {
      return NextResponse.json({ error: 'No email or phone on file for this participant' }, { status: 400 });
    }

    await logAudit({
      action: 'TRACK_LINK_SENT', category: 'TRACK',
      description: `Portal link for "${enrollment.track.name}" sent to ${name} (${results.map(r => `${r.channel}:${r.ok ? 'ok' : 'failed'}`).join(', ')})`,
      userId: session.userId, userName: session.name,
      targetId: enrollment.id, targetType: 'TRACK_ENROLLMENT', targetName: name,
    });

    return NextResponse.json({ results });
  } catch (error) {
    return handleAuthError(error);
  }
}
