import prisma from './db';

interface NotifyVolunteerParams {
  volunteerId: string;
  volunteerName: string;
  volunteerEmail: string;
  volunteerPhone: string | null;
  guestId: string;
  guestName: string;
  guestPhone: string | null;
  firstVisitDate: string;
  serviceAttended: string | null;
  preferredContact: string;
  guestLink: string;
}

// Default templates (can be overridden via env)
const DEFAULT_WHATSAPP_TEMPLATE =
  'New guest assigned: {GuestName}. Phone: {GuestPhone}. First visit: {FirstVisitDate} ({ServiceAttended}). Preferred contact: {PreferredContact}. Open: {GuestLink}';

const DEFAULT_EMAIL_SUBJECT = 'New Guest Assigned: {GuestName}';

function fillTemplate(template: string, params: NotifyVolunteerParams): string {
  return template
    .replace(/{GuestName}/g, params.guestName)
    .replace(/{GuestPhone}/g, params.guestPhone || 'N/A')
    .replace(/{FirstVisitDate}/g, params.firstVisitDate)
    .replace(/{ServiceAttended}/g, params.serviceAttended || 'N/A')
    .replace(/{PreferredContact}/g, params.preferredContact)
    .replace(/{GuestLink}/g, params.guestLink)
    .replace(/{VolunteerName}/g, params.volunteerName);
}

function buildEmailHtml(params: NotifyVolunteerParams): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #102a43; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">✝️ New Guest Assigned</h1>
      </div>
      <div style="border: 1px solid #d9e2ec; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hello <strong>${params.volunteerName}</strong>,</p>
        <p>A new guest has been assigned to you for follow-up:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #627d98; width: 140px;">Guest Name</td><td style="padding: 8px 0; font-weight: bold;">${params.guestName}</td></tr>
          <tr><td style="padding: 8px 0; color: #627d98;">Phone</td><td style="padding: 8px 0;">${params.guestPhone || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; color: #627d98;">First Visit</td><td style="padding: 8px 0;">${params.firstVisitDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #627d98;">Service</td><td style="padding: 8px 0;">${params.serviceAttended || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; color: #627d98;">Preferred Contact</td><td style="padding: 8px 0;">${params.preferredContact}</td></tr>
        </table>
        <a href="${params.guestLink}" style="display: inline-block; background: #d57d2a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 8px;">
          View Guest Details →
        </a>
        <p style="margin-top: 24px; color: #829ab1; font-size: 14px;">
          Please reach out to this guest within 48 hours. God bless!
        </p>
      </div>
    </div>
  `;
}

export async function sendWhatsAppNotification(params: NotifyVolunteerParams): Promise<void> {
  const template = process.env.WHATSAPP_TEMPLATE || DEFAULT_WHATSAPP_TEMPLATE;
  const body = fillTemplate(template, params);

  const logEntry = await prisma.notificationLog.create({
    data: {
      guestId: params.guestId,
      toUserId: params.volunteerId,
      channel: 'WHATSAPP',
      status: 'QUEUED',
      payloadSnapshot: JSON.stringify({ body, to: params.volunteerPhone }),
    },
  });

  if (!params.volunteerPhone) {
    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: { status: 'FAILED', errorMessage: 'Volunteer has no phone number' },
    });
    return;
  }

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const twilio = require('twilio')(accountSid, authToken);
    const toWhatsApp = params.volunteerPhone.startsWith('whatsapp:')
      ? params.volunteerPhone
      : `whatsapp:${params.volunteerPhone}`;

    const message = await twilio.messages.create({
      body,
      from: fromNumber,
      to: toWhatsApp,
    });

    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: { status: 'SENT', providerMessageId: message.sid },
    });
  } catch (error: any) {
    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: { status: 'FAILED', errorMessage: error.message?.slice(0, 500) },
    });
    console.error('WhatsApp notification failed:', error.message);
  }
}

export async function sendEmailNotification(params: NotifyVolunteerParams): Promise<void> {
  const subjectTemplate = process.env.EMAIL_SUBJECT_TEMPLATE || DEFAULT_EMAIL_SUBJECT;
  const subject = fillTemplate(subjectTemplate, params);
  const html = buildEmailHtml(params);

  const logEntry = await prisma.notificationLog.create({
    data: {
      guestId: params.guestId,
      toUserId: params.volunteerId,
      channel: 'EMAIL',
      status: 'QUEUED',
      payloadSnapshot: JSON.stringify({ subject, to: params.volunteerEmail }),
    },
  });

  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME || 'Church Guest Follow-Up';

    if (!apiKey || !fromEmail) {
      throw new Error('SendGrid credentials not configured');
    }

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(apiKey);

    const [response] = await sgMail.send({
      to: params.volunteerEmail,
      from: { email: fromEmail, name: fromName },
      subject,
      html,
    });

    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: {
        status: 'SENT',
        providerMessageId: response?.headers?.['x-message-id'] || null,
      },
    });
  } catch (error: any) {
    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: { status: 'FAILED', errorMessage: error.message?.slice(0, 500) },
    });
    console.error('Email notification failed:', error.message);
  }
}

export async function notifyVolunteerAssignment(params: NotifyVolunteerParams): Promise<void> {
  // Check if assignment notifications are enabled
  const setting = await prisma.appSetting.findUnique({ where: { key: 'notify_on_assignment' } });
  if (setting?.value === 'false') return;

  // Fire both in parallel
  await Promise.allSettled([
    sendEmailNotification(params),
    sendWhatsAppNotification(params),
  ]);
}

// ==========================================
// NEW GUEST FORM SUBMISSION NOTIFICATIONS
// ==========================================

interface GuestInfo {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  serviceAttended: string | null;
  firstVisitDate: string;
  preferredContactMethod: string;
  prayerRequest: string | null;
}

function buildNewGuestEmailHtml(guest: GuestInfo): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #102a43; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">🆕 New Guest Card Submitted</h1>
      </div>
      <div style="border: 1px solid #d9e2ec; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>A new guest has submitted their information through the guest form:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #627d98; width: 160px;">Name</td><td style="padding: 8px 0; font-weight: bold;">${guest.firstName} ${guest.lastName}</td></tr>
          <tr><td style="padding: 8px 0; color: #627d98;">Phone</td><td style="padding: 8px 0;">${guest.phone || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; color: #627d98;">Email</td><td style="padding: 8px 0;">${guest.email || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; color: #627d98;">First Visit</td><td style="padding: 8px 0;">${guest.firstVisitDate}</td></tr>
          <tr><td style="padding: 8px 0; color: #627d98;">Service</td><td style="padding: 8px 0;">${guest.serviceAttended || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 0; color: #627d98;">Preferred Contact</td><td style="padding: 8px 0;">${guest.preferredContactMethod}</td></tr>
          ${guest.prayerRequest ? `<tr><td style="padding: 8px 0; color: #627d98;">Prayer Request</td><td style="padding: 8px 0;">${guest.prayerRequest}</td></tr>` : ''}
        </table>
        ${appUrl ? `<a href="${appUrl}/dashboard/guests/${guest.id}" style="display: inline-block; background: #d57d2a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 8px;">View in Dashboard →</a>` : ''}
        <p style="margin-top: 24px; color: #829ab1; font-size: 14px;">
          Please assign this guest to a volunteer for follow-up.
        </p>
      </div>
    </div>
  `;
}

function buildNewGuestWhatsAppMessage(guest: GuestInfo): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  let msg = `🆕 *New Guest Card*\n\nName: ${guest.firstName} ${guest.lastName}\nPhone: ${guest.phone || 'N/A'}\nService: ${guest.serviceAttended || 'N/A'}\nFirst Visit: ${guest.firstVisitDate}\nPreferred Contact: ${guest.preferredContactMethod}`;
  if (guest.prayerRequest) {
    msg += `\nPrayer Request: ${guest.prayerRequest}`;
  }
  if (appUrl) {
    msg += `\n\nView: ${appUrl}/dashboard/guests/${guest.id}`;
  }
  return msg;
}

async function sendNewGuestEmails(guest: GuestInfo, emails: string[]): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'Church Guest Follow-Up';

  if (!apiKey || !fromEmail) {
    console.error('SendGrid credentials not configured');
    return;
  }

  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(apiKey);
  const html = buildNewGuestEmailHtml(guest);
  const subject = `New Guest: ${guest.firstName} ${guest.lastName}`;

  for (const email of emails) {
    const trimmed = email.trim();
    if (!trimmed) continue;
    try {
      await sgMail.send({
        to: trimmed,
        from: { email: fromEmail, name: fromName },
        subject,
        html,
      });
      console.log(`New guest email sent to ${trimmed}`);
    } catch (error: any) {
      console.error(`New guest email failed to ${trimmed}:`, error.message);
    }
  }
}

async function sendNewGuestWhatsApp(guest: GuestInfo, numbers: string[]): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Twilio credentials not configured');
    return;
  }

  const twilio = require('twilio')(accountSid, authToken);
  const body = buildNewGuestWhatsAppMessage(guest);

  for (const number of numbers) {
    const trimmed = number.trim();
    if (!trimmed) continue;
    const toWhatsApp = trimmed.startsWith('whatsapp:') ? trimmed : `whatsapp:${trimmed}`;
    try {
      await twilio.messages.create({ body, from: fromNumber, to: toWhatsApp });
      console.log(`New guest WhatsApp sent to ${trimmed}`);
    } catch (error: any) {
      console.error(`New guest WhatsApp failed to ${trimmed}:`, error.message);
    }
  }
}

export async function notifyNewGuestSubmission(guest: GuestInfo): Promise<void> {
  // Check if new guest notifications are enabled
  const enabledSetting = await prisma.appSetting.findUnique({ where: { key: 'notify_on_new_guest' } });
  if (enabledSetting?.value === 'false') return;

  // Get email recipients
  const emailSetting = await prisma.appSetting.findUnique({ where: { key: 'notify_emails' } });
  const emails = emailSetting?.value ? emailSetting.value.split(',').map(e => e.trim()).filter(Boolean) : [];

  // Get WhatsApp recipients
  const whatsappSetting = await prisma.appSetting.findUnique({ where: { key: 'notify_whatsapp' } });
  const numbers = whatsappSetting?.value ? whatsappSetting.value.split(',').map(n => n.trim()).filter(Boolean) : [];

  // Fire all in parallel
  const tasks: Promise<void>[] = [];
  if (emails.length > 0) tasks.push(sendNewGuestEmails(guest, emails));
  if (numbers.length > 0) tasks.push(sendNewGuestWhatsApp(guest, numbers));

  await Promise.allSettled(tasks);
}
