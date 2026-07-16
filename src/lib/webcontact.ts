// Run 47 — Web Contacts: unified capture + email OTP for every public website
// form (Newsletter, Prayer, Contact, Plan a Visit, The Gathering). A submission
// is stored UNVERIFIED with a 6-digit code emailed to the sender; only after the
// code is confirmed does it become NEW and the team get notified — so bots and
// unverified junk never reach an inbox. Reuses the /enroll OTP primitives so
// there is one verification mechanism, not two.
import prisma from '@/lib/db';
import { generateOtpCode, hashOtpCode, OTP_TTL_MS } from '@/lib/enroll';
import { sendEmailViaResend, notifyNewGuestSubmission } from '@/lib/notifications';
import { auditGuestCreated } from '@/lib/audit';

export type WebContactType = 'NEWSLETTER' | 'PRAYER' | 'CONTACT' | 'VISIT' | 'GATHERING';

export const WEB_CONTACT_TYPES: WebContactType[] = ['NEWSLETTER', 'PRAYER', 'CONTACT', 'VISIT', 'GATHERING'];

export function webContactTypeLabel(type: string): string {
  switch (type) {
    case 'NEWSLETTER': return 'Newsletter';
    case 'PRAYER': return 'Prayer request';
    case 'CONTACT': return 'Contact message';
    case 'VISIT': return 'Plan a Visit';
    case 'GATHERING': return 'The Gathering';
    default: return type;
  }
}

function esc(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

const CHURCH = 'Grace Life Center';

// Flow-critical (like the enroll code email): reports success/failure so the
// caller can tell the sender if the code could not be delivered.
export async function sendWebContactVerificationEmail(params: {
  name?: string | null;
  email: string;
  code: string;
}): Promise<boolean> {
  try {
    const hi = params.name && params.name.trim() ? `Hi ${esc(params.name.trim())},` : 'Hi there,';
    const subject = `Your ${CHURCH} confirmation code: ${params.code}`;
    const html =
      `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto;color:#2A2622">` +
      `<p style="font-size:16px">${hi}</p>` +
      `<p style="font-size:16px">Please confirm it is really you by entering this code on the ${esc(CHURCH)} website:</p>` +
      `<p style="font-size:34px;font-weight:700;letter-spacing:6px;margin:20px 0;color:#A63D1F">${esc(params.code)}</p>` +
      `<p style="color:#6b7280;font-size:13px">The code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>` +
      `<p style="color:#6b7280;font-size:13px">${esc(CHURCH)}</p>` +
      `</div>`;
    const result: any = await sendEmailViaResend(params.email, subject, html);
    if (result && result.error) {
      console.error('sendWebContactVerificationEmail failed:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendWebContactVerificationEmail failed:', err);
    return false;
  }
}

export type CreatePendingInput = {
  type: WebContactType;
  name?: string | null;
  email: string;
  phone?: string | null;
  message?: string | null;
  meta?: Record<string, unknown> | null;
  source?: string | null;
};

// Creates an UNVERIFIED WebContact, emails a fresh code, returns { id, sent }.
export async function createPendingWebContact(input: CreatePendingInput): Promise<{ id: string; sent: boolean }> {
  const rec = await (prisma as any).webContact.create({
    data: {
      type: input.type,
      status: 'UNVERIFIED',
      name: input.name || null,
      email: input.email,
      phone: input.phone || null,
      message: input.message || null,
      meta: input.meta ?? undefined,
      source: input.source || 'website',
    },
  });
  const code = generateOtpCode();
  await (prisma as any).webContact.update({
    where: { id: rec.id },
    data: {
      verifyCodeHash: hashOtpCode(rec.id, code),
      verifyExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      verifySentAt: new Date(),
      verifyAttempts: 0,
    },
  });
  const sent = await sendWebContactVerificationEmail({ name: input.name, email: input.email, code });
  return { id: rec.id, sent };
}

function recipientsFrom(envVal: string | undefined, fallback: string): string[] {
  return (envVal || fallback).split(',').map((s) => s.trim()).filter(Boolean);
}

async function emailAll(to: string[], subject: string, html: string): Promise<void> {
  await Promise.all(to.map((addr) => (sendEmailViaResend(addr, subject, html) as Promise<any>).catch(() => ({}))));
}

// Type-specific side effects AFTER a contact verifies. Fire-safe: never throws
// (the record is already saved + verified; notification failures only log).
export async function finalizeWebContact(wc: any): Promise<void> {
  const meta = (wc && wc.meta ? wc.meta : {}) as Record<string, any>;
  const name = wc.name || 'Someone';
  const email = wc.email || '';
  try {
    if (wc.type === 'NEWSLETTER') {
      try {
        await (prisma as any).newsletterSubscriber.upsert({
          where: { email },
          update: { status: 'ACTIVE', unsubscribedAt: null, source: wc.source || 'teaching' },
          create: { email, source: wc.source || 'teaching' },
        });
      } catch (e) {
        console.error('[webcontact] newsletter persist failed (non-fatal):', e);
      }
      const subject = `New Watch & Read subscriber — gracelifecenter.com`;
      const html =
        `<p>A new person confirmed their email to hear when new teaching lands:</p>` +
        `<p style="font-size:16px"><strong>${esc(email)}</strong></p>` +
        `<hr><p style="color:#6A6157;font-size:13px">Add them to the teaching list.</p>`;
      await emailAll(recipientsFrom(process.env.NEWSLETTER_EMAIL, 'hello@gracelifecenter.com'), subject, html);
    } else if (wc.type === 'PRAYER') {
      const urgent = meta.urgent === true;
      const isPrivate = meta.private === true;
      const flags: string[] = [];
      if (urgent) flags.push('URGENT');
      if (isPrivate) flags.push('PRIVATE');
      const flagTag = flags.length ? `[${flags.join(' · ')}] ` : '';
      const subject = `${flagTag}Prayer request from ${name} — gracelifecenter.com`;
      const banner = urgent
        ? `<p style="background:#A63D1F;color:#fff;padding:8px 12px;border-radius:6px;font-weight:600">This request was marked <strong>urgent</strong> — someone asked to be reached out to.</p>`
        : '';
      const privacy = isPrivate
        ? `<p style="color:#8C6A38;font-size:13px"><strong>Keep confidential:</strong> the sender asked that this stay with the prayer team only.</p>`
        : '';
      const html =
        banner +
        `<p><strong>${esc(name)}</strong>${email ? ` &lt;${esc(email)}&gt;` : ''} asked for prayer:</p>` +
        `<p style="white-space:pre-wrap;font-size:16px">${esc(wc.message)}</p>` +
        `<hr>` + privacy +
        `<p style="color:#6A6157;font-size:13px">You can reach back out at ${esc(email)}.</p>`;
      await emailAll(recipientsFrom(process.env.PRAYER_EMAIL, 'prayforme@gracelifecenter.com'), subject, html);
    } else if (wc.type === 'CONTACT') {
      const subj = meta.subject ? String(meta.subject) : '';
      const topic = subj ? ` (${esc(subj)})` : '';
      const subject = `New message from ${name}${topic} — gracelifecenter.com`;
      const html =
        `<p><strong>${esc(name)}</strong> &lt;${esc(email)}&gt; wrote via the website${subj ? ` about &ldquo;${esc(subj)}&rdquo;` : ''}:</p>` +
        `<p style="white-space:pre-wrap">${esc(wc.message)}</p>` +
        `<hr><p style="color:#6A6157;font-size:13px">Reply directly to ${esc(email)}.</p>`;
      await emailAll(recipientsFrom(process.env.CONTACT_EMAIL, 'pastor@gracelifecenter.com'), subject, html);
    } else if (wc.type === 'GATHERING') {
      const interest = meta.interest === 'LAUNCH_TEAM' ? 'LAUNCH_TEAM' : 'GATHER';
      const label = interest === 'LAUNCH_TEAM' ? 'wants to join the launch team' : 'wants to be told when The Gathering launches';
      const tag = interest === 'LAUNCH_TEAM' ? '[Launch team] ' : '[Interest] ';
      const subject = `${tag}${name} — The Gathering`;
      const html =
        `<p><strong>${esc(name)}</strong> &lt;${esc(email)}&gt; ${label}.</p>` +
        (wc.message ? `<p style="white-space:pre-wrap">${esc(wc.message)}</p>` : '') +
        `<hr><p style="color:#6A6157;font-size:13px">Reply directly to ${esc(email)}.</p>`;
      await emailAll(recipientsFrom(process.env.GATHERING_EMAIL, 'thegathering@gracelifecenter.com'), subject, html);
    } else if (wc.type === 'VISIT') {
      await finalizeVisit(wc, meta);
    }
  } catch (err) {
    console.error('[webcontact] finalize failed (non-fatal):', err);
  }
}

// Plan a Visit becomes a real Guest in the Harvest CRM (same pipeline the
// in-service card uses): drip steps, audit log, and new-guest team alert.
async function finalizeVisit(wc: any, meta: Record<string, any>): Promise<void> {
  try {
    const guest = await prisma.guest.create({
      data: {
        firstName: String(meta.firstName || wc.name || 'Guest'),
        lastName: String(meta.lastName || ''),
        phone: wc.phone || null,
        email: wc.email || null,
        preferredContactMethod: 'CALL' as any,
        firstVisitDate: meta.firstVisitDate ? new Date(String(meta.firstVisitDate)) : null,
        serviceAttended: 'Sunday 10:00 AM',
        howHeardAboutUs: 'Plan a Visit (website)',
        prayerRequest: wc.message || null,
        status: 'NEW_GUEST',
      },
    });
    try {
      await (prisma as any).webContact.update({ where: { id: wc.id }, data: { guestId: guest.id } });
    } catch (linkErr) {
      console.error('[webcontact] link guest failed (non-fatal):', linkErr);
    }
    try {
      const { scheduleDripStepsForGuest } = await import('@/lib/drip-scheduler');
      await scheduleDripStepsForGuest(guest.id);
    } catch (dripErr) {
      console.error('Drip scheduling failed for visit guest', guest.id, dripErr);
    }
    auditGuestCreated(guest.id, `${guest.firstName} ${guest.lastName}`, 'website').catch(() => {});
    notifyNewGuestSubmission({
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone,
      email: guest.email,
      serviceAttended: guest.serviceAttended,
      firstVisitDate: guest.firstVisitDate ? new Date(guest.firstVisitDate).toLocaleDateString() : '',
      preferredContactMethod: 'CALL',
      prayerRequest: guest.prayerRequest,
    }).catch((err: unknown) => console.error('Visit guest notification error:', err));
  } catch (err) {
    console.error('[webcontact] visit guest creation failed:', err);
  }
}
