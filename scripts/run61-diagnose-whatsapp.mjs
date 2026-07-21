// scripts/run61-diagnose-whatsapp.mjs
// ---------------------------------------------------------------------------
// READ-ONLY diagnostic. Does not send anything, does not modify anything.
// Pulls the last 15 WhatsApp attempts from each of the two send paths so we
// see Meta's/Whapi's ACTUAL error text instead of guessing from the
// WhatsApp Manager dashboard (which only shows template status, not send
// attempts).
//
//   Path 1: notification_logs  — guest_assignment / role_assignment /
//           new-guest-alert sends via the Meta Cloud API (Run 28)
//   Path 2: drip_send_logs     — Day 2/4/11/13 drip sends via the legacy
//           Whapi gateway
//
// Run: node scripts/run61-diagnose-whatsapp.mjs
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function line() {
  console.log('-'.repeat(78));
}

async function main() {
  console.log('=== Run 61 WhatsApp diagnostic (read-only) ===\n');

  line();
  console.log('PATH 1 — Meta Cloud API sends (guest_assignment / role_assignment / new-guest-alert)');
  console.log('Source: notification_logs, channel = WHATSAPP');
  line();
  const notifLogs = await prisma.notificationLog.findMany({
    where: { channel: 'WHATSAPP' },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });
  if (notifLogs.length === 0) {
    console.log('No WhatsApp rows in notification_logs at all — meaning the app has');
    console.log('never even ATTEMPTED a Meta Cloud API send. That points to the trigger');
    console.log('never firing (e.g. notify_on_assignment setting off, or no guest was');
    console.log('ever assigned to a volunteer with a phone number on file), not a Meta-side');
    console.log('problem.');
  } else {
    for (const r of notifLogs) {
      console.log(
        `${r.createdAt.toISOString()}  status=${r.status.padEnd(7)}  ` +
        `providerMessageId=${r.providerMessageId || '(none)'}\n` +
        `  error: ${r.errorMessage || '(none)'}\n` +
        `  payload: ${r.payloadSnapshot || '(none)'}`
      );
    }
  }

  console.log('');
  line();
  console.log('PATH 2 — Drip campaign sends (Day 2 / 4 / 11 / 13, legacy Whapi gateway)');
  console.log('Source: drip_send_logs, channel = WHATSAPP');
  line();
  const dripLogs = await prisma.dripSendLog.findMany({
    where: { channel: 'WHATSAPP' },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });
  if (dripLogs.length === 0) {
    console.log('No WhatsApp rows in drip_send_logs — no drip WhatsApp step has been due');
    console.log('and processed yet (or the guests on drip so far have no phone number).');
  } else {
    for (const r of dripLogs) {
      console.log(
        `${r.createdAt.toISOString()}  status=${r.status.padEnd(7)}  ` +
        `providerMessageId=${r.providerMessageId || '(none)'}\n` +
        `  error: ${r.errorMessage || '(none)'}\n` +
        `  body sent: ${(r.bodyRendered || '').slice(0, 160)}${(r.bodyRendered || '').length > 160 ? '…' : ''}`
      );
    }
  }

  console.log('');
  line();
  console.log('PATH 2b — Pending/skipped drip steps right now (all channels)');
  line();
  const stepCounts = await prisma.$queryRawUnsafe(`
    SELECT dt.channel, gds.status, COUNT(*)::int AS cnt
    FROM guest_drip_steps gds
    JOIN drip_templates dt ON dt.id = gds."dripTemplateId"
    GROUP BY dt.channel, gds.status
    ORDER BY dt.channel, gds.status
  `);
  for (const row of stepCounts) {
    console.log(`${row.channel.padEnd(10)} ${row.status.padEnd(10)} ${row.cnt}`);
  }

  console.log('\n=== done ===');
}

main()
  .catch((e) => {
    console.error('[diagnose] fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
