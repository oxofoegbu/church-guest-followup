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

// ==========================================
// RESEND EMAIL HELPER
// ==========================================

export async function sendEmailViaResend(to: string, subject: string, html: string): Promise<{ id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName = process.env.RESEND_FROM_NAME || 'Church Guest Follow-Up';

  if (!apiKey || !fromEmail) {
    return { error: 'Resend credentials not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || `Resend error: ${response.status}` };
    }

    return { id: data.id };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ==========================================
// WHATSAPP (via Whapi.cloud)
// ==========================================

export async function sendWhatsAppViaWhapi(to: string, message: string): Promise<{ id?: string; error?: string }> {
  const apiUrl = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';
  const token = process.env.WHAPI_TOKEN;

  if (!token) {
    return { error: 'Whapi token not configured' };
  }

  // Format number: remove + and any non-digits, ensure no whatsapp: prefix
  const cleanNumber = to.replace(/^whatsapp:/, '').replace(/[^0-9]/g, '');

  try {
    const response = await fetch(`${apiUrl}/messages/text?token=${token}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: cleanNumber,
        body: message,
      }),
    });

    const data = await response.json();
    console.log('Whapi response:', JSON.stringify(data));

    if (!response.ok) {
      return { error: data.message || data.error || `Whapi error: ${response.status}` };
    }

    return { id: data.message?.id || data.id || data.sent?.id || 'sent' };
  } catch (error: any) {
    return { error: error.message };
  }
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
    const result = await sendWhatsAppViaWhapi(params.volunteerPhone, body);

    if (result.error) {
      throw new Error(result.error);
    }

    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: { status: 'SENT', providerMessageId: result.id || null },
    });
  } catch (error: any) {
    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: { status: 'FAILED', errorMessage: error.message?.slice(0, 500) },
    });
    console.error('WhatsApp notification failed:', error.message);
  }
}

// ==========================================
// EMAIL NOTIFICATION (via Resend)
// ==========================================

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
    const result = await sendEmailViaResend(params.volunteerEmail, subject, html);

    if (result.error) {
      throw new Error(result.error);
    }

    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: { status: 'SENT', providerMessageId: result.id || null },
    });
  } catch (error: any) {
    await prisma.notificationLog.update({
      where: { id: logEntry.id },
      data: { status: 'FAILED', errorMessage: error.message?.slice(0, 500) },
    });
    console.error('Email notification failed:', error.message);
  }
}

// ==========================================
// VOLUNTEER ASSIGNMENT NOTIFICATION
// ==========================================

export async function notifyVolunteerAssignment(params: NotifyVolunteerParams): Promise<void> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'notify_on_assignment' } });
  if (setting?.value === 'false') return;

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
          Please assign this guest to someone for follow-up.
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
  const subject = `New Guest: ${guest.firstName} ${guest.lastName}`;
  const html = buildNewGuestEmailHtml(guest);

  for (const email of emails) {
    const trimmed = email.trim();
    if (!trimmed) continue;
    try {
      const result = await sendEmailViaResend(trimmed, subject, html);
      if (result.error) {
        console.error(`New guest email failed to ${trimmed}:`, result.error);
      } else {
        console.log(`New guest email sent to ${trimmed}`);
      }
    } catch (error: any) {
      console.error(`New guest email failed to ${trimmed}:`, error.message);
    }
  }
}

async function sendNewGuestWhatsApp(guest: GuestInfo, numbers: string[]): Promise<void> {
  const body = buildNewGuestWhatsAppMessage(guest);

  for (const number of numbers) {
    const trimmed = number.trim();
    if (!trimmed) continue;
    try {
      const result = await sendWhatsAppViaWhapi(trimmed, body);
      if (result.error) {
        console.error(`New guest WhatsApp failed to ${trimmed}:`, result.error);
      } else {
        console.log(`New guest WhatsApp sent to ${trimmed}`);
      }
    } catch (error: any) {
      console.error(`New guest WhatsApp failed to ${trimmed}:`, error.message);
    }
  }
}

export async function notifyNewGuestSubmission(guest: GuestInfo): Promise<void> {
  const enabledSetting = await prisma.appSetting.findUnique({ where: { key: 'notify_on_new_guest' } });
  if (enabledSetting?.value === 'false') return;

  const emailSetting = await prisma.appSetting.findUnique({ where: { key: 'notify_emails' } });
  const emails = emailSetting?.value ? emailSetting.value.split(',').map(e => e.trim()).filter(Boolean) : [];

  const whatsappSetting = await prisma.appSetting.findUnique({ where: { key: 'notify_whatsapp' } });
  const numbers = whatsappSetting?.value ? whatsappSetting.value.split(',').map(n => n.trim()).filter(Boolean) : [];

  const tasks: Promise<void>[] = [];
  if (emails.length > 0) tasks.push(sendNewGuestEmails(guest, emails));
  if (numbers.length > 0) tasks.push(sendNewGuestWhatsApp(guest, numbers));

  await Promise.allSettled(tasks);
}
