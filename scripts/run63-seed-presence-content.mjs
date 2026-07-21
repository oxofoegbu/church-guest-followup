// Run 63 — seed the "Practicing His Presence" (Game With Minutes) content.
// Content-only: updates the `content` JSON of wel_m3, wel_m4, bec_m7, dis_m5
// with their full existing blocks PLUS the new Practicing-His-Presence blocks.
// Idempotent (re-running re-sets the same content) and atomic (all-or-nothing
// via a single transaction). No schema change, no db push, no reflection
// migration — every new savable id is brand new, so no existing responses move.
//
// Usage: node scripts/run63-seed-presence-content.mjs
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, 'run63-presence-content.json'), 'utf8'));

async function main() {
  const ids = data.modules.map((m) => m.id);
  console.log(`Run 63 — seeding Practicing His Presence content into: ${ids.join(', ')}`);

  // Pre-flight: every target module must already exist. Abort cleanly (before
  // writing anything) if one is missing.
  const found = await prisma.trackModule.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((m) => m.id));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new Error(`Aborting — module(s) not found, nothing changed: ${missing.join(', ')}`);
  }

  // Atomic: all four content updates succeed together or none do.
  await prisma.$transaction(
    data.modules.map((m) =>
      prisma.trackModule.update({
        where: { id: m.id },
        data: { content: m.content },
      })
    )
  );

  for (const m of data.modules) {
    console.log(`  ✓ ${m.id} — ${m.content.blocks.length} blocks (content v${m.content.version})`);
  }
  console.log('Done. Presence content is live across Welcome (wk3/4), BECOME® (wk7), and Disciplers (m5).');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
