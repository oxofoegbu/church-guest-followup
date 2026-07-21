// scripts/run61-dump-drip-templates.mjs
// ---------------------------------------------------------------------------
// READ-ONLY. Prints the full, untruncated body of every WHATSAPP-channel
// drip template, so we can draft Meta-template submissions from the real
// text instead of the truncated preview in Settings.
//
// Run: node scripts/run61-dump-drip-templates.mjs
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.dripTemplate.findMany({
    orderBy: { dayOffset: 'asc' },
  });

  console.log('=== All drip templates (full body text) ===\n');
  for (const t of templates) {
    console.log('='.repeat(78));
    console.log(`Day ${t.dayOffset} — ${t.name}  [${t.channel}]  enabled=${t.enabled}`);
    if (t.subject) console.log(`Subject: ${t.subject}`);
    console.log('Body:');
    console.log(t.body);
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error('[dump] fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
