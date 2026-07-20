// src/lib/whatsapp.ts
// WhatsApp Cloud API (direct to Meta) sender. Replaces all Whapi call sites.
// Fire-safe: every function LOGS and returns { error } instead of throwing,
// so a WhatsApp failure never blocks the surrounding flow. Email is the backbone.

const GRAPH_VERSION = 'v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;

// Each approved template + the EXACT language code Meta has on file.
// (guest_assignment + role_assignment were created as "English" = en;
//  the guest-card alert as "English (US)" = en_US. The send code MUST match
//  the template's language or Meta returns 132001 "template does not exist".)
//
// Run 61 — day2FollowUp/day4PastorCheckin/day11InviteBack replace the dead
// Whapi path for drip WhatsApp. Day 13's drip step reuses day4PastorCheckin
// (identical approved content, submitted once) rather than getting its own
// Meta template. lang is 'en' as a placeholder matching the other three —
// if Meta assigns something else during approval, update the lang here,
// nothing else needs to change.
//
// Run 62 — day4PastorCheckin's real Meta name is day4_pastor_checkingin,
// not day4_pastor_checkin. Meta rejected the original as Utility (bumped
// it to Marketing, as flagged during Run 61 scoping); Okezie deleted that
// submission and resubmitted under a new name, since Meta blocks reusing a
// deleted template's exact name right away. Category is Marketing on
// Meta's side now — no code-side effect, the send call is identical either
// way, this is purely which approved template it points at.
export const WA_TEMPLATES = {
  guestAssignment: { name: 'guest_assignment', lang: 'en' },
  newGuestAlert: { name: 'guest_card_submission_alert_kxmsydplrq', lang: 'en_US' },
  roleAssignment: { name: 'role_assignment', lang: 'en' },
  day2FollowUp: { name: 'day2_follow_up', lang: 'en' },
  day4PastorCheckin: { name: 'day4_pastor_checkingin', lang: 'en' },
  day11InviteBack: { name: 'day11_invite_back', lang: 'en' },
} as const;

export type WaTemplateKey = keyof typeof WA_TEMPLATES;

type WaTemplate = { name: string; lang: string };

// E.164 for Cloud API: country code + number, digits only (no +, no whatsapp:).
function normalizeNumber(raw: string): string {
  return raw.replace(/^whatsapp:/, '').replace(/[^0-9]/g, '');
}

export async function sendWhatsAppTemplate(
  to: string,
  template: WaTemplate,
  params: string[],
): Promise<{ id?: string; error?: string }> {
  if (!TOKEN || !PHONE_NUMBER_ID) return { error: 'WhatsApp Cloud API not configured' };

  const number = normalizeNumber(to);
  if (!number) return { error: 'No phone number' };

  const components: { type: string; parameters: { type: string; text: string }[] }[] =
    params.length > 0
      ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: text ?? '' })) }]
      : [];

  const body = {
    messaging_product: 'whatsapp',
    to: number,
    type: 'template',
    template: { name: template.name, language: { code: template.lang }, components },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify(body),
      },
    );
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      const msg = data?.error?.message || `WhatsApp error: ${res.status}`;
      console.error('[whatsapp] send failed:', msg);
      return { error: msg };
    }
    return { id: data?.messages?.[0]?.id || 'sent' };
  } catch (e: any) {
    console.error('[whatsapp] exception:', e?.message);
    return { error: e?.message || 'WhatsApp exception' };
  }
}
