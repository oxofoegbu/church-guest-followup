/**
 * drip-sender.ts  (Run 5)
 * ---------------------------------------------------------------------------
 * Mustache rendering + Resend/Whapi senders for the daily drip executor.
 *
 * Patterns mirrored from src/lib/notifications.ts and src/lib/schedule-
 * notifications.ts (same Resend + Whapi client shapes, same env vars).
 *
 * Run 5 intentionally does NOT write to NotificationLog. The existing
 * NotificationLog.toUserId is non-nullable and drip messages go to guests
 * (not Users), so the row has no sensible recipient. Traceability lives in
 * GuestDripStep (status, sentAt, errorMessage) + AuditLog (DRIP_STEP_SENT /
 * DRIP_STEP_FAILED). Run 6 will revisit — either adding a purpose-built
 * DripSendLog model or making NotificationLog.toUserId nullable + adding a
 * guestDripStepId FK. See Pitfall #45 precedent: notifyNewGuestSubmission
 * already bypasses NotificationLog for the same reason.
 * ---------------------------------------------------------------------------
 */

const CHURCH_NAME = 'Grace Life Center';

// ── Mustache rendering ──────────────────────────────────────────────────────
// Unknown vars render as empty string rather than throwing (a typo in a
// template must never break the whole cron run).

export type MustacheVars = Record<string, string>;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Replaces {{key}} placeholders in a template.
 * - `escape: 'html'` → values are HTML-escaped (for email bodies).
 * - `escape: 'none'` → values are inserted verbatim (for WhatsApp plain text).
 * Unknown keys become empty string.
 */
export function renderMustache(
  template: string,
  vars: MustacheVars,
  opts: { escape: 'html' | 'none' } = { escape: 'none' }
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const raw = vars[key];
    if (raw == null) return '';
    return opts.escape === 'html' ? escapeHtml(raw) : raw;
  });
}

// ── Email body shell (minimal; visually consistent with existing emails) ────

export function buildDripEmailHtml(opts: {
  subject: string;
  renderedBody: string; // HTML-safe: already mustache-rendered with escape:'html'
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  // Convert simple newlines in the rendered body to <br/> so template authors
  // can write plain-text bodies and get reasonable email formatting.
  const bodyHtml = opts.renderedBody
    .split(/\n\n+/)
    .map((para) => `<p style="margin:0 0 14px;font-size:15px;color:#334155;line-height:1.55;">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#102a43;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">⛪ ${CHURCH_NAME}</h1>
      </div>
      <div style="border:1px solid #d9e2ec;border-top:none;padding:24px;border-radius:0 0 8px 8px;background:#fff;">
        ${bodyHtml}
        ${appUrl ? `<p style="margin-top:24px;font-size:12px;color:#9ca3af;">${CHURCH_NAME} · <a href="${appUrl}" style="color:#9ca3af;">${appUrl}</a></p>` : ''}
      </div>
    </div>`;
}

// ── Resend email sender ─────────────────────────────────────────────────────

export async function sendDripEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName = process.env.RESEND_FROM_NAME || CHURCH_NAME;

  if (!apiKey || !fromEmail) {
    return { error: 'Resend credentials not configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.message || `Resend error: ${res.status}` };
    }
    return { id: data.id };
  } catch (e: any) {
    return { error: e?.message || 'Resend exception' };
  }
}

// ── Whapi WhatsApp sender ───────────────────────────────────────────────────

export async function sendDripWhatsApp(opts: {
  toPhone: string;
  body: string;
}): Promise<{ id?: string; error?: string }> {
  const apiUrl = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';
  const token = process.env.WHAPI_TOKEN;

  if (!token) {
    return { error: 'Whapi token not configured' };
  }

  const cleanNumber = opts.toPhone.replace(/^whatsapp:/, '').replace(/[^0-9]/g, '');
  if (!cleanNumber) {
    return { error: 'Phone number empty after normalization' };
  }

  try {
    const res = await fetch(`${apiUrl}/messages/text?token=${token}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: cleanNumber,
        body: opts.body,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.message || data.error || `Whapi error: ${res.status}` };
    }
    return { id: data.message?.id || data.id || data.sent?.id || 'sent' };
  } catch (e: any) {
    return { error: e?.message || 'Whapi exception' };
  }
}

// ── Var resolution ──────────────────────────────────────────────────────────
// Centralized so the executor and any future manual-send UI use the same
// source of truth. Run 6 can move `churchName` to AppSetting; for now it is
// a constant.

export function resolveDripVars(args: {
  guestFirstName: string;
  assignedVolunteerName: string | null;
}): MustacheVars {
  return {
    firstName: args.guestFirstName,
    churchName: CHURCH_NAME,
    volunteerName: args.assignedVolunteerName || 'your Grace Life Center family',
  };
}
