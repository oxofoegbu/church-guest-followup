// RUN2_OOS_7DAY → RUN8: OoS (HTML + PDF) now included in EVERY reminder,
// plus a weekly lineup summary to designated leaders after 7-day reminders.
import { renderOrderOfServiceHtml, renderOrderOfServiceWhatsApp } from '@/lib/schedule-notifications';
import { buildOrderOfServicePdf, oosPdfFilename, OoSItem } from '@/lib/oos-pdf';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const WHAPI_TOKEN    = process.env.WHAPI_TOKEN!;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@gracelifecenter.org';
const FROM_NAME      = process.env.RESEND_FROM_NAME  || 'Grace Life Center';
const CHURCH_NAME    = 'Grace Life Center';
const CONTACT_NAME   = 'Pastor Okezie';
const CONTACT_PHONE  = process.env.ADMIN_WHATSAPP || '';
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL || 'https://harvest.gracelifecenter.com';

// The four reminder windows (days before the service)
const REMINDER_INTERVALS = [
  { days: 60, field: 'reminder60Sent' as const },
  { days: 30, field: 'reminder30Sent' as const },
  { days: 14, field: 'reminder14Sent' as const },
  { days:  7, field: 'reminder7Sent'  as const },
] as const;

type UserRef = { id: string; name: string | null; email: string | null; phone: string | null } | null;

type ServiceInfo = {
  id: string;
  date: Date;
  topic: string;
  monthTheme: string | null;
  oosHtml: string;
  oosText: string;
  pdfBase64: string | null;
  pdfFilename: string;
  pdfUrl: string;
};

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
  svc: ServiceInfo,
  days: number,
) {
  const dateStr = svc.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  const leadLine = days === 7
    ? `You're scheduled <strong>this Sunday</strong>.`
    : `You're scheduled in <strong>${days} days</strong> — ${dateStr}.`;

  const payload: any = {
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
          ${svc.oosHtml ? `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0;">
            ${svc.oosHtml}
            <p style="margin:16px 0 0;">
              <a href="${svc.pdfUrl}" style="display:inline-block;background:#b45309;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
                &#128196; Download Order of Service (PDF)
              </a>
            </p>
            <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
              The PDF is also attached to this email — print it or keep it on your phone.
              If anything needs to change, contact ${CONTACT_NAME} <strong>before</strong> Sunday.
            </p>
          </div>` : ''}
          <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
            Sent automatically by ${CHURCH_NAME} Guest &amp; Schedule System.
          </p>
        </div>
      </div>`,
  };

  if (svc.pdfBase64) {
    payload.attachments = [{ filename: svc.pdfFilename, content: svc.pdfBase64 }];
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify(payload),
  });
}

async function sendWhatsApp(
  phone: string, name: string, role: string,
  svc: ServiceInfo,
  days: number,
) {
  const dateStr = svc.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  const themeLine = svc.monthTheme ? `\n\u{1F4D6} Theme: ${svc.monthTheme}` : '';
  const timing    = leadTimeLabel(days);

  let message =
    `\u{1F64F} *${CHURCH_NAME} \u2014 Service Reminder*\n\n` +
    `Hi ${name}, you're scheduled as *${role}* ${timing}.\n\n` +
    `\u{1F4C5} *${dateStr}*${themeLine}\n\n` +
    `\u{1F4DD} _${svc.topic}_\n\n`;

  if (svc.oosText) {
    message += svc.oosText + `\n\n`;
    message += `\u{1F4C4} Download / print the Order of Service (PDF):\n${svc.pdfUrl}\n\n`;
    message += `_If anything needs to change, say so BEFORE Sunday._\n\n`;
  }

  message +=
    `Questions? Contact ${CONTACT_NAME}${CONTACT_PHONE ? ` \u2014 ${CONTACT_PHONE}` : ''}.\n\n` +
    `_See you Sunday\u{1F389}_`;

  const normalized = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
  await fetch('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WHAPI_TOKEN}` },
    body: JSON.stringify({ to: `${normalized}@s.whatsapp.net`, body: message }),
  });
}

/** Notify one person; returns how they were reached (for the leader summary). */
async function notifyUser(
  user: UserRef, role: string,
  svc: ServiceInfo,
  days: number,
): Promise<string[]> {
  if (!user) return [];
  const name = user.name || 'Team Member';
  const channels: string[] = [];
  if (user.email) {
    try { await sendEmail(user.email, name, role, svc, days); channels.push('email'); }
    catch (e) { console.error(`[schedule-reminders] email error (${days}d)`, e); }
  }
  if (user.phone) {
    try { await sendWhatsApp(user.phone, name, role, svc, days); channels.push('WhatsApp'); }
    catch (e) { console.error(`[schedule-reminders] whatsapp error (${days}d)`, e); }
  }
  return channels;
}

// ── Leader lineup summary (7-day only) ──────────────────────────────────────

type LineupEntry = { role: string; name: string; channels: string[] };

async function sendLeaderSummary(svc: ServiceInfo, lineup: LineupEntry[]) {
  const emailSetting = await prisma.appSetting.findUnique({ where: { key: 'summary_emails' } }).catch(() => null);
  const emails = emailSetting?.value ? emailSetting.value.split(',').map(e => e.trim()).filter(Boolean) : [];
  const waSetting = await prisma.appSetting.findUnique({ where: { key: 'summary_whatsapp' } }).catch(() => null);
  const numbers = waSetting?.value ? waSetting.value.split(',').map(n => n.trim()).filter(Boolean) : [];

  if (!emails.length && !numbers.length) return;

  const dateStr = svc.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  const statusHtml = (e: LineupEntry) => e.channels.length
    ? `<span style="color:#059669;">&#10003; reminded via ${e.channels.join(' + ')}</span>`
    : `<span style="color:#d97706;">not linked to an account &mdash; no reminder sent</span>`;

  const rowsHtml = lineup.map(e => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600;white-space:nowrap;">${e.role}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">${e.name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;">${statusHtml(e)}</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#0f2143;color:white;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:20px;">${CHURCH_NAME}</h1>
        <p style="margin:8px 0 0;opacity:0.85;">Upcoming Service Lineup — Leader Summary</p>
      </div>
      <div style="background:#fafaf9;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 4px;font-size:16px;font-weight:600;">${dateStr}</p>
        ${svc.monthTheme ? `<p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Theme: ${svc.monthTheme}</p>` : ''}
        <p style="margin:0 0 16px;color:#374151;font-style:italic;">"${svc.topic}"</p>
        <p style="margin:0 0 8px;font-size:14px;">The following people are handling this Sunday's service and have been sent their 7-day reminders:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;background:white;border:1px solid #e5e7eb;border-radius:8px;">
          ${rowsHtml}
        </table>
        <p style="margin:16px 0 0;">
          <a href="${svc.pdfUrl}" style="display:inline-block;background:#b45309;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
            &#128196; Order of Service (PDF)
          </a>
          &nbsp;
          <a href="${APP_URL}/dashboard/schedule" style="display:inline-block;background:#0f2143;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
            Open Schedule &rarr;
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
          Sent automatically by ${CHURCH_NAME} Guest &amp; Schedule System.
        </p>
      </div>
    </div>`;

  for (const to of emails) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [to],
          subject: `Service Lineup — ${dateStr}`,
          html,
        }),
      });
    } catch (e) { console.error('[schedule-reminders] summary email error', e); }
  }

  if (numbers.length) {
    const statusText = (e: LineupEntry) => e.channels.length ? '\u2705 reminded' : '\u26A0\uFE0F not linked (no reminder)';
    const lines = lineup.map(e => `\u2022 *${e.role}:* ${e.name} \u2014 ${statusText(e)}`).join('\n');
    const message =
      `\u{1F4CB} *${CHURCH_NAME} \u2014 Service Lineup*\n\n` +
      `\u{1F4C5} *${dateStr}*\n` +
      `\u{1F4DD} _${svc.topic}_\n\n` +
      `These persons have been reminded of their role in the upcoming service:\n\n${lines}\n\n` +
      `\u{1F4C4} Order of Service (PDF):\n${svc.pdfUrl}`;

    for (const num of numbers) {
      try {
        const normalized = num.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
        await fetch('https://gate.whapi.cloud/messages/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WHAPI_TOKEN}` },
          body: JSON.stringify({ to: `${normalized}@s.whatsapp.net`, body: message }),
        });
      } catch (e) { console.error('[schedule-reminders] summary whatsapp error', e); }
    }
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
    // Default Order of Service template — fallback for Sundays without a custom order
    const defaultTpl = await (prisma as any).orderOfServiceTemplate
      .findFirst({ where: { isDefault: true } })
      .catch(() => null);
    const defaultItems: OoSItem[] = (defaultTpl && Array.isArray(defaultTpl.items)) ? defaultTpl.items : [];

    const churchSetting = await prisma.appSetting.findUnique({ where: { key: 'church_name' } }).catch(() => null);
    const churchName = churchSetting?.value || CHURCH_NAME;

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
        // Resolve Order of Service items (custom → default template → none)
        const items: OoSItem[] = (Array.isArray(svc.orderOfService) && svc.orderOfService.length)
          ? svc.orderOfService
          : defaultItems;

        const dateStrLong = svc.date.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
        });

        // Build the PDF once per service; reuse for every recipient
        let pdfBase64: string | null = null;
        if (items.length) {
          try {
            const display = (nm: string | null, u: UserRef) => u?.name || (nm && nm !== 'TBD' ? nm : 'TBD');
            const roles: { label: string; name: string }[] = [];
            if (svc.isSeminar && Array.isArray(svc.panelSpeakers) && svc.panelSpeakers.length) {
              roles.push({ label: 'Seminar Panel', name: svc.panelSpeakers.map((sp: any) => sp.name).filter(Boolean).join(', ') });
            } else {
              roles.push({ label: 'Speaker', name: display(svc.speakerName, svc.speaker) });
            }
            roles.push({ label: 'Coordinator',      name: display(svc.serviceCoordinatorName, svc.serviceCoordinator) });
            roles.push({ label: 'Prophetic Prayer', name: display(svc.propheticPrayerName, svc.propheticPrayer) });
            roles.push({ label: 'Worship',          name: display(svc.worshipLeaderName, svc.worshipLeader) });

            const bytes = await buildOrderOfServicePdf({
              churchName,
              dateStr: dateStrLong,
              topic: svc.topic,
              monthTheme: svc.monthTheme,
              roles,
              items,
            });
            pdfBase64 = Buffer.from(bytes).toString('base64');
          } catch (e) {
            console.error(`[schedule-reminders] pdf build error (${days}d)`, e);
          }
        }

        const info: ServiceInfo = {
          id: svc.id,
          date: svc.date,
          topic: svc.topic,
          monthTheme: svc.monthTheme,
          oosHtml: items.length ? renderOrderOfServiceHtml(items) : '',
          oosText: items.length ? renderOrderOfServiceWhatsApp(items) : '',
          pdfBase64,
          pdfFilename: oosPdfFilename(svc.date),
          pdfUrl: `${APP_URL}/api/schedule/${svc.id}/pdf`,
        };

        const displayName = (nm: string | null, u: UserRef) => u?.name || (nm && nm !== 'TBD' ? nm : 'TBD');
        const lineup: LineupEntry[] = [];

        const speakerChannels = await notifyUser(svc.speaker, 'Speaker (Word Minister)', info, days);
        lineup.push({ role: 'Speaker', name: displayName(svc.speakerName, svc.speaker), channels: speakerChannels });

        const coordChannels = await notifyUser(svc.serviceCoordinator, 'Service Coordinator', info, days);
        lineup.push({ role: 'Service Coordinator', name: displayName(svc.serviceCoordinatorName, svc.serviceCoordinator), channels: coordChannels });

        const prayerChannels = await notifyUser(svc.propheticPrayer, 'Prophetic Prayer Minister', info, days);
        lineup.push({ role: 'Prophetic Prayer', name: displayName(svc.propheticPrayerName, svc.propheticPrayer), channels: prayerChannels });

        const worshipChannels = await notifyUser(svc.worshipLeader, 'Worship Leader', info, days);
        lineup.push({ role: 'Worship Leader', name: displayName(svc.worshipLeaderName, svc.worshipLeader), channels: worshipChannels });

        // 7-day interval → send the lineup summary to designated leaders
        if (days === 7) {
          try { await sendLeaderSummary(info, lineup); }
          catch (e) { console.error('[schedule-reminders] leader summary error', e); }
        }

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
