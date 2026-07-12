// Run 22 — seed the 2026–2027 cohort launch plan (idempotent, CREATE-ONLY).
//
// 15 cohorts: 3 Welcome + 1 Become in 2026; 6 Welcome + 3 Become + 2 Leaders
// in 2027. Fixed ids, upserted with an EMPTY update — re-running this seed
// never overwrites edits made later in the app, and existing hand-made
// cohorts (cuid ids) are never touched.
//
// Rhythm: Welcome = Saturdays 18:00 (5 weeks) · Become = Sundays 18:00
// (12 weeks) · Leaders = Thursdays 19:00 (11 weeks). Become Cohort 3 ships
// as a CUSTOM session plan — 12 explicit Sundays that skip July 4, 2027 —
// exercising the Run 22 sessionPlan feature.
//
// Run with:  node scripts/run22-seed-cohort-plan.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const d = (s) => new Date(`${s}T00:00:00.000Z`);

// Become Cohort 3 — Spring 2027: 12 Sundays at 18:00, skipping July 4.
const BEC3_DATES = [
  '2027-05-09', '2027-05-16', '2027-05-23', '2027-05-30',
  '2027-06-06', '2027-06-13', '2027-06-20', '2027-06-27',
  '2027-07-11', '2027-07-18', '2027-07-25', '2027-08-01',
];
const BEC3_SESSIONS = BEC3_DATES.map((date, i) => ({
  date,
  time: '18:00',
  weeks: [i + 1],
  label: date === '2027-07-11' ? 'Back from the July 4 break' : null,
}));

const COHORTS = [
  // ── 2026 — the launch year: 3 Welcome, 1 Become ──
  { id: 'coh_wt1_2026', trackId: 'trk_welcome', name: 'Welcome Cohort 1 — Aug 2026',
    startDate: '2026-08-08', meetingDay: 'Saturday', meetingTime: '18:00' },
  { id: 'coh_bec1_2026', trackId: 'trk_become', name: 'Become Cohort 1 — Fall 2026',
    startDate: '2026-09-20', meetingDay: 'Sunday', meetingTime: '18:00' },
  { id: 'coh_wt2_2026', trackId: 'trk_welcome', name: 'Welcome Cohort 2 — Sep 2026',
    startDate: '2026-09-26', meetingDay: 'Saturday', meetingTime: '18:00' },
  { id: 'coh_wt3_2026', trackId: 'trk_welcome', name: 'Welcome Cohort 3 — Nov 2026',
    startDate: '2026-11-14', meetingDay: 'Saturday', meetingTime: '18:00' },

  // ── 2027 — 6 Welcome, 3 Become, 2 Leaders (Leaders first in Q1) ──
  { id: 'coh_lea1_2027', trackId: 'trk_leaders', name: 'Leaders Cohort 1 — Winter 2027',
    startDate: '2027-01-14', meetingDay: 'Thursday', meetingTime: '19:00' },
  { id: 'coh_bec2_2027', trackId: 'trk_become', name: 'Become Cohort 2 — Winter 2027',
    startDate: '2027-01-17', meetingDay: 'Sunday', meetingTime: '18:00' },
  { id: 'coh_wt4_2027', trackId: 'trk_welcome', name: 'Welcome Cohort 4 — Feb 2027',
    startDate: '2027-02-06', meetingDay: 'Saturday', meetingTime: '18:00' },
  { id: 'coh_wt5_2027', trackId: 'trk_welcome', name: 'Welcome Cohort 5 — Apr 2027',
    startDate: '2027-04-03', meetingDay: 'Saturday', meetingTime: '18:00' },
  { id: 'coh_bec3_2027', trackId: 'trk_become', name: 'Become Cohort 3 — Spring 2027',
    startDate: '2027-05-09', meetingDay: 'Sunday', meetingTime: '18:00',
    sessionPlan: BEC3_SESSIONS },
  { id: 'coh_wt6_2027', trackId: 'trk_welcome', name: 'Welcome Cohort 6 — May 2027',
    startDate: '2027-05-29', meetingDay: 'Saturday', meetingTime: '18:00' },
  { id: 'coh_wt7_2027', trackId: 'trk_welcome', name: 'Welcome Cohort 7 — Jul 2027',
    startDate: '2027-07-24', meetingDay: 'Saturday', meetingTime: '18:00' },
  { id: 'coh_lea2_2027', trackId: 'trk_leaders', name: 'Leaders Cohort 2 — Fall 2027',
    startDate: '2027-08-19', meetingDay: 'Thursday', meetingTime: '19:00' },
  { id: 'coh_bec4_2027', trackId: 'trk_become', name: 'Become Cohort 4 — Fall 2027',
    startDate: '2027-09-05', meetingDay: 'Sunday', meetingTime: '18:00' },
  { id: 'coh_wt8_2027', trackId: 'trk_welcome', name: 'Welcome Cohort 8 — Sep 2027',
    startDate: '2027-09-18', meetingDay: 'Saturday', meetingTime: '18:00' },
  { id: 'coh_wt9_2027', trackId: 'trk_welcome', name: 'Welcome Cohort 9 — Nov 2027',
    startDate: '2027-11-13', meetingDay: 'Saturday', meetingTime: '18:00' },
];

async function main() {
  console.log('Run 22 — seeding the 2026–2027 cohort plan (create-only)…');

  // Sanity: the three seeded tracks must exist.
  const tracks = await prisma.track.findMany({
    where: { id: { in: ['trk_welcome', 'trk_become', 'trk_leaders'] } },
    select: { id: true },
  });
  if (tracks.length !== 3) {
    throw new Error(`Expected the 3 seeded tracks, found ${tracks.length} — aborting.`);
  }

  let created = 0;
  let skipped = 0;
  for (const c of COHORTS) {
    const before = await prisma.trackCohort.findUnique({ where: { id: c.id }, select: { id: true } });
    if (before) {
      skipped++;
      console.log(`  · ${c.name} — already exists, untouched`);
      continue;
    }
    await prisma.trackCohort.create({
      data: {
        id: c.id,
        trackId: c.trackId,
        name: c.name,
        startDate: d(c.startDate),
        meetingDay: c.meetingDay,
        meetingTime: c.meetingTime,
        ...(c.sessionPlan ? { sessionPlan: c.sessionPlan } : {}),
      },
    });
    created++;
    console.log(`  ✓ ${c.name}${c.sessionPlan ? ` (custom plan, ${c.sessionPlan.length} sessions)` : ''}`);
  }

  console.log(`Done — ${created} created, ${skipped} already present. Hand-made cohorts untouched.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
