// scripts/run6-backfill.mjs
// ---------------------------------------------------------------------------
// Run 6 backfill. Pure ESM JavaScript (Pitfall #35).
//
// Ensures the `church_name` AppSetting exists so the executor + sender can
// read it at runtime. Idempotent — safe to re-run.
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DEFAULT_CHURCH_NAME = 'Grace Life Center';

async function main() {
  const existing = await prisma.appSetting.findUnique({ where: { key: 'church_name' } });
  if (existing) {
    console.log(`[backfill] church_name already set: "${existing.value}" (no-op)`);
  } else {
    await prisma.appSetting.create({
      data: { key: 'church_name', value: DEFAULT_CHURCH_NAME },
    });
    console.log(`[backfill] seeded church_name = "${DEFAULT_CHURCH_NAME}"`);
  }
}

main()
  .catch((e) => {
    console.error('[backfill] fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
