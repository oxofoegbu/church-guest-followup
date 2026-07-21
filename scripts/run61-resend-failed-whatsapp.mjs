// scripts/run61-resend-failed-whatsapp.mjs
// ---------------------------------------------------------------------------
// One-off. Finds notification_logs rows that FAILED specifically with the
// now-fixed "(#133010) Account not registered" error, and resends each
// using the exact same template + params that were captured in
// payloadSnapshot at the time of the original attempt (not re-derived from
// current guest/volunteer data, which may have changed since).
//
// Writes a NEW notification_logs row for the resend result (SENT or
// FAILED) rather than mutating the original — the original FAILED row
// stays as the historical record of the outage, matching how the rest of
// the app treats logs as append-only.
//
// Needs WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID in the environment
// (your local .env doesn't have these — pass them inline):
//
//   WHATSAPP_TOKEN="..." WHATSAPP_PHONE_NUMBER_ID="..." node scripts/run61-resend-failed-whatsapp.mjs
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const GRAPH_VERSION = 'v21.0';
const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function sendTemplate(to, templateName, lang, params) {
  const components =
    params.length > 0
      ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: text ?? '' })) }]
      : [];

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: lang }, components },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    return { error: data?.error?.message || `HTTP ${res.status}` };
  }
  return { id: data?.messages?.[0]?.id || 'sent' };
}

async function main() {
  if (!TOKEN || !PHONE_NUMBER_ID) {
    console.error('Missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID in environment. See header comment.');
    process.exit(1);
  }

  const failed = await prisma.notificationLog.findMany({
    where: {
      channel: 'WHATSAPP',
      status: 'FAILED',
      errorMessage: { contains: 'Account not registered' },
    },
    include: { guest: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (failed.length === 0) {
    console.log('No matching FAILED rows found (already resent, or error text differs).');
    return;
  }

  console.log(`Found ${failed.length} row(s) to resend:\n`);
  for (const row of failed) {
    const guestName = row.guest ? `${row.guest.firstName} ${row.guest.lastName}` : '(unknown guest)';
    let payload;
    try {
      payload = JSON.parse(row.payloadSnapshot || '{}');
    } catch {
      console.log(`  SKIP ${row.id} (${guestName}) — payloadSnapshot not parseable`);
      continue;
    }
    const { template, params, to } = payload;
    if (!template || !params || !to) {
      console.log(`  SKIP ${row.id} (${guestName}) — payloadSnapshot missing template/params/to`);
      continue;
    }

    console.log(`  Resending "${template}" to ${to} for guest ${guestName}...`);
    const result = await sendTemplate(to, template, 'en', params);

    const newLog = await prisma.notificationLog.create({
      data: {
        guestId: row.guestId,
        toUserId: row.toUserId,
        channel: 'WHATSAPP',
        status: result.error ? 'FAILED' : 'SENT',
        providerMessageId: result.id || null,
        errorMessage: result.error || null,
        payloadSnapshot: row.payloadSnapshot,
      },
    });

    if (result.error) {
      console.log(`    FAILED: ${result.error}  (new log row ${newLog.id})`);
    } else {
      console.log(`    SENT: providerMessageId=${result.id}  (new log row ${newLog.id})`);
    }
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error('[resend] fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
