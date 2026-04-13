// scripts/run4-backfill.mjs
// Run 4 backfill: for every existing guest with dripEnabled=true AND no
// GuestDripStep rows, schedule their future drip steps.
//
// Idempotent: can be re-run safely. Guests whose firstVisitDate is >14 days
// ago will get 0 (or fewer) steps because the scheduler skips past-dated
// entries — that is the intended behavior. We do NOT backfill messages we
// never sent.
//
// Pure JS — no TypeScript syntax (Pitfall #35).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function anchorPlusOffset(anchor, dayOffset) {
  const d = new Date(anchor);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function main() {
  console.log('🌾 Run 4 backfill — scheduling drip steps for existing guests\n');

  const templates = await prisma.dripTemplate.findMany({ where: { enabled: true } });
  console.log(`  Found ${templates.length} enabled drip templates`);

  if (templates.length === 0) {
    console.log('  No enabled templates — nothing to do.');
    await prisma.$disconnect();
    return;
  }

  // Find guests with dripEnabled and no existing drip steps.
  const guests = await prisma.guest.findMany({
    where: {
      dripEnabled: true,
      guestDripSteps: { none: {} },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      firstVisitDate: true,
      createdAt: true,
    },
  });

  console.log(`  Found ${guests.length} guests with dripEnabled=true and no existing steps\n`);

  const now = new Date();
  let totalCreated = 0;
  let guestsTouched = 0;
  let guestsWithZeroFuture = 0;

  for (const g of guests) {
    const anchor = g.firstVisitDate || g.createdAt;
    if (!anchor) continue;

    let createdForGuest = 0;
    for (const t of templates) {
      const scheduledFor = anchorPlusOffset(new Date(anchor), t.dayOffset);
      if (scheduledFor <= now) continue;

      // Defensive idempotency check in case this script is re-run mid-way.
      const existing = await prisma.guestDripStep.findFirst({
        where: { guestId: g.id, dripTemplateId: t.id },
      });
      if (existing) continue;

      await prisma.guestDripStep.create({
        data: {
          guestId: g.id,
          dripTemplateId: t.id,
          scheduledFor,
          status: 'PENDING',
        },
      });
      createdForGuest++;
    }

    if (createdForGuest > 0) {
      guestsTouched++;
      totalCreated += createdForGuest;
      console.log(`  ✓ ${g.firstName} ${g.lastName}: ${createdForGuest} step(s) scheduled`);
    } else {
      guestsWithZeroFuture++;
    }
  }

  console.log(`\n✅ Backfill complete`);
  console.log(`   ${guests.length} guest(s) processed`);
  console.log(`   ${guestsTouched} guest(s) received new steps`);
  console.log(`   ${totalCreated} total step(s) created`);
  console.log(`   ${guestsWithZeroFuture} guest(s) had only past-dated steps — skipped (expected)`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Backfill failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
