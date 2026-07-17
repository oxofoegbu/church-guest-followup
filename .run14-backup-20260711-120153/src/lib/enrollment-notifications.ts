// Run 13 — notifications for the self-enrollment flow.
// Reuses the low-level Resend/Whapi senders and the same notify_emails /
// notify_whatsapp recipient settings as new-guest alerts. All senders are
// fire-safe: failures are logged, never thrown, so API flows are not blocked.

import prisma from './db';
import { sendEmailViaResend, sendWhatsAppViaWhapi } from './notifications';

type RequestInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  trackName: string;
  cohortName?: string | null;
  cohortMeeting?: string | null; // e.g. "Sundays at 18:00"
};

async function getChurchName(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'church_name' } });
  return setting?.value || 'Grace Life Center';
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- New request: alert the configured admin recipients -------------------
export async function notifyAdminsOfEnrollmentRequest(info: RequestInfo): Promise<void> {
  try {
    const churchName = await getChurchName();
    const emailSetting = await prisma.appSetting.findUnique({ where: { key: 'notify_emails' } });
    const emails = emailSetting?.value ? emailSetting.value.split(',').map(e => e.trim()).filter(Boolean) : [];
    const waSetting = await prisma.appSetting.findUnique({ where: { key: 'notify_whatsapp' } });
    const numbers = waSetting?.value ? waSetting.value.split(',').map(n => n.trim()).filter(Boolean) : [];

    const fullName = `${info.firstName} ${info.lastName}`;
    const reviewUrl = `${appUrl()}/dashboard/tracks/requests`;
    const cohortLine = info.cohortName ? ` (${info.cohortName})` : '';

    const subject = `New enrollment request: ${fullName} \u2192 ${info.trackName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px;">
        <h2 style="color:#1f2937;">New enrollment request</h2>
        <p><strong>${esc(fullName)}</strong> (${esc(info.email)}${info.phone ? `, ${esc(info.phone)}` : ''})
        has requested to join <strong>${esc(info.trackName)}</strong>${esc(cohortLine)}.</p>
        <p><a href="${reviewUrl}" style="background:#b45309;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Review requests</a></p>
        <p style="color:#6b7280;font-size:13px;">${esc(churchName)} \u2014 Harvest</p>
      </div>`;
    const waText = `\uD83D\uDCE5 New enrollment request: ${fullName} \u2192 ${info.trackName}${cohortLine}. Review: ${reviewUrl}`;

    const tasks: Promise<unknown>[] = [];
    for (const to of emails) tasks.push(sendEmailViaResend(to, subject, html));
    for (const num of numbers) tasks.push(sendWhatsAppViaWhapi(num, waText));
    await Promise.allSettled(tasks);
  } catch (err) {
    console.error('notifyAdminsOfEnrollmentRequest failed:', err);
  }
}

// --- Approved: welcome the participant -------------------------------------
export async function sendEnrollmentApprovedNotification(params: RequestInfo & {
  portalToken: string;
  newAccount?: { email: string; tempPassword: string } | null;
}): Promise<void> {
  try {
    const churchName = await getChurchName();
    const base = appUrl();
    const portalUrl = `${base}/track/${params.portalToken}`;
    const cohortHtml = params.cohortName
      ? `<p>Your group: <strong>${esc(params.cohortName)}</strong>${params.cohortMeeting ? ` \u2014 ${esc(params.cohortMeeting)}` : ''}</p>`
      : '';

    const accountHtml = params.newAccount
      ? `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>Your Harvest account</strong></p>
          <p style="margin:0;">Sign in at <a href="${base}">${base}</a></p>
          <p style="margin:6px 0 0;">Email: <strong>${esc(params.newAccount.email)}</strong><br/>
          Temporary password: <strong>${esc(params.newAccount.tempPassword)}</strong></p>
          <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">You will be asked to choose your own password the first time you sign in.</p>
        </div>`
      : `<p>You can also follow your journey under <a href="${base}/dashboard/my-tracks">My Tracks</a> when signed in.</p>`;

    const subject = `Welcome to ${params.trackName} \u2014 ${churchName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px;">
        <h2 style="color:#1f2937;">You're enrolled, ${esc(params.firstName)}! \uD83C\uDF89</h2>
        <p>Your enrollment in <strong>${esc(params.trackName)}</strong> at ${esc(churchName)} has been approved.
        We are so glad you are taking this step.</p>
        ${cohortHtml}
        <p><a href="${portalUrl}" style="background:#15803d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Open my journey page</a></p>
        ${accountHtml}
        <p style="color:#6b7280;font-size:13px;">Keep this email \u2014 the journey page link above is yours personally.</p>
      </div>`;
    await sendEmailViaResend(params.email, subject, html);

    if (params.phone) {
      const waText = `\uD83C\uDF89 ${params.firstName}, your enrollment in ${params.trackName} at ${churchName} has been approved! Your personal journey page: ${portalUrl}`;
      await sendWhatsAppViaWhapi(params.phone, waText);
    }
  } catch (err) {
    console.error('sendEnrollmentApprovedNotification failed:', err);
  }
}

// --- Rejected: brief courteous note ----------------------------------------
export async function sendEnrollmentRejectedEmail(params: RequestInfo): Promise<void> {
  try {
    const churchName = await getChurchName();
    const subject = `About your ${params.trackName} request \u2014 ${churchName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px;">
        <p>Hi ${esc(params.firstName)},</p>
        <p>Thank you for your interest in <strong>${esc(params.trackName)}</strong> at ${esc(churchName)}.
        We are not able to complete your enrollment right now. Please speak with a pastor or leader
        at church \u2014 we would love to help you find the right next step.</p>
        <p style="color:#6b7280;font-size:13px;">${esc(churchName)}</p>
      </div>`;
    await sendEmailViaResend(params.email, subject, html);
  } catch (err) {
    console.error('sendEnrollmentRejectedEmail failed:', err);
  }
}
