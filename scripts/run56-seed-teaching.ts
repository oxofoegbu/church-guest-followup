// Run 56 — seed Teaching from the in-repo registry itself.
//
// The registry is this seed's own source of truth, so drift is impossible: it
// imports the very arrays the site rendered from until this run. Idempotent —
// upsert by slug, fixed ids (tch_<slug>) — so re-running changes nothing.
//
// It then READS BACK through the same ORDER BY the live path uses and asserts
// the result is identical to the registry: same order, same date, same
// publishAt, same count. A mismatch exits non-zero, which fails deploy.sh and
// triggers rollback. The drip is live and public; a wrong migration must never
// survive the deploy.
//
//   npx tsx scripts/run56-seed-teaching.ts
//
// It is a .ts (not .mts) on purpose: package.json has no "type": "module", so
// tsx runs .ts as CJS, where the repo's extensionless relative imports resolve.
// This is the proven prisma/seed.ts pattern. A .mts is strict ESM and cannot
// resolve '../src/content/teaching/articles' — it fails at run time.
import { SERMONS } from '../src/content/teaching/sermons';
import { ARTICLES } from '../src/content/teaching/articles';
import * as H from '../src/content/teaching/helpers';
import type { Teaching } from '../src/content/teaching/types';

// A yyyy-mm-dd calendar date -> UTC midnight. Explicitly UTC so no server zone
// can shift the day. @db.Date stores the UTC date part; reading it back with
// toISOString().slice(0,10) returns this exact string. The round-trip is exact.
export function dateAtUtcMidnight(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

// The registry -> row mapping, exported so the Run 56 round-trip verification
// drives the REAL mapping rather than a copy of it that could drift.
export function toRow(t: Teaching, seq: number) {
  return {
    kind: t.kind,
    title: t.title,
    excerpt: t.excerpt,
    date: dateAtUtcMidnight(t.date),
    topic: t.topic,
    series: t.series ?? null,
    author: t.author,
    featured: t.featured === true,
    publishAt: t.publishAt ? dateAtUtcMidnight(t.publishAt) : null,
    seq,
    body: t.kind === 'article' ? (t.body as any) : null,
    transcript: t.kind === 'sermon' && t.transcript ? (t.transcript as any) : null,
    youTubeId: t.kind === 'sermon' ? t.youTubeId : null,
    durationMin: t.kind === 'sermon' ? t.durationMin ?? null : null,
    readMin: t.kind === 'article' ? t.readMin ?? null : null,
    status: 'PUBLISHED',
  };
}

export async function seed(): Promise<void> {
  // PrismaClient is resolved at RUN TIME, cast to any. The generated client does
  // not exist in the verification sandbox, so a static
  // `import { PrismaClient } from '@prisma/client'` would raise TS2305 there and
  // break the zero-new-errors baseline diff (it is exactly why prisma/seed.ts
  // contributes errors to that baseline). At deploy time `npm run build` has
  // already run `prisma generate`, so this behaves identically.
  const { PrismaClient } = (await import('@prisma/client')) as any;
  const prisma: any = new PrismaClient();

  try {
    // seq = index in the PRE-SORT concatenation. This is the tie-break that
    // Array.sort's stability used to provide implicitly. Sermons 0-15, then
    // articles 16-181.
    const concat: Teaching[] = [...SERMONS, ...ARTICLES];
    const registry: Teaching[] = [...concat].sort(H.byDateDesc);

    console.log(`registry: ${SERMONS.length} sermons + ${ARTICLES.length} articles = ${concat.length}`);

    let created = 0;
    let updated = 0;

    for (let i = 0; i < concat.length; i++) {
      const t = concat[i];
      const data = toRow(t, i);
      const existing = await prisma.teaching.findUnique({ where: { slug: t.slug } });
      await prisma.teaching.upsert({
        where: { slug: t.slug },
        create: { id: `tch_${t.slug}`, slug: t.slug, ...data },
        update: data,
      });
      if (existing) updated++;
      else created++;
    }

    console.log(`seeded: ${created} created, ${updated} updated`);

    // ---- verification: read back exactly as src/lib/teaching.ts does ----
    const rows: any[] = await prisma.teaching.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ date: 'desc' }, { seq: 'asc' }],
    });

    const problems: string[] = [];
    const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

    if (rows.length !== registry.length) {
      problems.push(`count: db=${rows.length} registry=${registry.length}`);
    }

    const n = Math.min(rows.length, registry.length);
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      const t = registry[i];
      if (r.slug !== t.slug) {
        problems.push(`order @${i}: db=${r.slug} registry=${t.slug}`);
        continue;
      }
      const rPub = iso(r.publishAt);
      const tPub = t.publishAt ?? null;
      if (rPub !== tPub) problems.push(`publishAt ${t.slug}: db=${rPub} registry=${tPub}`);
      const rDate = iso(r.date);
      if (rDate !== t.date) problems.push(`date ${t.slug}: db=${rDate} registry=${t.date}`);
    }

    const dbScheduled = rows.filter((r) => r.publishAt).length;
    const regScheduled = registry.filter((t) => t.publishAt).length;
    if (dbScheduled !== regScheduled) {
      problems.push(`scheduled: db=${dbScheduled} registry=${regScheduled}`);
    }

    if (problems.length > 0) {
      console.error('\nVERIFICATION FAILED — the DB does not match the registry:');
      problems.slice(0, 25).forEach((p) => console.error(`  ${p}`));
      if (problems.length > 25) console.error(`  ...and ${problems.length - 25} more`);
      throw new Error('seed verification failed');
    }

    console.log(`verified: ${rows.length} rows — order, date and publishAt identical to the registry`);
    console.log(`  scheduled (the drip): ${dbScheduled}`);
    console.log(`  featured: ${rows.filter((r) => r.featured).map((r) => r.slug).join(', ') || 'none'}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run when executed directly — importing this module (the round-trip
// verification imports toRow) must not open a DB connection.
if (require.main === module) {
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
