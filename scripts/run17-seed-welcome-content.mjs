// Run 17 — seed the Welcome Track in-app workbook content.
// Idempotent: safe to re-run. Upserts wel_m0 (new INTRO module) and updates
// wel_m1..wel_m5 (existing placeholders) by their fixed ids, then refreshes
// the trk_welcome description. No reflection migrations needed — the Welcome
// placeholders never had content, so no savable blocks are moving.
//
// Usage: node scripts/run17-seed-welcome-content.mjs
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, 'run17-welcome-content.json'), 'utf8'));

const TRACK_ID = data.track; // trk_welcome

async function main() {
  const track = await prisma.track.findUnique({ where: { id: TRACK_ID } });
  if (!track) {
    throw new Error(`Track ${TRACK_ID} not found — aborting (nothing was changed).`);
  }
  console.log(`Seeding Welcome Track content into "${track.name}" (${TRACK_ID})…`);

  for (const m of data.modules) {
    const payload = {
      weekNumber: m.weekNumber,
      kind: m.kind,
      title: m.title,
      summary: m.summary,
      content: m.content,
    };
    await prisma.trackModule.upsert({
      where: { id: m.id },
      update: payload,
      create: { id: m.id, trackId: TRACK_ID, ...payload },
    });
    console.log(`  ✓ ${m.id}  [${m.kind}]  week ${m.weekNumber} — ${m.title} (${m.content.blocks.length} blocks)`);
  }

  if (data.trackUpdate?.description) {
    await prisma.track.update({
      where: { id: TRACK_ID },
      data: { description: data.trackUpdate.description },
    });
    console.log('  ✓ trk_welcome description updated');
  }

  const count = await prisma.trackModule.count({ where: { trackId: TRACK_ID } });
  console.log(`Done. Welcome Track now has ${count} modules (1 intro + 5 core).`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
