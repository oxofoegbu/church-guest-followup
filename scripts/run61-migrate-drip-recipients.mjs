// scripts/run61-migrate-drip-recipients.mjs  (Run 61)
// ---------------------------------------------------------------------------
// Idempotent. Sets recipient + whatsappTemplateKey on the 4 existing
// WhatsApp drip templates, matched by (dayOffset, channel) since that pair
// is unique across the seeded rows. Also repoints Day 13's body/name to
// reuse Day 4's approved Meta template content — Pastor Okezie decided
// Day 13 no longer needs its own Meta submission (the invitation-style
// wording moves to email-only; WhatsApp Day 13 becomes a repeat of the
// Day 4 pastoral check-in).
//
// Safe to re-run: every write is a plain set-to-value, not an increment,
// so running this twice produces the same end state as running it once.
//
// Run: node scripts/run61-migrate-drip-recipients.mjs
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DAY4_BODY =
  "Hi {{firstName}}! This is Pastor O from {{churchName}}. Just checking in to see how your week is going. Let me know if there is anything we can pray with you about. Looking forward to seeing you again!";

const UPDATES = [
  {
    dayOffset: 2,
    channel: 'WHATSAPP',
    data: { recipient: 'VOLUNTEER', whatsappTemplateKey: 'day2FollowUp' },
  },
  {
    dayOffset: 4,
    channel: 'WHATSAPP',
    data: { recipient: 'GUEST', whatsappTemplateKey: 'day4PastorCheckin' },
  },
  {
    dayOffset: 11,
    channel: 'WHATSAPP',
    data: { recipient: 'VOLUNTEER', whatsappTemplateKey: 'day11InviteBack' },
  },
  {
    dayOffset: 13,
    channel: 'WHATSAPP',
    data: {
      recipient: 'GUEST',
      whatsappTemplateKey: 'day4PastorCheckin',
      name: "Day 13 — Pastor's WhatsApp check-in (repeat)",
      body: DAY4_BODY,
    },
  },
];

async function main() {
  console.log('=== Run 61 drip recipient/template migration ===\n');

  for (const u of UPDATES) {
    const rows = await prisma.dripTemplate.findMany({
      where: { dayOffset: u.dayOffset, channel: u.channel },
    });

    if (rows.length === 0) {
      console.log(`Day ${u.dayOffset} (${u.channel}): NOT FOUND — skipping (nothing to migrate)`);
      continue;
    }
    if (rows.length > 1) {
      console.log(`Day ${u.dayOffset} (${u.channel}): ${rows.length} rows match — expected exactly 1, skipping to avoid guessing which one`);
      continue;
    }

    const row = rows[0];
    const already =
      row.recipient === u.data.recipient &&
      row.whatsappTemplateKey === u.data.whatsappTemplateKey &&
      (u.data.name === undefined || row.name === u.data.name) &&
      (u.data.body === undefined || row.body === u.data.body);

    if (already) {
      console.log(`Day ${u.dayOffset} (${row.name}): already migrated, no-op`);
      continue;
    }

    await prisma.dripTemplate.update({ where: { id: row.id }, data: u.data });
    console.log(`Day ${u.dayOffset} (${row.name}): updated -> recipient=${u.data.recipient} whatsappTemplateKey=${u.data.whatsappTemplateKey}${u.data.name ? ` name="${u.data.name}"` : ''}`);
  }

  console.log('\n=== done ===');
}

main()
  .catch((e) => {
    console.error('[migrate] fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
