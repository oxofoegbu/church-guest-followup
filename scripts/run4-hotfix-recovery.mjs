// scripts/run4-hotfix-recovery.mjs
// One-shot recovery for guests affected by the v1 bug where Enable
// after Disable failed to create fresh PENDING rows because SKIPPED
// rows blocked the idempotency check.
//
// For every guest with dripEnabled=true that is missing active PENDING
// rows for a template they should have, this creates the missing rows
// (only for future-dated offsets; past-dated offsets are skipped as
// usual).
//
// Pure JS (Pitfall #35). Safe to re-run.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function anchorPlusOffset(anchor, dayOffset) {
  const d = new Date(anchor);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function main() {
  console.log('🩹 Run 4 hotfix recovery — repairing guests affected by v1 enable/disable bug\n');

  const templates = await prisma.dripTemplate.findMany({ where: { enabled: true } });
  console.log(`  ${templates.length} enabled templates`);

  // All dripEnabled guests — we'll check each for missing active rows.
  const guests = await prisma.guest.findMany({
    where: { dripEnabled: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      firstVisitDate: true,
      createdAt: true,
    },
  });
  console.log(`  ${guests.length} guests have dripEnabled=true\n`);

  const now = new Date();
  let totalCreated = 0;
  let guestsRepaired = 0;

  for (const g of guests) {
    const anchor = g.firstVisitDate || g.createdAt;
    if (!anchor) continue;

    let createdForGuest = 0;
    const missing = [];

    for (const t of templates) {
      const scheduledFor = anchorPlusOffset(new Date(anchor), t.dayOffset);
      if (scheduledFor <= now) continue; // past-dated, always skipped

      // Is there an ACTIVE row already?
      const active = await prisma.guestDripStep.findFirst({
        where: {
          guestId: g.id,
          dripTemplateId: t.id,
          status: { in: ['PENDING', 'SENT'] },
        },
      });
      if (active) continue;

      // No active row — this is the bug signature. Create one.
      await prisma.guestDripStep.create({
        data: {
          guestId: g.id,
          dripTemplateId: t.id,
          scheduledFor,
          status: 'PENDING',
        },
      });
      createdForGuest++;
      missing.push(`Day ${t.dayOffset}/${t.channel}`);
    }

    if (createdForGuest > 0) {
      guestsRepaired++;
      totalCreated += createdForGuest;
      console.log(`  ✓ ${g.firstName} ${g.lastName}: created ${createdForGuest} missing step(s) — ${missing.join(', ')}`);
    }
  }

  console.log(`\n✅ Recovery complete`);
  console.log(`   ${guests.length} drip-enabled guest(s) examined`);
  console.log(`   ${guestsRepaired} guest(s) repaired`);
  console.log(`   ${totalCreated} missing step(s) restored`);

  if (guestsRepaired === 0) {
    console.log(`\n   (If this is 0, either no guests were affected, or the recovery already ran.)`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Recovery failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
