/**
 * /api/reports/drip  (Run 6)
 * ---------------------------------------------------------------------------
 * Aggregated drip campaign metrics for the Reports → Drip tab.
 *
 * Returns:
 *   - perTemplate[]: per-template send counts (total / sent / failed /
 *     skipped / pending, plus sent30d/failed30d and successRate).
 *   - pendingNext7d[]: upcoming sends in the next 7 days (ops preview).
 *   - failedLast30d[]: recent failures (triage list).
 *   - pausedGuests[]: guests paused >14 days (re-engagement candidates).
 *   - channelBreakdown: DripSendLog counts per channel × status.
 *
 * Auth: getSession() (no args — Pitfall #7). Admin or Leader role required.
 *
 * Note: some counts come from GuestDripStep (the step lifecycle truth),
 * others from DripSendLog (actual send telemetry). Where both are
 * available and in agreement we prefer DripSendLog because it captures
 * the outbound event directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Permission gate: Admin + Leader can view reports.
  const customRolesRow = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
  const customRolesJson = customRolesRow?.value || '[]';
  const level = getPermissionLevel((session as any).role, customRolesJson);
  if (level !== 'ADMIN_ACCESS' && level !== 'LEADER_ACCESS') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ago14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // ── Per-template metrics ───────────────────────────────────────────────
  const templates: any[] = await (prisma as any).dripTemplate.findMany({
    orderBy: [{ dayOffset: 'asc' }, { name: 'asc' }],
  });

  const perTemplate = [];
  for (const t of templates) {
    const [total, sentCount, failedCount, skippedCount, pendingCount, sent30d, failed30d] =
      await Promise.all([
        (prisma as any).guestDripStep.count({ where: { dripTemplateId: t.id } }),
        (prisma as any).guestDripStep.count({ where: { dripTemplateId: t.id, status: 'SENT' } }),
        (prisma as any).guestDripStep.count({ where: { dripTemplateId: t.id, status: 'FAILED' } }),
        (prisma as any).guestDripStep.count({
          where: { dripTemplateId: t.id, status: 'SKIPPED' },
        }),
        (prisma as any).guestDripStep.count({
          where: { dripTemplateId: t.id, status: 'PENDING' },
        }),
        (prisma as any).guestDripStep.count({
          where: { dripTemplateId: t.id, status: 'SENT', sentAt: { gte: ago30d } },
        }),
        (prisma as any).guestDripStep.count({
          where: { dripTemplateId: t.id, status: 'FAILED', updatedAt: { gte: ago30d } },
        }),
      ]);
    const successBase = sentCount + failedCount;
    const successRate = successBase > 0 ? Math.round((sentCount / successBase) * 100) : null;
    perTemplate.push({
      id: t.id,
      name: t.name,
      channel: t.channel,
      dayOffset: t.dayOffset,
      enabled: t.enabled,
      total,
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
      pending: pendingCount,
      sent30d,
      failed30d,
      successRate,
    });
  }

  // ── Upcoming sends ─────────────────────────────────────────────────────
  const pendingNext7d: any[] = await (prisma as any).guestDripStep.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { gte: now, lte: in7d },
    },
    include: {
      guest: { select: { id: true, firstName: true, lastName: true } },
      dripTemplate: { select: { id: true, name: true, channel: true } },
    },
    orderBy: { scheduledFor: 'asc' },
    take: 100,
  });

  // ── Failures in last 30d (ops triage) ──────────────────────────────────
  const failedLast30d: any[] = await (prisma as any).guestDripStep.findMany({
    where: {
      status: 'FAILED',
      updatedAt: { gte: ago30d },
    },
    include: {
      guest: { select: { id: true, firstName: true, lastName: true } },
      dripTemplate: { select: { id: true, name: true, channel: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  // ── Paused >14d ────────────────────────────────────────────────────────
  const pausedGuests: any[] = await prisma.guest.findMany({
    where: {
      AND: [
        { dripPausedAt: { not: null } },
        { dripPausedAt: { lte: ago14d } },
      ],
    } as any,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dripPausedAt: true,
    } as any,
    orderBy: { dripPausedAt: 'asc' } as any,
    take: 100,
  });

  // ── Channel breakdown from DripSendLog (actual send telemetry) ─────────
  const [emailSent, emailFailed, whatsappSent, whatsappFailed] = await Promise.all([
    (prisma as any).dripSendLog.count({ where: { channel: 'EMAIL', status: 'SENT' } }),
    (prisma as any).dripSendLog.count({ where: { channel: 'EMAIL', status: 'FAILED' } }),
    (prisma as any).dripSendLog.count({ where: { channel: 'WHATSAPP', status: 'SENT' } }),
    (prisma as any).dripSendLog.count({ where: { channel: 'WHATSAPP', status: 'FAILED' } }),
  ]);

  return NextResponse.json({
    perTemplate,
    pendingNext7d,
    failedLast30d,
    pausedGuests,
    channelBreakdown: {
      EMAIL: { sent: emailSent, failed: emailFailed },
      WHATSAPP: { sent: whatsappSent, failed: whatsappFailed },
    },
    generatedAt: now.toISOString(),
  });
}
