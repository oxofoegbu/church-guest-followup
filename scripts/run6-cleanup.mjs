// scripts/run6-cleanup.mjs
// ---------------------------------------------------------------------------
// Run 6 data cleanup. Pure ESM JavaScript (Pitfall #35).
//
// Two passes:
//   1. Dedup: rows sharing (guestId, dripTemplateId, status, scheduledFor) —
//      keep the OLDEST by createdAt (Pitfall #44: the later row is the
//      hotfix artifact, not the original truth), delete the rest.
//   2. Re-anchor: any PENDING row with UTC hour == 9 is shifted to hour ==
//      13, preserving the calendar date. Historical drift from Run 4 v1
//      (literal 09:00 UTC) vs Run 4 v1.1 hotfix (13:00 UTC = 9am EST local).
//
// Idempotent: re-running is a no-op after the first successful pass.
// No dry-run flag — the installer takes an on-disk backup before invoking.
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function dedup() {
  // Postgres-specific: status cast to text so Prisma can accept the value
  // back on the enum-typed column in the delete filter.
  const dups = await prisma.$queryRawUnsafe(`
    SELECT "guestId", "dripTemplateId", status::text AS status, "scheduledFor", COUNT(*)::int AS cnt
    FROM guest_drip_steps
    GROUP BY "guestId", "dripTemplateId", status, "scheduledFor"
    HAVING COUNT(*) > 1
  `);

  if (!dups.length) {
    console.log('[dedup] no duplicate groups found');
    return 0;
  }

  let deleted = 0;
  for (const g of dups) {
    const rows = await prisma.guestDripStep.findMany({
      where: {
        guestId: g.guestId,
        dripTemplateId: g.dripTemplateId,
        status: g.status,
        scheduledFor: g.scheduledFor,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (rows.length <= 1) continue;
    const keep = rows[0];
    const toDelete = rows.slice(1);
    console.log(
      `[dedup] group guest=${g.guestId} tpl=${g.dripTemplateId} status=${g.status} ` +
      `at=${new Date(g.scheduledFor).toISOString()} count=${rows.length} keep=${keep.id}`
    );
    for (const r of toDelete) {
      await prisma.guestDripStep.delete({ where: { id: r.id } });
      console.log(`[dedup]   deleted ${r.id} (created ${r.createdAt.toISOString()})`);
      deleted++;
    }
  }
  console.log(`[dedup] deleted ${deleted} duplicate row(s) across ${dups.length} group(s)`);
  return deleted;
}

async function reAnchor() {
  // Find all PENDING rows where UTC hour = 9. Spec B says: whether or not the
  // guest has 13:00 siblings, shift all 09:00 PENDINGs to 13:00 UTC on the
  // same calendar date. (Pick one anchor per guest, globally normalised.)
  const drifted = await prisma.$queryRawUnsafe(`
    SELECT id, "scheduledFor"
    FROM guest_drip_steps
    WHERE status = 'PENDING' AND EXTRACT(HOUR FROM "scheduledFor" AT TIME ZONE 'UTC') = 9
  `);

  if (!drifted.length) {
    console.log('[anchor] no 09:00 UTC PENDING rows found');
    return 0;
  }

  let shifted = 0;
  for (const r of drifted) {
    const old = new Date(r.scheduledFor);
    const next = new Date(old);
    next.setUTCHours(13, 0, 0, 0);
    await prisma.guestDripStep.update({
      where: { id: r.id },
      data: { scheduledFor: next },
    });
    console.log(`[anchor] ${r.id}: ${old.toISOString()} -> ${next.toISOString()}`);
    shifted++;
  }
  console.log(`[anchor] shifted ${shifted} row(s) from 09:00 to 13:00 UTC`);
  return shifted;
}

async function main() {
  console.log('=== Run 6 cleanup starting ===');
  const d = await dedup();
  const a = await reAnchor();
  console.log('=== Run 6 cleanup done ===');
  console.log(`Summary: deleted=${d} shifted=${a}`);
}

main()
  .catch((e) => {
    console.error('[cleanup] fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
