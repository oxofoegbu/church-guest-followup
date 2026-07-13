// Run 26 — seed the Disciplers Track (trk_disciplers) with its full in-app
// workbook content (dis_m0 INTRO + dis_m1..dis_m10 CORE + dis_m11 APPENDIX).
// Idempotent: safe to re-run. Upserts the track by its fixed id (create sets
// everything; update refreshes description / ordering / milestoneLabel only —
// never isActive, so an admin deactivation survives re-runs), then upserts
// every module by its fixed id. No reflection migrations: this track has
// never had content, so no savable blocks are moving.
//
// Usage: node scripts/run26-seed-disciplers-track.mjs
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, 'run26-disciplers-content.json'), 'utf8'));

const TRACK_ID = data.track; // trk_disciplers

async function main() {
  const tc = data.trackCreate;
  const track = await prisma.track.upsert({
    where: { id: TRACK_ID },
    update: {
      description: tc.description,
      ordering: tc.ordering,
      milestoneLabel: tc.milestoneLabel,
    },
    create: {
      id: TRACK_ID,
      name: tc.name,
      slug: tc.slug,
      description: tc.description,
      ordering: tc.ordering,
      milestoneLabel: tc.milestoneLabel,
    },
  });
  console.log(`Seeding Disciplers Track content into "${track.name}" (${TRACK_ID})…`);

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

  const count = await prisma.trackModule.count({ where: { trackId: TRACK_ID } });
  console.log(`Done. Disciplers Track now has ${count} modules (1 intro + 10 core + 1 appendix).`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
