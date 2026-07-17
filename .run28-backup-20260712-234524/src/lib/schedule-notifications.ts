/**
 * schedule-notifications.ts
 * Sends immediate email + WhatsApp when a user is assigned a service role.
 * Replicates the Resend/Whapi patterns from notifications.ts.
 */

const CHURCH_NAME = 'Grace Life Center';

// ── Low-level helpers (mirror notifications.ts) ─────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey   = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName  = process.env.RESEND_FROM_NAME || CHURCH_NAME;
  if (!apiKey || !fromEmail) { console.warn('[schedule-notify] Resend not configured'); return; }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [to], subject, html }),
    });
    if (!res.ok) {
      const d = await res.json();
      console.error('[schedule-notify] Resend error:', d.message);
    }
  } catch (e: any) {
    console.error('[schedule-notify] email exception:', e.message);
  }
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const apiUrl = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';
  const token  = process.env.WHAPI_TOKEN;
  if (!token) { console.warn('[schedule-notify] Whapi not configured'); return; }

  const cleanNumber = phone.replace(/^whatsapp:/, '').replace(/[^0-9]/g, '');
  try {
    const res = await fetch(`${apiUrl}/messages/text?token=${token}`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ to: cleanNumber, body: message }),
    });
    if (!res.ok) {
      const d = await res.json();
      console.error('[schedule-notify] Whapi error:', d.message || d.error);
    }
  } catch (e: any) {
    console.error('[schedule-notify] WhatsApp exception:', e.message);
  }
}

// ── Role assignment notification ─────────────────────────────────────────────

export interface RoleAssignmentParams {
  userName:  string;
  userEmail: string | null;
  userPhone: string | null;
  role:      string;
  date:      Date;
  topic:     string;
  monthTheme: string | null;
  scheduleId: string;
  orderOfService?: any[] | null;
}

function buildRoleEmailHtml(p: RoleAssignmentParams): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const dateStr = p.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  const scriptureMatch = p.topic.match(/\(([^)]+)\)\s*$/);
  const scripture = scriptureMatch?.[1] || null;
  const title     = scripture ? p.topic.replace(/\s*\([^)]+\)\s*$/, '') : p.topic;

  return `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#102a43;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">⛪ ${CHURCH_NAME}</h1>
        <p style="margin:6px 0 0;opacity:0.75;font-size:14px;">Service Role Assignment</p>
      </div>
      <div style="border:1px solid #d9e2ec;border-top:none;padding:24px;border-radius:0 0 8px 8px;background:#fff;">
        <p style="font-size:16px;">Hello <strong>${p.userName}</strong>,</p>
        <p>You have been assigned a service role for the upcoming Sunday service:</p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f7f9fc;border-radius:8px;">
          <tr>
            <td style="padding:10px 14px;color:#627d98;width:140px;font-size:14px;">📅 Date</td>
            <td style="padding:10px 14px;font-weight:bold;font-size:15px;">${dateStr}</td>
          </tr>
          <tr style="border-top:1px solid #e4eaf0;">
            <td style="padding:10px 14px;color:#627d98;font-size:14px;">🎭 Your Role</td>
            <td style="padding:10px 14px;font-weight:bold;color:#d57d2a;font-size:15px;">${p.role}</td>
          </tr>
          <tr style="border-top:1px solid #e4eaf0;">
            <td style="padding:10px 14px;color:#627d98;font-size:14px;">📖 Topic</td>
            <td style="padding:10px 14px;font-size:14px;font-style:italic;">${title}</td>
          </tr>
          ${scripture ? `
          <tr style="border-top:1px solid #e4eaf0;">
            <td style="padding:10px 14px;color:#627d98;font-size:14px;">📜 Scripture</td>
            <td style="padding:10px 14px;font-size:14px;color:#5a3e8a;">${scripture}</td>
          </tr>` : ''}
          ${p.monthTheme ? `
          <tr style="border-top:1px solid #e4eaf0;">
            <td style="padding:10px 14px;color:#627d98;font-size:14px;">🗓️ Theme</td>
            <td style="padding:10px 14px;font-size:13px;color:#555;">${p.monthTheme.replace(/^[A-Z]+ THEME:\s*/i,'')}</td>
          </tr>` : ''}
        </table>

        <p style="font-size:14px;color:#486581;margin:16px 0;">
          This service has also been added to your <strong>My Calendar</strong> in the church app.
        </p>

        ${appUrl ? `<a href="${appUrl}/dashboard/schedule" style="display:inline-block;background:#d57d2a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:4px;">
          View Full Schedule →
        </a>` : ''}

        ${p.orderOfService && p.orderOfService.length ? renderOrderOfServiceHtml(p.orderOfService) : ''}

        <p style="margin-top:24px;color:#829ab1;font-size:13px;">
          Please prepare accordingly. God bless your service!<br/>
          — ${CHURCH_NAME} Team
        </p>
      </div>
    </div>`;
}

function buildRoleWhatsAppMessage(p: RoleAssignmentParams): string {
  const dateStr = p.date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const scriptureMatch = p.topic.match(/\(([^)]+)\)\s*$/);
  const scripture = scriptureMatch?.[1] || null;
  const title     = scripture ? p.topic.replace(/\s*\([^)]+\)\s*$/, '') : p.topic;

  let msg =
    `⛪ *${CHURCH_NAME} — Service Role Assignment*\n\n` +
    `Hello ${p.userName}! You've been assigned a role for Sunday:\n\n` +
    `📅 *${dateStr}*\n` +
    `🎭 Role: *${p.role}*\n` +
    `📖 Topic: _${title}_`;
  if (scripture) msg += `\n📜 ${scripture}`;
  if (p.monthTheme) msg += `\n🗓️ ${p.monthTheme.replace(/^[A-Z]+ THEME:\s*/i,'')}`;
  msg += `\n\n✅ This has been added to your calendar.\n`;
  if (appUrl) msg += `👉 ${appUrl}/dashboard/schedule`;
  if (p.orderOfService && p.orderOfService.length) msg += `\n\n` + renderOrderOfServiceWhatsApp(p.orderOfService as any);
  return msg;
}

export async function notifyServiceRoleAssignment(p: RoleAssignmentParams): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (p.userEmail) {
    const dateStr = p.date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
    });
    tasks.push(sendEmail(
      p.userEmail,
      `⛪ Service Role Assigned: ${p.role} — ${dateStr}`,
      buildRoleEmailHtml(p)
    ));
  }

  if (p.userPhone) {
    tasks.push(sendWhatsApp(p.userPhone, buildRoleWhatsAppMessage(p)));
  }

  await Promise.allSettled(tasks);
}


// ——— Run 2: Order of Service helpers ———
type OoSItem = { type: 'section' | 'item'; time?: string; title: string; person?: string; durationMin?: number; notes?: string };

export function renderOrderOfServiceHtml(items: OoSItem[] | null | undefined): string {
  if (!items || items.length === 0) return '';
  const rows = items.map(it => {
    if (it.type === 'section') {
      return `<tr><td colspan="4" style="background:#f3efe7;padding:8px;font-weight:700;">${escapeHtml(it.title)}</td></tr>`;
    }
    const mainRow = `<tr>
      <td style="padding:6px;${it.notes ? '' : 'border-bottom:1px solid #eee;'}">${escapeHtml(it.time ?? '')}</td>
      <td style="padding:6px;${it.notes ? '' : 'border-bottom:1px solid #eee;'}">${escapeHtml(it.title)}</td>
      <td style="padding:6px;${it.notes ? '' : 'border-bottom:1px solid #eee;'}">${escapeHtml(it.person ?? '')}</td>
      <td style="padding:6px;text-align:right;${it.notes ? '' : 'border-bottom:1px solid #eee;'}">${it.durationMin ? it.durationMin + ' min' : ''}</td>
    </tr>`;
    const notesRow = it.notes ? `<tr><td colspan="4" style="padding:4px 12px 8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#627d98;font-style:italic;">${escapeHtml(it.notes)}</td></tr>` : '';
    return mainRow + notesRow;
  }).join('');
  return `<h3>Order of Service</h3><table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>`;
}

export function renderOrderOfServiceWhatsApp(items: OoSItem[] | null | undefined, maxLen = 1500): string {
  if (!items || items.length === 0) return '';
  const lines: string[] = ['*Order of Service*'];
  for (const it of items) {
    if (it.type === 'section') lines.push(`\n*${it.title}*`);
    else {
      lines.push(`• ${it.time ? it.time + ' — ' : ''}${it.title}${it.person ? ' (' + it.person + ')' : ''}`);
      if (it.notes) lines.push(`   _${it.notes}_`);
    }
  }
  let out = lines.join('\n');
  if (out.length > maxLen) out = out.slice(0, maxLen - 3) + '...';
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
