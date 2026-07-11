// Run 21 — discipler nudges.
// Daily job: find ACTIVE track enrollments whose participant has gone quiet
// (no module completed and no reflection saved in `track_nudge_days` days,
// counting from enrollment start if they never did anything), and email each
// discipler ONE digest listing their quiet disciples.
//
// Anti-spam: after a successful send, every included enrollment gets
// `lastNudgeAt = now`, and an enrollment is skipped while lastNudgeAt is
// inside the same window — so a given disciple is mentioned at most once per
// `track_nudge_days` days.
//
// Settings (AppSetting, editable in ⚙️ Settings → 🌱 Discipleship Tracks):
//   track_nudge_enabled  'true' | 'false'   (default 'true')
//   track_nudge_days     '1'..'90'          (default '7')
//
// Email-only by design — Whapi/WhatsApp is parked (fire-safe rule). The whole
// run is fire-safe: a send failure just skips the lastNudgeAt stamp so those
// enrollments are retried on the next run.

import prisma from './db';
import { logAudit } from './audit';
import { getAppSettingOr } from './settings';
import { sendDisciplerNudgeEmail, NudgeDisciple } from './enrollment-notifications';

const DEFAULT_NUDGE_DAYS = 7;

function isCoreModule(m: { kind?: string | null }): boolean {
  return !m.kind || m.kind === 'CORE';
}

export type NudgeRunSummary = {
  enabled: boolean;
  nudgeDays: number;
  candidates: number;   // ACTIVE enrollments with an emailable discipler
  quiet: number;        // of those, quiet past the threshold + off cooldown
  emailsSent: number;   // one per discipler
  emailsFailed: number;
  disciplesNudged: number; // enrollments stamped lastNudgeAt
};

export async function runTrackNudges(now: Date = new Date()): Promise<NudgeRunSummary> {
  const summary: NudgeRunSummary = {
    enabled: true, nudgeDays: DEFAULT_NUDGE_DAYS,
    candidates: 0, quiet: 0, emailsSent: 0, emailsFailed: 0, disciplesNudged: 0,
  };

  // Settings — best-effort with safe defaults so the cron never 500s on a
  // fresh DB (same pattern as the drip executor's church_name read).
  let enabled = true;
  let nudgeDays = DEFAULT_NUDGE_DAYS;
  try {
    enabled = (await getAppSettingOr('track_nudge_enabled', 'true')) !== 'false';
    const parsed = parseInt(await getAppSettingOr('track_nudge_days', String(DEFAULT_NUDGE_DAYS)), 10);
    if (Number.isFinite(parsed)) nudgeDays = Math.min(90, Math.max(1, parsed));
  } catch (e: any) {
    console.error('[track-nudges] settings read failed, using defaults:', e?.message || e);
  }
  summary.enabled = enabled;
  summary.nudgeDays = nudgeDays;
  if (!enabled) return summary;

  const cutoff = new Date(now.getTime() - nudgeDays * 86400000);

  // Every ACTIVE enrollment that has a discipler we can actually email.
  const enrollments: any[] = await (prisma as any).trackEnrollment.findMany({
    where: {
      status: 'ACTIVE',
      disciplerUserId: { not: null },
      discipler: { active: true, email: { not: '' } },
    },
    include: {
      discipler: { select: { id: true, name: true, email: true } },
      track: { select: { name: true, ordering: true, modules: { select: { id: true, kind: true } } } },
      guest: { select: { firstName: true, lastName: true } },
      user: { select: { name: true } },
      progress: { select: { moduleId: true, completedAt: true } },
    },
  });
  summary.candidates = enrollments.length;
  if (enrollments.length === 0) return summary;

  // Latest reflection activity per enrollment (one grouped query — avoids
  // dragging every reflection row along).
  const reflectionMax: any[] = await (prisma as any).moduleReflection.groupBy({
    by: ['enrollmentId'],
    where: { enrollmentId: { in: enrollments.map(e => e.id) } },
    _max: { updatedAt: true },
  });
  const lastReflectionAt = new Map<string, Date>();
  for (const row of reflectionMax) {
    if (row._max?.updatedAt) lastReflectionAt.set(row.enrollmentId, new Date(row._max.updatedAt));
  }

  // Group quiet enrollments per discipler.
  const perDiscipler = new Map<string, { name: string; email: string; disciples: NudgeDisciple[]; enrollmentIds: string[] }>();

  for (const e of enrollments) {
    const coreIds = new Set(e.track.modules.filter(isCoreModule).map((m: any) => m.id));
    const coreProgress = e.progress.filter((p: any) => coreIds.has(p.moduleId));
    // Nothing left to nudge about once every core week is done — completing
    // the track (Mark Completed) is a leader step, not the disciple's.
    if (coreIds.size > 0 && coreProgress.length >= coreIds.size) continue;

    // Last sign of life: latest module completion or reflection save,
    // falling back to when they started the track.
    let lastActivity = new Date(e.startedAt);
    for (const p of coreProgress) {
      const t = new Date(p.completedAt);
      if (t > lastActivity) lastActivity = t;
    }
    const r = lastReflectionAt.get(e.id);
    if (r && r > lastActivity) lastActivity = r;

    if (lastActivity > cutoff) continue;                          // recently active
    if (e.lastNudgeAt && new Date(e.lastNudgeAt) > cutoff) continue; // cooldown

    const name = e.guest ? `${e.guest.firstName} ${e.guest.lastName}`.trim() : (e.user?.name || 'Unknown');
    const daysQuiet = Math.floor((now.getTime() - lastActivity.getTime()) / 86400000);

    const entry = perDiscipler.get(e.discipler.id) || {
      name: e.discipler.name as string,
      email: e.discipler.email as string,
      disciples: [] as NudgeDisciple[],
      enrollmentIds: [] as string[],
    };
    entry.disciples.push({
      name,
      trackName: e.track.name,
      progressLabel: `${coreProgress.length}/${coreIds.size} weeks`,
      daysQuiet,
    });
    entry.enrollmentIds.push(e.id);
    perDiscipler.set(e.discipler.id, entry);
    summary.quiet++;
  }

  if (perDiscipler.size === 0) return summary;

  // Array.from — Maps are not directly iterable under the project's ES5 target
  for (const entry of Array.from(perDiscipler.values())) {
    entry.disciples.sort((a, b) => b.daysQuiet - a.daysQuiet);
    const ok = await sendDisciplerNudgeEmail({
      disciplerName: entry.name,
      disciplerEmail: entry.email,
      nudgeDays,
      disciples: entry.disciples,
    });
    if (ok) {
      summary.emailsSent++;
      try {
        await (prisma as any).trackEnrollment.updateMany({
          where: { id: { in: entry.enrollmentIds } },
          data: { lastNudgeAt: now },
        });
        summary.disciplesNudged += entry.enrollmentIds.length;
      } catch (e: any) {
        // Stamp failure just means these enrollments are retried tomorrow.
        console.error('[track-nudges] lastNudgeAt stamp failed:', e?.message || e);
      }
    } else {
      summary.emailsFailed++;
    }
  }

  if (summary.emailsSent > 0) {
    try {
      await logAudit({
        action: 'TRACK_NUDGES_SENT', category: 'TRACK',
        description: `Discipler nudges: ${summary.emailsSent} email(s) covering ${summary.disciplesNudged} quiet disciple(s) (threshold ${nudgeDays} days)`,
        metadata: { ...summary },
      });
    } catch (e: any) {
      console.error('[track-nudges] audit log failed:', e?.message || e);
    }
  }

  return summary;
}
