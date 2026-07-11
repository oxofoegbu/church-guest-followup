/**
 * /api/cron/track-nudges  (Run 21)
 * ---------------------------------------------------------------------------
 * Daily cron at 12:00 UTC (see vercel.json). Emails each discipler one digest
 * of their ACTIVE disciples who have gone quiet — no module completed and no
 * reflection saved for `track_nudge_days` days (default 7, editable in
 * ⚙️ Settings → 🌱 Discipleship Tracks, along with an on/off toggle).
 *
 * All the logic lives in src/lib/track-nudges.ts (runTrackNudges), so it can
 * be reused or triggered manually. Anti-spam via TrackEnrollment.lastNudgeAt.
 *
 * Email-only — Whapi/WhatsApp is parked; every sender is fire-safe.
 *
 * Auth: identical pattern to the other crons — x-vercel-cron: 1 OR
 * Authorization: Bearer ${CRON_SECRET}.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runTrackNudges } from '@/lib/track-nudges';

export async function GET(request: NextRequest) {
  const start = Date.now();

  // ── Auth (identical pattern to /api/cron/schedule-reminders) ──
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await runTrackNudges();
    return NextResponse.json({ ok: true, ...summary, tookMs: Date.now() - start });
  } catch (error: any) {
    console.error('[track-nudges] cron failed:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Internal error', tookMs: Date.now() - start },
      { status: 500 },
    );
  }
}
