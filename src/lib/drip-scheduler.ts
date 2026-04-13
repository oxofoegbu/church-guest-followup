import prisma from './db';

/**
 * Drip campaign scheduler helpers.
 *
 * Run 4: populates `guest_drip_steps` rows for a guest based on enabled
 * `DripTemplate` rows. Run 5's cron executes PENDING rows.
 *
 * All scheduled steps use 9am (server local) on the target day. Run 6
 * cleanup script normalises historical rows to 13:00 UTC ("9am EST"). A
 * future run can revisit per-guest timezones.
 *
 * Audit logging is handled by the API routes (they own user context).
 * These helpers are pure data operations so they can be reused by the
 * intake hook and the prospect-conversion hook without faking a session.
 *
 * v1.1 hotfix: idempotency guard now only blocks on ACTIVE rows
 * (PENDING or SENT). Historical SKIPPED/FAILED rows are preserved as
 * audit trail but do not prevent re-scheduling after an enable/disable
 * cycle. (Option A per the v1 review, Pitfall #44.)
 *
 * Run 6: prospect guard. `scheduleDripStepsForGuest` used to fire on any
 * guest with `dripEnabled=true` regardless of prospect status, producing
 * pre-visit drip steps anchored on `createdAt` (since PROSPECTs have no
 * `firstVisitDate`). Found in Run 5 testing: Seth Atam had 4 PENDING
 * steps as an unconverted prospect. Guard refuses to schedule when
 * `source='PROSPECT' AND convertedToGuestAt IS NULL`; conversion via
 * `/api/prospects` (action='convert') sets `convertedToGuestAt` before
 * calling `rescheduleDripStepsForGuest`, so the guard flips off at the
 * right moment.
 */

function anchorPlusOffset(anchor: Date, dayOffset: number): Date {
  const d = new Date(anchor);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(9, 0, 0, 0);
  return d;
}

export async function scheduleDripStepsForGuest(
  guestId: string
): Promise<{ created: number; skipped: number; reason?: string }> {
  const guest = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!guest) return { created: 0, skipped: 0, reason: 'guest-not-found' };
  if (!(guest as any).dripEnabled) return { created: 0, skipped: 0, reason: 'drip-disabled' };

  // Run 6: prospect guard. Do not schedule drips for unconverted prospects —
  // their `firstVisitDate` is null, so we'd anchor on `createdAt` and produce
  // messages dated before the person has even visited. Conversion handler
  // re-invokes us via rescheduleDripStepsForGuest once convertedToGuestAt is
  // set, at which point this guard naturally flips off.
  if ((guest as any).source === 'PROSPECT' && !(guest as any).convertedToGuestAt) {
    return { created: 0, skipped: 0, reason: 'prospect-not-converted' };
  }

  const anchor = (guest as any).firstVisitDate || guest.createdAt;
  if (!anchor) return { created: 0, skipped: 0, reason: 'no-anchor-date' };

  const templates = await (prisma as any).dripTemplate.findMany({
    where: { enabled: true },
  });

  const now = new Date();
  let created = 0;
  let skipped = 0;

  for (const t of templates) {
    const scheduledFor = anchorPlusOffset(new Date(anchor), t.dayOffset);

    // Skip past-dated steps — we do not backfill messages we never sent.
    if (scheduledFor <= now) {
      skipped++;
      continue;
    }

    // Idempotency: only block if there's an ACTIVE row (PENDING or SENT)
    // for this (guest, template) pair. Historical SKIPPED / FAILED rows
    // are kept as audit trail but must not block re-scheduling
    // (Pitfall #44).
    const existing = await (prisma as any).guestDripStep.findFirst({
      where: {
        guestId,
        dripTemplateId: t.id,
        status: { in: ['PENDING', 'SENT'] },
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await (prisma as any).guestDripStep.create({
      data: {
        guestId,
        dripTemplateId: t.id,
        scheduledFor,
        status: 'PENDING',
      },
    });
    created++;
  }

  return { created, skipped };
}

export async function cancelPendingDripStepsForGuest(guestId: string): Promise<{ cancelled: number }> {
  const result = await (prisma as any).guestDripStep.updateMany({
    where: { guestId, status: 'PENDING' },
    data: { status: 'SKIPPED', errorMessage: 'Cancelled by admin/leader' },
  });
  return { cancelled: result.count };
}

export async function rescheduleDripStepsForGuest(
  guestId: string
): Promise<{ cancelled: number; created: number }> {
  const { cancelled } = await cancelPendingDripStepsForGuest(guestId);
  const { created } = await scheduleDripStepsForGuest(guestId);
  return { cancelled, created };
}
