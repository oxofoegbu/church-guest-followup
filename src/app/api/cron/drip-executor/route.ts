/**
 * /api/cron/drip-executor  (Run 6)
 * ---------------------------------------------------------------------------
 * Daily cron at 14:00 UTC. Picks up all PENDING GuestDripSteps whose
 * scheduledFor <= now(), applies the safety filters (guest.dripEnabled,
 * guest.dripPausedAt, dripTemplate.enabled, template deletion), renders the
 * template, and sends via Resend (EMAIL) or Whapi (WHATSAPP).
 *
 * Run 6 additions:
 *   - Fetches `church_name` from AppSetting ONCE at the start of the run
 *     and threads it through resolveDripVars + buildDripEmailHtml. Falls
 *     back to DEFAULT_CHURCH_NAME if the setting is missing, so the cron
 *     never crashes on a fresh DB.
 *   - Writes a `DripSendLog` row after every SENT or FAILED outcome,
 *     best-effort: wrapped in try/catch so a log-write failure does NOT
 *     roll back the PENDING → SENT/FAILED status transition (Pitfall #45).
 *     The log row captures rendered subject + body for "what did this guest
 *     actually receive?" audit queries.
 *   - Prospect-guard ride-along: the scheduler now refuses to schedule
 *     steps for unconverted prospects, so the executor naturally sees fewer
 *     PENDINGs that would need a late-stage skip. No executor code change
 *     required — behavior is correct via upstream filtering.
 *
 * v1.2 carryover: `truncateError` coerces any input to string. Providers
 * occasionally return non-string error payloads (Whapi 402 trial-limit with
 * { code, message }); without coercion Prisma would throw on the update and
 * abort the whole cron run.
 *
 * Race prevention — Option C:
 * Vercel Hobby cron fires once per day. We accept the limitation that if the
 * executor is manually re-triggered mid-run, it could theoretically double-
 * send a row whose status update has not yet landed. In practice the risk is
 * vanishingly small because (a) manual triggers are rare and gated on
 * CRON_SECRET, (b) status is flipped SYNCHRONOUSLY right after the send
 * attempt resolves, and (c) rows are processed serially.
 *
 * Timezone: scheduledFor is stored as "9am local" → 13:00 UTC
 * (Run 6 cleanup normalised historical 09:00 UTC rows to 13:00 UTC to match).
 * Per-guest timezones are a future-run concern.
 *
 * Auth: mirrors /api/cron/schedule-reminders — x-vercel-cron: 1 OR
 * Authorization: Bearer ${CRON_SECRET}.
 *
 * DRIP_DRY_RUN: when env var === '1' or 'true', everything runs EXCEPT the
 * actual Resend/Whapi call. Step still transitions to SENT but errorMessage
 * is set to '[DRY RUN] not actually sent' so the row is distinguishable.
 * DripSendLog rows from dry-run are also marked (see `status` + providerMessageId).
 * ---------------------------------------------------------------------------
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { getAppSettingOr } from '@/lib/settings';
import {
  renderMustache,
  buildDripEmailHtml,
  sendDripEmail,
  sendDripWhatsApp,
  resolveDripVars,
  DEFAULT_CHURCH_NAME,
} from '@/lib/drip-sender';

type SendOutcome =
  | {
      kind: 'sent';
      providerMessageId: string | null;
      renderedSubject: string | null;
      renderedBody: string;
    }
  | {
      kind: 'failed';
      errorMessage: string;
      renderedSubject: string | null;
      renderedBody: string;
    }
  | { kind: 'skipped'; errorMessage: string };

function isDryRun(): boolean {
  const v = (process.env.DRIP_DRY_RUN || '').toLowerCase();
  return v === '1' || v === 'true';
}

// v1.2 hotfix: coerce any input to string. Providers (Whapi, Resend) can
// return non-string error payloads. Writing a non-string into Prisma's
// String? column throws and aborts the entire cron run.
function truncateError(msg: any, max = 500): string {
  if (msg == null) return 'Unknown error';
  let str: string;
  if (typeof msg === 'string') {
    str = msg;
  } else {
    try {
      str = JSON.stringify(msg);
    } catch {
      str = String(msg);
    }
  }
  if (!str) return 'Unknown error';
  return str.length > max ? str.slice(0, max) : str;
}

// Run 6 best-effort write to DripSendLog. NEVER throws to caller.
async function writeDripSendLog(args: {
  guestDripStepId: string;
  guestId: string;
  channel: 'EMAIL' | 'WHATSAPP';
  status: 'SENT' | 'FAILED';
  providerMessageId: string | null;
  errorMessage: string | null;
  subjectRendered: string | null;
  bodyRendered: string;
}): Promise<void> {
  try {
    await (prisma as any).dripSendLog.create({
      data: {
        guestDripStepId: args.guestDripStepId,
        guestId: args.guestId,
        channel: args.channel,
        status: args.status,
        providerMessageId: args.providerMessageId,
        errorMessage: args.errorMessage,
        subjectRendered: args.subjectRendered,
        bodyRendered: args.bodyRendered,
      },
    });
  } catch (logErr: any) {
    // Pitfall #45: best-effort hooks must never fail the primary transaction.
    // The step row is already terminal; a failed log write is telemetry loss,
    // not correctness loss.
    console.error(
      '[drip-executor] DripSendLog write failed (non-fatal):',
      logErr?.message || logErr
    );
  }
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

  // Run 6: fetch churchName ONCE per run (best-effort — fall back to
  // constant if the AppSetting row is missing, so we never 500 the cron
  // on a fresh DB).
  let churchName = DEFAULT_CHURCH_NAME;
  try {
    churchName = await getAppSettingOr('church_name', DEFAULT_CHURCH_NAME);
  } catch (e: any) {
    console.error('[drip-executor] getAppSetting(church_name) failed, using default:', e?.message || e);
  }

  const now = new Date();

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let paused = 0;

  try {
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

      // ── Filter 1: template deleted
      if (!template) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED', errorMessage: 'Template deleted' },
        });
        skipped++;
        continue;
      }

      // ── Filter 2: guest drip disabled → SKIP permanently
      if (!guest || guest.dripEnabled === false) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED', errorMessage: 'Guest drip disabled' },
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
          data: { status: 'SKIPPED', errorMessage: 'Template disabled at send time' },
        });
        skipped++;
        continue;
      }

      // ── Validate contact info for this channel
      const channel: 'EMAIL' | 'WHATSAPP' = template.channel;
      if (channel === 'EMAIL' && !guest.email) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED', errorMessage: 'Guest has no email address' },
        });
        skipped++;
        continue;
      }
      if (channel === 'WHATSAPP' && !guest.phone) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED', errorMessage: 'Guest has no phone number' },
        });
        skipped++;
        continue;
      }

      // ── Render + send
      const vars = resolveDripVars({
        guestFirstName: guest.firstName || 'friend',
        assignedVolunteerName: guest.assignedVolunteer?.name || null,
        churchName,
      });

      const outcome: SendOutcome = await sendOne({
        channel,
        template,
        guest,
        vars,
        dryRun,
        churchName,
      });

      // ── Apply outcome to the step + audit log + DripSendLog
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

        // Run 6: best-effort DripSendLog write (Pitfall #45)
        await writeDripSendLog({
          guestDripStepId: step.id,
          guestId: guest.id,
          channel,
          status: 'SENT',
          providerMessageId: outcome.providerMessageId,
          errorMessage: dryRun ? '[DRY RUN]' : null,
          subjectRendered: outcome.renderedSubject,
          bodyRendered: outcome.renderedBody,
        });
      } else if (outcome.kind === 'failed') {
        const errMsg = truncateError(outcome.errorMessage);
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'FAILED', errorMessage: errMsg },
        });
        failed++;

        await logAudit({
          action: 'DRIP_STEP_FAILED',
          category: 'DRIP',
          description: `Failed to send "${template.name}" (${channel}) to ${guestName}: ${truncateError(
            outcome.errorMessage,
            200
          )}`,
          targetId: guest.id,
          targetType: 'GUEST',
          targetName: guestName,
          metadata: {
            guestDripStepId: step.id,
            templateId: template.id,
            channel,
            errorMessage: errMsg,
          },
        });

        // Run 6: best-effort DripSendLog write (Pitfall #45)
        await writeDripSendLog({
          guestDripStepId: step.id,
          guestId: guest.id,
          channel,
          status: 'FAILED',
          providerMessageId: null,
          errorMessage: errMsg,
          subjectRendered: outcome.renderedSubject,
          bodyRendered: outcome.renderedBody,
        });
      } else {
        // kind === 'skipped' — runtime skip from sendOne (unused currently).
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED', errorMessage: truncateError(outcome.errorMessage) },
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
      churchName,
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
  churchName: string;
}): Promise<SendOutcome> {
  const { channel, template, guest, vars, dryRun, churchName } = args;

  if (channel === 'EMAIL') {
    const subject = renderMustache(
      template.subject || template.name || `A note from ${churchName}`,
      vars,
      { escape: 'none' }
    );
    const bodyHtmlSafe = renderMustache(template.body || '', vars, { escape: 'html' });
    const bodyPlain = renderMustache(template.body || '', vars, { escape: 'none' });
    const html = buildDripEmailHtml({ subject, renderedBody: bodyHtmlSafe, churchName });

    if (dryRun) {
      console.log('[drip-executor][DRY RUN] EMAIL', {
        to: guest.email,
        subject,
        bodyPreview: bodyPlain.slice(0, 200),
      });
      return {
        kind: 'sent',
        providerMessageId: null,
        renderedSubject: subject,
        renderedBody: bodyPlain,
      };
    }

    const result = await sendDripEmail({
      to: guest.email,
      subject,
      html,
      fromNameOverride: churchName,
    });
    if (result.error) {
      return {
        kind: 'failed',
        errorMessage: result.error,
        renderedSubject: subject,
        renderedBody: bodyPlain,
      };
    }
    return {
      kind: 'sent',
      providerMessageId: result.id || null,
      renderedSubject: subject,
      renderedBody: bodyPlain,
    };
  }

  // WHATSAPP
  const body = renderMustache(template.body || '', vars, { escape: 'none' });

  if (dryRun) {
    console.log('[drip-executor][DRY RUN] WHATSAPP', {
      toPhone: guest.phone,
      bodyPreview: body.slice(0, 200),
    });
    return {
      kind: 'sent',
      providerMessageId: null,
      renderedSubject: null,
      renderedBody: body,
    };
  }

  const result = await sendDripWhatsApp({ toPhone: guest.phone, body });
  if (result.error) {
    return {
      kind: 'failed',
      errorMessage: result.error,
      renderedSubject: null,
      renderedBody: body,
    };
  }
  return {
    kind: 'sent',
    providerMessageId: result.id || null,
    renderedSubject: null,
    renderedBody: body,
  };
}

export { GET as POST };
