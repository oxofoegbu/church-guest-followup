// Run 3 backfill — seed 4 starter drip templates. Idempotent.
// Pure JS only (no TS syntax, no `as any`) — see Pitfall #35.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_TEMPLATES = [
  {
    name: 'Day 1 — Welcome email',
    dayOffset: 1,
    channel: 'EMAIL',
    subject: 'So glad you visited {{churchName}}, {{firstName}}!',
    body:
      'Hi {{firstName}},\n\n' +
      'Thank you so much for visiting {{churchName}} this past Sunday. ' +
      'It was a real joy to have you with us.\n\n' +
      'If you have any questions or just want to connect, your follow-up contact ' +
      '{{volunteerName}} would love to hear from you.\n\n' +
      'We hope to see you again soon.\n\n' +
      'Blessings,\nThe {{churchName}} team',
    enabled: true,
  },
  {
    name: 'Day 3 — WhatsApp check-in',
    dayOffset: 3,
    channel: 'WHATSAPP',
    subject: null,
    body:
      'Hi {{firstName}}! This is {{volunteerName}} from {{churchName}}. ' +
      'Just checking in to see how your week is going. ' +
      'Let me know if there is anything we can pray with you about.',
    enabled: true,
  },
  {
    name: 'Day 7 — Pastor introduction',
    dayOffset: 7,
    channel: 'EMAIL',
    subject: 'A note from your pastor at {{churchName}}',
    body:
      'Hi {{firstName}},\n\n' +
      'It has been a week since you visited {{churchName}}, and I just wanted to ' +
      'personally say how glad we are that you came.\n\n' +
      'Our hope is that {{churchName}} can be a place where you grow, belong, and ' +
      'are known. If you would ever like to grab coffee or have a conversation, ' +
      'please reply to this email.\n\n' +
      'Looking forward to seeing you again.\n\n' +
      'In Christ,\nThe pastoral team at {{churchName}}',
    enabled: true,
  },
  {
    name: 'Day 14 — Invite back',
    dayOffset: 14,
    channel: 'WHATSAPP',
    subject: null,
    body:
      'Hi {{firstName}}, {{volunteerName}} here from {{churchName}}. ' +
      'We would love to see you again this Sunday — service is at 9am. ' +
      'Let me know if you need a ride or want to sit together.',
    enabled: true,
  },
];

async function main() {
  const existingCount = await prisma.dripTemplate.count();
  if (existingCount > 0) {
    console.log(`✓ ${existingCount} drip template(s) already exist — skipping seed.`);
    return;
  }

  console.log('Seeding 4 starter drip templates…');
  for (const t of SEED_TEMPLATES) {
    const created = await prisma.dripTemplate.create({ data: t });
    console.log(`  ✓ ${created.name}  (day ${created.dayOffset}, ${created.channel})`);
  }
  console.log('✓ Drip template seed complete.');
}

main()
  .catch((e) => {
    console.error('✗ Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
