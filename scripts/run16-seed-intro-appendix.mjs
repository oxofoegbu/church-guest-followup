// scripts/run16-seed-intro-appendix.mjs
// ---------------------------------------------------------------------------
// Run 16 seed. Pure ESM JavaScript.
//
// 1. Upserts the new Introduction and Appendix modules for both tracks:
//      bec_m0  (INTRO)    bec_m13 (APPENDIX)   — Become
//      lea_m0  (INTRO)    lea_m12 (APPENDIX)   — Leaders
// 2. Updates bec_m1 / bec_m12 / lea_m1 so their content no longer duplicates
//    the material that moved into the new modules.
// 3. Migrates any already-saved reflections whose blocks moved (Before
//    assessment: bec_m1 -> bec_m0; appendices: bec_m12 -> bec_m13), updating
//    both moduleId and promptId per the map in the content JSON.
//
// Requires `prisma db push` to have added TrackModule.kind first (the Run 16
// deploy script does this before building). Idempotent — safe to re-run.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const raw = readFileSync(join(here, 'run16-intro-appendix-content.json'), 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.modules) || data.modules.length !== 7) {
    throw new Error(`Expected 7 module operations, found ${data.modules?.length}`);
  }

  // Pre-flight: every module we UPDATE must already exist (Run 12/15 seeds).
  const updateIds = data.modules.filter((m) => m.op === 'update').map((m) => m.id);
  const existing = await prisma.trackModule.findMany({
    where: { id: { in: updateIds } },
    select: { id: true },
  });
  const found = new Set(existing.map((m) => m.id));
  const missing = updateIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Missing TrackModule rows: ${missing.join(', ')} — run the Run 12/15 content seeds first.`
    );
  }

  // 1 + 2 — module upserts and updates
  for (const m of data.modules) {
    const blockCount = m.content?.blocks?.length ?? 0;
    if (m.op === 'upsert') {
      await prisma.trackModule.upsert({
        where: { id: m.id },
        update: { kind: m.kind, weekNumber: m.weekNumber, title: m.title, summary: m.summary, content: m.content },
        create: {
          id: m.id, trackId: m.trackId, weekNumber: m.weekNumber, kind: m.kind,
          title: m.title, summary: m.summary, content: m.content,
        },
      });
      console.log(`[seed] upsert ${m.id} (${m.kind}) → "${m.title}" (${blockCount} blocks)`);
    } else {
      await prisma.trackModule.update({
        where: { id: m.id },
        data: { title: m.title, summary: m.summary, content: m.content },
      });
      console.log(`[seed] update ${m.id} → "${m.title}" (${blockCount} blocks)`);
    }
  }

  // 3 — migrate reflections whose blocks moved to a new module / new id.
  // updateMany matches 0 rows on re-run, keeping this idempotent.
  let moved = 0;
  for (const mig of data.reflectionMigrations || []) {
    const res = await prisma.moduleReflection.updateMany({
      where: { moduleId: mig.fromModuleId, promptId: mig.fromPromptId },
      data: { moduleId: mig.toModuleId, promptId: mig.toPromptId },
    });
    moved += res.count;
  }
  console.log(`[seed] reflection migrations applied (${moved} row${moved === 1 ? '' : 's'} moved).`);
  console.log('[seed] Run 16 intro/appendix modules are live for both tracks.');
}

main()
  .catch((e) => {
    console.error('[seed] fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
