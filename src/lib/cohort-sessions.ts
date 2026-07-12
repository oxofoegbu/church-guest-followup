// Run 22 — shared validation/normalization for TrackCohort.sessionPlan.
//
// A session plan turns a cohort from a weekly rhythm into an explicit list
// of meeting dates. Each session may cover zero or more module weeks — a
// long Saturday can cover Weeks 3 AND 4 at once; an orientation night can
// cover none. Stored on TrackCohort.sessionPlan as Json (null = weekly mode).
//
// Both the cohort POST and PATCH routes normalize through here, and the
// calendar route reads the same shape — keep this the single source of truth.

export type CohortSession = {
  date: string;          // YYYY-MM-DD
  time: string | null;   // HH:MM (24h) — null falls back to cohort.meetingTime
  weeks: number[];       // CORE module week numbers covered in this session
  label: string | null;  // e.g. "Double session", "Retreat day"
};

export const MAX_SESSIONS = 60;
export const MAX_SESSION_LABEL = 120;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Validate + normalize a raw session-plan payload from a request body.
// Returns the clean, date-sorted plan — or a human-readable error.
// undefined / null / [] all mean "no custom plan" (weekly mode) → plan: null.
export function normalizeSessionPlan(
  raw: unknown,
): { plan: CohortSession[] | null; error?: undefined } | { error: string; plan?: undefined } {
  if (raw === undefined || raw === null) return { plan: null };
  if (!Array.isArray(raw)) return { error: 'Session plan must be a list of sessions' };
  if (raw.length === 0) return { plan: null };
  if (raw.length > MAX_SESSIONS) {
    return { error: `A session plan can have at most ${MAX_SESSIONS} sessions` };
  }

  const plan: CohortSession[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i] as Record<string, unknown>;
    const n = i + 1;
    if (!s || typeof s !== 'object') return { error: `Session ${n} is not valid` };

    const date = typeof s.date === 'string' ? s.date.trim() : '';
    if (!DATE_RE.test(date) || isNaN(Date.parse(`${date}T00:00:00Z`))) {
      return { error: `Session ${n} needs a valid date` };
    }

    let time: string | null = null;
    if (s.time !== undefined && s.time !== null && s.time !== '') {
      if (typeof s.time !== 'string' || !TIME_RE.test(s.time)) {
        return { error: `Session ${n} has an invalid time (use HH:MM, 24-hour)` };
      }
      time = s.time;
    }

    const weeksRaw = s.weeks === undefined || s.weeks === null ? [] : s.weeks;
    if (!Array.isArray(weeksRaw)) {
      return { error: `Session ${n}: weeks must be a list of week numbers` };
    }
    const weeks: number[] = [];
    for (let j = 0; j < weeksRaw.length; j++) {
      const w = weeksRaw[j];
      const num = typeof w === 'number' ? w : parseInt(String(w), 10);
      if (!Number.isInteger(num) || num < 0 || num > 99) {
        return { error: `Session ${n} has an invalid week number` };
      }
      if (weeks.indexOf(num) === -1) weeks.push(num);
    }
    weeks.sort((a, b) => a - b);

    let label: string | null = null;
    if (s.label !== undefined && s.label !== null && String(s.label).trim() !== '') {
      label = String(s.label).trim().slice(0, MAX_SESSION_LABEL);
    }

    plan.push({ date, time, weeks, label });
  }

  plan.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { plan };
}

// Read a stored sessionPlan value defensively (DB Json → typed array).
export function readSessionPlan(value: unknown): CohortSession[] {
  return Array.isArray(value) ? (value as CohortSession[]) : [];
}

// First session date at UTC midnight (the app-wide calendar-date rule).
export function planStartDate(plan: CohortSession[]): Date {
  return new Date(`${plan[0].date}T00:00:00.000Z`);
}

// Human label for a session's covered weeks: "Week 3" / "Weeks 3 & 4".
export function weeksLabel(weeks: number[]): string {
  if (!weeks || weeks.length === 0) return '';
  if (weeks.length === 1) return `Week ${weeks[0]}`;
  return `Weeks ${weeks.join(' & ')}`;
}
