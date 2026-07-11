// Run 18 — set Track.ordering so tracks always stack in formation-pathway
// order everywhere (My Tracks, My Disciples, admin Tracks cards):
//   Welcome Track (1) → Become (2) → Leaders Track (3).
// A future Ministry Track would take 4. Idempotent: plain updates by fixed
// id; skips (with a warning) any track that does not exist.
//
// Usage: node scripts/run18-seed-track-ordering.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORDERING = [
  { id: 'trk_welcome', ordering: 1 },
  { id: 'trk_become', ordering: 2 },
  { id: 'trk_leaders', ordering: 3 },
];

async function main() {
  console.log('Setting Track.ordering (formation pathway)…');
  for (const t of ORDERING) {
    const result = await prisma.track.updateMany({
      where: { id: t.id },
      data: { ordering: t.ordering },
    });
    if (result.count === 1) {
      console.log(`  ✓ ${t.id} → ordering ${t.ordering}`);
    } else {
      console.warn(`  ⚠ ${t.id} not found — skipped`);
    }
  }
  const tracks = await prisma.track.findMany({
    orderBy: { ordering: 'asc' },
    select: { id: true, name: true, ordering: true },
  });
  console.log('Current order:', tracks.map((t) => `${t.name} (${t.ordering})`).join(' → '));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
