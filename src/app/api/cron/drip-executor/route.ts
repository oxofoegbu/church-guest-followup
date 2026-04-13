/**
 * /api/cron/drip-executor  (Run 5)
 * ---------------------------------------------------------------------------
 * Daily cron at 14:00 UTC. Picks up all PENDING GuestDripSteps whose
 * scheduledFor <= now(), applies the safety filters (guest.dripEnabled,
 * guest.dripPausedAt, dripTemplate.enabled, template deletion), renders the
 * template, and sends via Resend (EMAIL) or Whapi (WHATSAPP).
 *
 * Race prevention — Option C:
 * Vercel Hobby cron fires once per day. We accept the limitation that if the
 * executor is manually re-triggered mid-run, it could theoretically double-
 * send a row whose status update has not yet landed. In practice the risk is
 * vanishingly small because (a) manual triggers are rare and gated on
 * CRON_SECRET, (b) we flip status SYNCHRONOUSLY right after the send
 * attempt resolves, and (c) rows are processed serially. If we ever observe
 * a double-send, Run 6 upgrades to a claim-and-send pattern via a SENDING
 * enum value or an attemptStartedAt timestamp (Option A/B). See 04_PITFALLS
 * notes for Run 5.
 *
 * Timezone: scheduledFor is stored as "9am local" UTC-naïvely (see Run 4's
 * scheduler). 14:00 UTC = 9am EST / 10am EDT, which matches our US-based
 * guest base. Run 6 revisits per-guest timezones.
 *
 * Auth: mirrors /api/cron/schedule-reminders exactly — x-vercel-cron: 1
 * OR Authorization: Bearer ${CRON_SECRET}.
 *
 * DRIP_DRY_RUN: when env var === '1' or 'true', everything runs EXCEPT the
 * actual Resend/Whapi call. Step still transitions to SENT but errorMessage
 * is set to '[DRY RUN] not actually sent' so the row is distinguishable.
 * ---------------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit';
import {
  renderMustache,
  buildDripEmailHtml,
  sendDripEmail,
  sendDripWhatsApp,
  resolveDripVars,
} from '@/lib/drip-sender';

type SendOutcome =
  | { kind: 'sent'; providerMessageId: string | null }
  | { kind: 'failed'; errorMessage: string }
  | { kind: 'skipped'; errorMessage: string };

function isDryRun(): boolean {
  const v = (process.env.DRIP_DRY_RUN || '').toLowerCase();
  return v === '1' || v === 'true';
}

function truncateError(msg: string, max = 500): string {
  if (!msg) return 'Unknown error';
  return msg.length > max ? msg.slice(0, max) : msg;
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  const dryRun = isDryRun();

  // ── Auth (identical pattern to /api/cron/schedule-reminders) ──
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let paused = 0;

  try {
    // Grab all PENDING steps that are due, with guest + template joined.
    // `as any` because Run 4 tolerated this on the per-guest route (Pitfall #11).
    const dueSteps: any[] = await (prisma as any).guestDripStep.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
      },
      include: {
        guest: {
          include: {
            assignedVolunteer: { select: { id: true, name: true } },
          },
        },
        dripTemplate: true,
      },
      orderBy: { scheduledFor: 'asc' },
    });

    for (const step of dueSteps) {
      processed++;

      const guest = step.guest;
      const template = step.dripTemplate;
      const guestName = guest ? `${guest.firstName} ${guest.lastName}` : '(unknown)';

      // ── Filter 1: template deleted (Pitfall #10 applies — join may be null)
      // Pitfall #44 says: don't leave PENDING, or it gets re-picked every day.
      if (!template) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: {
            status: 'SKIPPED',
            errorMessage: 'Template deleted',
          },
        });
        skipped++;
        continue;
      }

      // ── Filter 2: guest drip disabled → SKIP permanently
      if (!guest || guest.dripEnabled === false) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: {
            status: 'SKIPPED',
            errorMessage: 'Guest drip disabled',
          },
        });
        skipped++;
        continue;
      }

      // ── Filter 3: guest paused → LEAVE PENDING (fires next cron after resume)
      if (guest.dripPausedAt != null) {
        paused++;
        continue;
      }

      // ── Filter 4: template disabled at send time → SKIP
      if (template.enabled === false) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: {
            status: 'SKIPPED',
            errorMessage: 'Template disabled at send time',
          },
        });
        skipped++;
        continue;
      }

      // ── Validate contact info for this channel
      const channel: 'EMAIL' | 'WHATSAPP' = template.channel;
      if (channel === 'EMAIL' && !guest.email) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: {
            status: 'SKIPPED',
            errorMessage: 'Guest has no email address',
          },
        });
        skipped++;
        continue;
      }
      if (channel === 'WHATSAPP' && !guest.phone) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: {
            status: 'SKIPPED',
            errorMessage: 'Guest has no phone number',
          },
        });
        skipped++;
        continue;
      }

      // ── Render + send
      const vars = resolveDripVars({
        guestFirstName: guest.firstName || 'friend',
        assignedVolunteerName: guest.assignedVolunteer?.name || null,
      });

      const outcome: SendOutcome = await sendOne({
        channel,
        template,
        guest,
        vars,
        dryRun,
      });

      // ── Apply outcome to the step + audit log
      if (outcome.kind === 'sent') {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            errorMessage: dryRun ? '[DRY RUN] not actually sent' : null,
          },
        });
        sent++;
        // Audit best-effort — already wrapped in try/catch inside logAudit
        await logAudit({
          action: 'DRIP_STEP_SENT',
          category: 'DRIP',
          description: `${dryRun ? '[DRY RUN] ' : ''}Sent "${template.name}" (${channel}) to ${guestName}`,
          targetId: guest.id,
          targetType: 'GUEST',
          targetName: guestName,
          metadata: {
            guestDripStepId: step.id,
            templateId: template.id,
            channel,
            dryRun,
            providerMessageId: outcome.providerMessageId,
          },
        });
      } else if (outcome.kind === 'failed') {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: {
            status: 'FAILED',
            errorMessage: truncateError(outcome.errorMessage),
          },
        });
        failed++;
        await logAudit({
          action: 'DRIP_STEP_FAILED',
          category: 'DRIP',
          description: `Failed to send "${template.name}" (${channel}) to ${guestName}: ${truncateError(outcome.errorMessage, 200)}`,
          targetId: guest.id,
          targetType: 'GUEST',
          targetName: guestName,
          metadata: {
            guestDripStepId: step.id,
            templateId: template.id,
            channel,
            errorMessage: truncateError(outcome.errorMessage),
          },
        });
      } else {
        // kind === 'skipped' — a runtime skip decided inside sendOne
        // (currently not used, but future-proofs the dispatcher)
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: {
            status: 'SKIPPED',
            errorMessage: truncateError(outcome.errorMessage),
          },
        });
        skipped++;
      }
    }

    const durationMs = Date.now() - start;
    const banner = dryRun ? '=== DRY RUN MODE ===' : undefined;
    return NextResponse.json({
      banner,
      processed,
      sent,
      failed,
      skipped,
      paused,
      durationMs,
      at: now.toISOString(),
    });
  } catch (err: any) {
    console.error('[drip-executor] fatal:', err?.message || err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err?.message,
        processed,
        sent,
        failed,
        skipped,
        paused,
        durationMs: Date.now() - start,
      },
      { status: 500 }
    );
  }
}

async function sendOne(args: {
  channel: 'EMAIL' | 'WHATSAPP';
  template: any;
  guest: any;
  vars: Record<string, string>;
  dryRun: boolean;
}): Promise<SendOutcome> {
  const { channel, template, guest, vars, dryRun } = args;

  if (channel === 'EMAIL') {
    const subject = renderMustache(template.subject || template.name || 'A note from Grace Life Center', vars, { escape: 'none' });
    const bodyHtmlSafe = renderMustache(template.body || '', vars, { escape: 'html' });
    const html = buildDripEmailHtml({ subject, renderedBody: bodyHtmlSafe });

    if (dryRun) {
      console.log('[drip-executor][DRY RUN] EMAIL', {
        to: guest.email,
        subject,
        bodyPreview: (template.body || '').slice(0, 200),
      });
      return { kind: 'sent', providerMessageId: null };
    }

    const result = await sendDripEmail({ to: guest.email, subject, html });
    if (result.error) return { kind: 'failed', errorMessage: result.error };
    return { kind: 'sent', providerMessageId: result.id || null };
  }

  // WHATSAPP
  const body = renderMustache(template.body || '', vars, { escape: 'none' });

  if (dryRun) {
    console.log('[drip-executor][DRY RUN] WHATSAPP', {
      toPhone: guest.phone,
      bodyPreview: body.slice(0, 200),
    });
    return { kind: 'sent', providerMessageId: null };
  }

  const result = await sendDripWhatsApp({ toPhone: guest.phone, body });
  if (result.error) return { kind: 'failed', errorMessage: result.error };
  return { kind: 'sent', providerMessageId: result.id || null };
}

export { GET as POST };
