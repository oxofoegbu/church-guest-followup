import prisma from './db';

/**
 * Drip campaign scheduler helpers.
 *
 * Run 4: populates `guest_drip_steps` rows for a guest based on enabled
 * `DripTemplate` rows. Run 5's cron will execute PENDING rows.
 *
 * All scheduled steps use 9am (server local) on the target day. Run 5 can
 * revisit this to respect guest timezone.
 *
 * Audit logging is handled by the API routes (they own user context).
 * These helpers are pure data operations so they can be reused by the
 * intake hook and the prospect-conversion hook without faking a session.
 */

function anchorPlusOffset(anchor: Date, dayOffset: number): Date {
  const d = new Date(anchor);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(9, 0, 0, 0);
  return d;
}

export async function scheduleDripStepsForGuest(guestId: string): Promise<{ created: number; skipped: number }> {
  const guest = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!guest) return { created: 0, skipped: 0 };
  if (!(guest as any).dripEnabled) return { created: 0, skipped: 0 };

  const anchor = (guest as any).firstVisitDate || guest.createdAt;
  if (!anchor) return { created: 0, skipped: 0 };

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

    // Idempotency: don't duplicate an existing (guest, template) row.
    const existing = await (prisma as any).guestDripStep.findFirst({
      where: { guestId, dripTemplateId: t.id },
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

export async function rescheduleDripStepsForGuest(guestId: string): Promise<{ cancelled: number; created: number }> {
  const { cancelled } = await cancelPendingDripStepsForGuest(guestId);
  const { created } = await scheduleDripStepsForGuest(guestId);
  return { cancelled, created };
}
