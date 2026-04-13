// RUN2_OOS_7DAY
import { renderOrderOfServiceHtml, renderOrderOfServiceWhatsApp } from '@/lib/schedule-notifications';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const WHAPI_TOKEN    = process.env.WHAPI_TOKEN!;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@gracelifecenter.org';
const FROM_NAME      = process.env.RESEND_FROM_NAME  || 'Grace Life Center';
const CHURCH_NAME    = 'Grace Life Center';
const CONTACT_NAME   = 'Pastor Okezie';
const CONTACT_PHONE  = process.env.ADMIN_WHATSAPP || '';

// The four reminder windows (days before the service)
const REMINDER_INTERVALS = [
  { days: 60, field: 'reminder60Sent' as const },
  { days: 30, field: 'reminder30Sent' as const },
  { days: 14, field: 'reminder14Sent' as const },
  { days:  7, field: 'reminder7Sent'  as const },
] as const;

type UserRef = { id: string; name: string | null; email: string | null; phone: string | null } | null;

function leadTimeLabel(days: number): string {
  if (days === 7)  return 'this Sunday (7 days away)';
  if (days === 14) return 'in 2 weeks (14 days away)';
  if (days === 30) return 'in 30 days';
  if (days === 60) return 'in 60 days';
  return `in ${days} days`;
}

function emailSubject(days: number, dateStr: string): string {
  if (days === 7)  return `Reminder: Your Role This Sunday — ${dateStr}`;
  if (days === 14) return `2-Week Heads-Up: Your Role on ${dateStr}`;
  if (days === 30) return `30-Day Notice: Your Role on ${dateStr}`;
  return                 `60-Day Notice: Your Role on ${dateStr}`;
}

async function sendEmail(
  to: string, name: string, role: string,
  svc: { date: Date; topic: string; monthTheme: string | null },
  days: number,
) {
  const dateStr = svc.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  const leadLine = days === 7
    ? `You're scheduled <strong>this Sunday</strong>.`
    : `You're scheduled in <strong>${days} days</strong> — ${dateStr}.`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to:   [to],
      subject: emailSubject(days, dateStr),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:#7c3aed;color:white;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;font-size:22px;">Grace Life Center</h1>
            <p style="margin:8px 0 0;opacity:0.85;">Sunday Service Reminder</p>
          </div>
          <div style="background:#fafaf9;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p>Hi <strong>${name}</strong>,</p>
            <p>${leadLine}</p>
            <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0;">
              <p style="margin:0 0 6px;font-size:16px;font-weight:600;">${dateStr}</p>
              ${svc.monthTheme ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Theme: ${svc.monthTheme}</p>` : ''}
              <p style="margin:0;color:#374151;font-style:italic;">"${svc.topic}"</p>
            </div>
            <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;border-radius:0 8px 8px 0;">
              <p style="margin:0;font-size:14px;color:#1e40af;">
                Your Role: <strong>${role}</strong><br/>
                Questions? Contact <strong>${CONTACT_NAME}</strong>${CONTACT_PHONE ? ` at ${CONTACT_PHONE}` : ''}.
              </p>
            </div>
            <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
              Sent automatically by ${CHURCH_NAME} Guest &amp; Schedule System.
            </p>
          </div>
        </div>`,
    }),
  });
}

async function sendWhatsApp(
  phone: string, name: string, role: string,
  svc: { date: Date; topic: string; monthTheme: string | null },
  days: number,
) {
  const dateStr = svc.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  const themeLine = svc.monthTheme ? `\n\u{1F4D6} Theme: ${svc.monthTheme}` : '';
  const timing    = leadTimeLabel(days);

  const message =
    `\u{1F64F} *${CHURCH_NAME} \u2014 Service Reminder*\n\n` +
    `Hi ${name}, you're scheduled as *${role}* ${timing}.\n\n` +
    `\u{1F4C5} *${dateStr}*${themeLine}\n\n` +
    `\u{1F4DD} _${svc.topic}_\n\n` +
    `Questions? Contact ${CONTACT_NAME}${CONTACT_PHONE ? ` \u2014 ${CONTACT_PHONE}` : ''}.\n\n` +
    `_See you Sunday\u{1F389}_`;

  const normalized = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
  await fetch('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WHAPI_TOKEN}` },
    body: JSON.stringify({ to: `${normalized}@s.whatsapp.net`, body: message }),
  });
}

async function notifyUser(
  user: UserRef, role: string,
  svc: { date: Date; topic: string; monthTheme: string | null; id: string },
  days: number,
) {
  if (!user) return;
  const name = user.name || 'Team Member';
  if (user.email) {
    try { await sendEmail(user.email, name, role, svc, days); }
    catch (e) { console.error(`[schedule-reminders] email error (${days}d)`, e); }
  }
  if (user.phone) {
    try { await sendWhatsApp(user.phone, name, role, svc, days); }
    catch (e) { console.error(`[schedule-reminders] whatsapp error (${days}d)`, e); }
  }
}

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader   = request.headers.get('authorization');
  const cronSecret   = process.env.CRON_SECRET;

  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let totalSent = 0;
  const summary: string[] = [];

  try {
    for (const { days, field } of REMINDER_INTERVALS) {
      const targetDate = new Date(today);
      targetDate.setUTCDate(targetDate.getUTCDate() + days);
      const nextDay = new Date(targetDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      const services = await (prisma.serviceSchedule.findMany as any)({
        where: {
          date: { gte: targetDate, lt: nextDay },
          [field]: false,
        },
        include: {
          speaker:            { select: { id: true, name: true, email: true, phone: true } },
          serviceCoordinator: { select: { id: true, name: true, email: true, phone: true } },
          propheticPrayer:    { select: { id: true, name: true, email: true, phone: true } },
          worshipLeader:      { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      if (!services.length) continue;

      for (const svc of services) {
        const info = { date: svc.date, topic: svc.topic, monthTheme: svc.monthTheme, id: svc.id };
        await notifyUser(svc.speaker,            'Speaker (Word Minister)',   info, days);
        await notifyUser(svc.serviceCoordinator, 'Service Coordinator',       info, days);
        await notifyUser(svc.propheticPrayer,    'Prophetic Prayer Minister', info, days);
        await notifyUser(svc.worshipLeader,      'Worship Leader',            info, days);

        await (prisma.serviceSchedule.update as any)({
          where: { id: svc.id },
          data:  { [field]: true },
        });

        totalSent++;
      }

      summary.push(`${days}d: ${services.length} service(s)`);
    }

    return NextResponse.json({
      message: totalSent ? `Reminders sent — ${summary.join(', ')}` : 'No reminders due today',
      sent: totalSent,
    });
  } catch (error) {
    console.error('[schedule-reminders]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { GET as POST };
