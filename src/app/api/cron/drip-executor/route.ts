/**
 * /api/cron/drip-executor  (Run 6)
 * ---------------------------------------------------------------------------
 * Daily cron at 14:00 UTC. Picks up all PENDING GuestDripSteps whose
 * scheduledFor <= now(), applies the safety filters (guest.dripEnabled,
 * guest.dripPausedAt, dripTemplate.enabled, template deletion), renders the
 * template, and sends via Resend (EMAIL) or the Meta Cloud API (WHATSAPP).
 *
 * Run 61: WhatsApp drip sends moved off the dead Whapi gateway onto the
 * same Meta Cloud API path guest_assignment/role_assignment already use
 * (src/lib/whatsapp.ts). A WHATSAPP-channel DripTemplate now also carries
 * `recipient` (GUEST or VOLUNTEER — who actually receives it) and
 * `whatsappTemplateKey` (which approved Meta template to send). A WhatsApp
 * step with no whatsappTemplateKey assigned is SKIPPED rather than
 * silently falling back to anything — there is no more Whapi fallback.
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
  resolveDripVars,
  DEFAULT_CHURCH_NAME,
} from '@/lib/drip-sender';
// Run 61 — drip WhatsApp moved off the dead Whapi gateway onto the same
// Meta Cloud API path guest_assignment/role_assignment already use.
import { sendWhatsAppTemplate, WA_TEMPLATES, type WaTemplateKey } from '@/lib/whatsapp';

// Run 61 — exact param order for each approved Meta template, built from
// the same MustacheVars resolveDripVars already produces. Keep this in
// sync with the template body submitted in WhatsApp Manager: Meta sends
// {{1}}, {{2}}, ... in array order, no names.
function buildWaParams(key: WaTemplateKey, vars: Record<string, string>): string[] {
  switch (key) {
    case 'day2FollowUp':
      return [vars.volunteerName, vars.firstName, vars.firstName];
    case 'day4PastorCheckin':
      return [vars.firstName, vars.churchName];
    case 'day11InviteBack':
      return [vars.volunteerName, vars.firstName];
    default:
      // guestAssignment/newGuestAlert/roleAssignment aren't sent from the
      // drip path — reaching here means a template row's key is stale.
      return [];
  }
}

// Run 61 — plain lookup instead of `key in WA_TEMPLATES`, so there's no
// dependence on TS narrowing a nullable key across a negated `||`.
// Returns null for anything not a real, known key (missing, stale, typo'd
// via direct DB edit, etc.) — callers treat null as "no template assigned".
function resolveWaTemplate(rawKey: string | null): { key: WaTemplateKey; entry: { name: string; lang: string } } | null {
  if (!rawKey) return null;
  const entry = (WA_TEMPLATES as Record<string, { name: string; lang: string }>)[rawKey];
  if (!entry) return null;
  return { key: rawKey as WaTemplateKey, entry };
}

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
            assignedVolunteer: { select: { id: true, name: true, phone: true, email: true } },
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

      // ── Filter 5: WhatsApp step with no Meta template selected → SKIP
      // (Run 61: no more silent Whapi fallback — if a template hasn't been
      // wired to an approved Meta template, don't guess, don't send.)
      const channel: 'EMAIL' | 'WHATSAPP' = template.channel;
      const waResolved = resolveWaTemplate(template.whatsappTemplateKey ?? null);
      if (channel === 'WHATSAPP' && !waResolved) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED', errorMessage: 'No Meta WhatsApp template assigned to this drip step' },
        });
        skipped++;
        continue;
      }

      // ── Validate contact info for this channel, for the actual
      // recipient (Run 61: GUEST or VOLUNTEER, not always the guest).
      const recipient: 'GUEST' | 'VOLUNTEER' = template.recipient || 'GUEST';
      const volunteer = guest.assignedVolunteer;

      if (recipient === 'VOLUNTEER' && !volunteer) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED', errorMessage: 'No volunteer assigned to this guest' },
        });
        skipped++;
        continue;
      }

      const contactEmail = recipient === 'VOLUNTEER' ? volunteer?.email : guest.email;
      const contactPhone = recipient === 'VOLUNTEER' ? volunteer?.phone : guest.phone;
      const contactLabel = recipient === 'VOLUNTEER' ? 'Assigned volunteer' : 'Guest';

      if (channel === 'EMAIL' && !contactEmail) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED', errorMessage: `${contactLabel} has no email address` },
        });
        skipped++;
        continue;
      }
      if (channel === 'WHATSAPP' && !contactPhone) {
        await (prisma as any).guestDripStep.update({
          where: { id: step.id },
          data: { status: 'SKIPPED', errorMessage: `${contactLabel} has no phone number` },
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
        contactEmail,
        contactPhone,
        waResolved,
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
  contactEmail: string | null | undefined;
  contactPhone: string | null | undefined;
  waResolved: { key: WaTemplateKey; entry: { name: string; lang: string } } | null;
  vars: Record<string, string>;
  dryRun: boolean;
  churchName: string;
}): Promise<SendOutcome> {
  const { channel, template, contactEmail, contactPhone, waResolved, vars, dryRun, churchName } = args;

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
        to: contactEmail,
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
      to: contactEmail as string,
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

  // WHATSAPP — Run 61: Meta Cloud API via the same sender/registry
  // guest_assignment and role_assignment already use successfully.
  // waResolved is guaranteed non-null here (Filter 5 skips otherwise) —
  // but sendOne doesn't re-derive that guarantee itself, so guard for real
  // rather than casting past it.
  if (!waResolved) {
    return {
      kind: 'failed',
      errorMessage: 'No Meta WhatsApp template resolved for this step',
      renderedSubject: null,
      renderedBody: renderMustache(template.body || '', vars, { escape: 'none' }),
    };
  }
  const params = buildWaParams(waResolved.key, vars);
  // bodyRendered is for DripSendLog/audit only — a human-readable render
  // of what was actually submitted, since Meta template sends don't have
  // a single "body string" the way email/Whapi did.
  const bodyRendered = renderMustache(template.body || '', vars, { escape: 'none' });

  if (dryRun) {
    console.log('[drip-executor][DRY RUN] WHATSAPP', {
      toPhone: contactPhone,
      template: waResolved.entry.name,
      params,
    });
    return {
      kind: 'sent',
      providerMessageId: null,
      renderedSubject: null,
      renderedBody: bodyRendered,
    };
  }

  const result = await sendWhatsAppTemplate(contactPhone as string, waResolved.entry, params);
  if (result.error) {
    return {
      kind: 'failed',
      errorMessage: result.error,
      renderedSubject: null,
      renderedBody: bodyRendered,
    };
  }
  return {
    kind: 'sent',
    providerMessageId: result.id || null,
    renderedSubject: null,
    renderedBody: bodyRendered,
  };
}

export { GET as POST };
