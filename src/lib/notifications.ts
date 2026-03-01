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
  // Fire both in parallel
  await Promise.allSettled([
    sendEmailNotification(params),
    sendWhatsAppNotification(params),
  ]);
}
