// scripts/run12-seed-leaders-content.mjs
// ---------------------------------------------------------------------------
// Run 12 seed. Pure ESM JavaScript (Pitfall #35).
//
// Loads the full Leaders Track Participant Workbook (11 weeks, transcribed
// from the CRM USA manual) into TrackModule.content for lea_m1..lea_m11,
// and aligns each module's title + summary with the manual.
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
  const raw = readFileSync(join(here, 'run12-leaders-content.json'), 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.modules) || data.modules.length !== 11) {
    throw new Error(`Expected 11 modules in content file, found ${data.modules?.length}`);
  }

  // Pre-flight: all 11 module ids must exist before we touch anything.
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
  console.log('[seed] Leaders Track workbook content loaded for all 11 weeks.');
}

main()
  .catch((e) => {
    console.error('[seed] fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
