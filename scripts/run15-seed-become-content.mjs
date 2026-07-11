// scripts/run15-seed-become-content.mjs
// ---------------------------------------------------------------------------
// Run 15 seed. Pure ESM JavaScript.
//
// Loads the full BECOME(R) Participant Workbook (12 weeks, transcribed from
// "Becoming Like Jesus - Participant Workbook") into TrackModule.content for
// bec_m1..bec_m12, and aligns each module's title + summary with the workbook.
//
// Placement notes (documented in the Run 15 README):
//   - bec_m1  = Welcome to BECOME + Before Assessment + Commitment Prayer,
//               prepended to the Week 1 lesson (Run 12 precedent).
//   - bec_m12 = Week 12 lesson + Appendices appended in print order
//               (Covenant, After Assessment + Thanksgiving Prayer, FAQ,
//               Meeting With Jesus Daily).
//
// Idempotent — safe to re-run; it simply overwrites content with the same
// data. Fails loudly if any expected module id is missing.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const raw = readFileSync(join(here, 'run15-become-content.json'), 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.modules) || data.modules.length !== 12) {
    throw new Error(`Expected 12 modules in content file, found ${data.modules?.length}`);
  }

  // Pre-flight: all 12 module ids must exist before we touch anything.
  const ids = data.modules.map((m) => m.id);
  const existing = await prisma.trackModule.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const found = new Set(existing.map((m) => m.id));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Missing TrackModule rows: ${missing.join(', ')} — run the Run 9 track seed first.`
    );
  }

  for (const m of data.modules) {
    const blockCount = m.content?.blocks?.length ?? 0;
    await prisma.trackModule.update({
      where: { id: m.id },
      data: { title: m.title, summary: m.summary, content: m.content },
    });
    console.log(
      `[seed] W${String(m.weekNumber).padStart(2)} ${m.id} \u2192 "${m.title}" (${blockCount} blocks)`
    );
  }
  console.log('[seed] BECOME workbook content loaded for all 12 weeks.');
}

main()
  .catch((e) => {
    console.error('[seed] fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
