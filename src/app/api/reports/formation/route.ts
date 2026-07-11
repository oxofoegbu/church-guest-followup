// Run 21 — Formation reports (Discipleship Tracks engine).
// GET /api/reports/formation — ADMIN + LEADER.
//
// Everything is computed from the enrollments/progress tables in one pass:
// church-scale volumes, so a single findMany + in-memory rollup is simpler
// and safer than a pile of groupBys. CORE-only progress math throughout
// (Run 16 rule: `!kind || kind === 'CORE'`), tracks ordered by
// Track.ordering (Run 18 rule).

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';

function isCoreModule(m: { kind?: string | null }): boolean {
  return !m.kind || m.kind === 'CORE';
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN', 'LEADER']);

    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    const tracks: any[] = await (prisma as any).track.findMany({
      orderBy: { ordering: 'asc' },
      include: {
        modules: { select: { id: true, weekNumber: true, title: true, kind: true }, orderBy: { weekNumber: 'asc' } },
        enrollments: {
          include: {
            guest: { select: { firstName: true, lastName: true } },
            user: { select: { name: true } },
            progress: { select: { moduleId: true, completedAt: true } },
          },
        },
      },
    });

    const trackReports = tracks.map(t => {
      const coreModules = t.modules.filter(isCoreModule);
      const coreIds = new Set(coreModules.map((m: any) => m.id));
      const totalCore = coreModules.length;

      const byStatus: Record<string, number> = { ACTIVE: 0, PAUSED: 0, COMPLETED: 0, WITHDRAWN: 0 };
      let progressPctSum = 0;
      let progressPctCount = 0; // ACTIVE + PAUSED (the in-flight people)
      let milestones = 0;
      let completions30d = 0;
      let started30d = 0;
      const weekDone: Record<string, number> = {};
      for (const m of coreModules) weekDone[m.id] = 0;

      for (const e of t.enrollments) {
        byStatus[e.status] = (byStatus[e.status] || 0) + 1;
        if (e.milestoneAt) milestones++;
        if (e.completedAt && new Date(e.completedAt) >= monthAgo) completions30d++;
        if (new Date(e.startedAt) >= monthAgo) started30d++;
        const coreDone = e.progress.filter((p: any) => coreIds.has(p.moduleId));
        if (e.status === 'ACTIVE' || e.status === 'PAUSED') {
          progressPctSum += totalCore > 0 ? (coreDone.length / totalCore) * 100 : 0;
          progressPctCount++;
        }
        if (e.status !== 'WITHDRAWN') {
          for (const p of coreDone) weekDone[p.moduleId] = (weekDone[p.moduleId] || 0) + 1;
        }
      }

      const nonWithdrawn = t.enrollments.filter((e: any) => e.status !== 'WITHDRAWN').length;

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        ordering: t.ordering,
        milestoneLabel: t.milestoneLabel,
        totalCoreWeeks: totalCore,
        totalEnrollments: t.enrollments.length,
        byStatus,
        avgProgressPct: progressPctCount > 0 ? Math.round(progressPctSum / progressPctCount) : 0,
        milestones,
        completions30d,
        started30d,
        weekFunnel: coreModules.map((m: any) => ({
          weekNumber: m.weekNumber,
          title: m.title,
          completedCount: weekDone[m.id] || 0,
          denominator: nonWithdrawn,
        })),
      };
    });

    // ── Formation pathway: Welcome → Become → Leaders ──────────────────────
    // A person is identified by their userId or guestId (whichever the
    // enrollment carries). Guest→User conversions won't chain across that
    // boundary — acceptable for a directional overview.
    const personKey = (e: any) => (e.userId ? `u:${e.userId}` : e.guestId ? `g:${e.guestId}` : null);
    const orderedTracks = tracks; // already ordering asc
    const pathway = orderedTracks.map((t, idx) => {
      const enrolledKeys = new Set(t.enrollments.map(personKey).filter(Boolean));
      const completedKeys = new Set(
        t.enrollments.filter((e: any) => e.status === 'COMPLETED').map(personKey).filter(Boolean),
      );
      let continuedFromPrev = 0;
      if (idx > 0) {
        const prevCompleted = new Set(
          orderedTracks[idx - 1].enrollments
            .filter((e: any) => e.status === 'COMPLETED')
            .map(personKey)
            .filter(Boolean),
        );
        // Array.from — Sets are not directly iterable under the project's ES5 target
        for (const k of Array.from(enrolledKeys)) if (prevCompleted.has(k)) continuedFromPrev++;
      }
      return {
        id: t.id,
        name: t.name,
        milestoneLabel: t.milestoneLabel,
        enrolled: enrolledKeys.size,
        completed: completedKeys.size,
        continuedFromPrev: idx > 0 ? continuedFromPrev : null,
      };
    });

    // ── Recent wins: latest completions + milestones across all tracks ─────
    const allEnrollments = tracks.flatMap(t =>
      t.enrollments.map((e: any) => ({
        name: e.guest ? `${e.guest.firstName} ${e.guest.lastName}`.trim() : (e.user?.name || 'Unknown'),
        trackName: t.name,
        milestoneLabel: t.milestoneLabel,
        completedAt: e.completedAt,
        milestoneAt: e.milestoneAt,
      })),
    );
    const recentCompletions = allEnrollments
      .filter(e => e.completedAt)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 10)
      .map(e => ({ name: e.name, trackName: e.trackName, at: e.completedAt }));
    const recentMilestones = allEnrollments
      .filter(e => e.milestoneAt)
      .sort((a, b) => new Date(b.milestoneAt).getTime() - new Date(a.milestoneAt).getTime())
      .slice(0, 10)
      .map(e => ({ name: e.name, trackName: e.trackName, label: e.milestoneLabel, at: e.milestoneAt }));

    return NextResponse.json({ tracks: trackReports, pathway, recentCompletions, recentMilestones });
  } catch (error) {
    return handleAuthError(error);
  }
}
