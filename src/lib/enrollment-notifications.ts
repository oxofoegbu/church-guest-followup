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
  // Run 19 -- Welcome Track "Begin" page extras
  audienceLabel?: string | null; // "Which best describes you?" answer
  shareNote?: string | null;     // "anything you'd like us to know -- or pray about"
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

// --- Run 14: email OTP -------------------------------------------------------
// Unlike the other senders in this file, this one is flow-critical (without
// the code the person cannot verify), so it reports success/failure.
export async function sendEnrollmentVerificationEmail(params: {
  firstName: string;
  email: string;
  trackName: string;
  code: string;
}): Promise<boolean> {
  try {
    const churchName = await getChurchName();
    const subject = `${params.code} is your verification code \u2014 ${churchName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px;">
        <p>Hi ${esc(params.firstName)},</p>
        <p>Use this code to confirm your email and complete your <strong>${esc(params.trackName)}</strong> enrollment request:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#1f2937;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 24px;text-align:center;">${esc(params.code)}</p>
        <p style="color:#6b7280;font-size:13px;">The code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:13px;">${esc(churchName)}</p>
      </div>`;
    const result = await sendEmailViaResend(params.email, subject, html);
    if (result.error) {
      console.error('sendEnrollmentVerificationEmail failed:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendEnrollmentVerificationEmail failed:', err);
    return false;
  }
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
        ${info.audienceLabel ? `<p style="margin:4px 0;color:#374151;">They describe themselves as: <em>${esc(info.audienceLabel)}</em></p>` : ''}
        ${info.shareNote ? `<div style="background:#f9fafb;border-left:3px solid #b45309;padding:10px 14px;margin:12px 0;color:#374151;"><p style="margin:0;font-size:13px;color:#6b7280;">They shared:</p><p style="margin:4px 0 0;">${esc(info.shareNote)}</p></div>` : ''}
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
  // Run 19: Welcome Track participants are Guests -- no Harvest account, no
  // dashboard links, warmer wording, and email only (Whapi stays parked).
  guestParticipant?: boolean;
}): Promise<void> {
  try {
    const churchName = await getChurchName();
    const base = appUrl();
    const portalUrl = `${base}/track/${params.portalToken}`;

    if (params.guestParticipant) {
      const subject = `You're in, ${params.firstName} \u2014 welcome to the ${params.trackName}`;
      const html = `
        <div style="font-family: Georgia, serif; max-width: 560px; color:#2A2622;">
          <h2 style="color:#1F3A5F;font-weight:normal;">We're so glad you're coming, ${esc(params.firstName)}.</h2>
          <p>Your place in the <strong>${esc(params.trackName)}</strong> at ${esc(churchName)} is saved.</p>
          ${params.cohortName ? `<p>Your group: <strong>${esc(params.cohortName)}</strong>${params.cohortMeeting ? ` \u2014 ${esc(params.cohortMeeting)}` : ''}</p>` : ''}
          <p>This link below is your own personal journey page \u2014 the five modules live there,
          and you can read and respond at your own pace. Keep this email so you can always find it.</p>
          <p style="margin:20px 0;"><a href="${portalUrl}" style="background:#1F3A5F;color:#FBF7EF;padding:12px 22px;border-radius:8px;text-decoration:none;">Open my journey page</a></p>
          <p>There's nothing you need to prepare and nothing you need to be. Just come as you are \u2014
          a real person from our family will walk with you from here.</p>
          <p style="color:#6b7280;font-size:13px;">${esc(churchName)} \u2014 a people learning to be with Jesus.</p>
        </div>`;
      await sendEmailViaResend(params.email, subject, html);
      return;
    }
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

// --- Run 19: discipler assignment ------------------------------------------
// Emails a discipler when they are assigned to an enrollment (admin enroll
// modal, edit modal, or self-enrollment approval). Fire-safe and email only
// (Whapi is parked). Callers are responsible for only firing on set/changed.
export async function sendDisciplerAssignedEmail(params: {
  disciplerName: string;
  disciplerEmail: string;
  participantName: string;
  trackName: string;
}): Promise<void> {
  try {
    const churchName = await getChurchName();
    const myDisciplesUrl = `${appUrl()}/dashboard/my-disciples`;
    const subject = `You have a new disciple: ${params.participantName} \u2014 ${params.trackName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px;">
        <h2 style="color:#1f2937;">\uD83E\uDD1D A new disciple has been entrusted to you</h2>
        <p>Hi ${esc(params.disciplerName)},</p>
        <p><strong>${esc(params.participantName)}</strong> has been enrolled in
        <strong>${esc(params.trackName)}</strong> and you have been assigned as their discipler.</p>
        <p>You can follow their journey \u2014 their reflections module by module \u2014 and leave
        an encouraging comment on each module under My Disciples:</p>
        <p style="margin:18px 0;"><a href="${myDisciplesUrl}" style="background:#15803d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Open My Disciples</a></p>
        <p style="color:#6b7280;font-size:13px;">${esc(churchName)} \u2014 Harvest</p>
      </div>`;
    await sendEmailViaResend(params.disciplerEmail, subject, html);
  } catch (err) {
    console.error('sendDisciplerAssignedEmail failed:', err);
  }
}
