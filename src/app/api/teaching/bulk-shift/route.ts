// Run 57 — move the rest of the drip by N days.
//
// This is the single most destructive button in the admin: one call can move
// every unpublished article Pastor Okezie has written. It is therefore:
//   - ADMIN only;
//   - preview-first — `apply: true` is required to write anything, and the UI
//     shows the preview before it will offer the button;
//   - strictly forward-looking — only publishAt > TODAY moves. What has already
//     gone out has gone out; nothing can retroactively unpublish it;
//   - refusing to shift anything to today or earlier, because that would dump a
//     backlog into public view at once — the exact catch-up flood the brief
//     warned about;
//   - refusing to create two articles on one day, since the drip's whole
//     premise is one per day.
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { toDateStr, toDbDate, addDaysStr, todayEastern } from '@/lib/teaching-admin';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const b = await request.json();

    const days = Number(b.days);
    if (!Number.isInteger(days) || days === 0) {
      return NextResponse.json({ error: 'Enter a whole number of days to move by.' }, { status: 400 });
    }
    if (Math.abs(days) > 365) {
      return NextResponse.json({ error: 'That is more than a year. Move by a smaller amount.' }, { status: 400 });
    }

    const today = todayEastern();

    // Everything still to come. ARCHIVED/DRAFT rows are not on the drip.
    const rows = await (prisma as any).teaching.findMany({
      where: { status: 'PUBLISHED', publishAt: { gt: toDbDate(today) } },
      orderBy: [{ publishAt: 'asc' }],
      select: { id: true, slug: true, title: true, publishAt: true, topic: true },
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nothing is scheduled after today, so there is nothing to move.' }, { status: 400 });
    }

    const moves = rows.map((r: any) => {
      const from = toDateStr(r.publishAt) as string;
      return { id: r.id, slug: r.slug, title: r.title, topic: r.topic, from, to: addDaysStr(from, days) };
    });

    // Nothing may land on or before today.
    const intoPast = moves.filter((m: any) => m.to <= today);
    if (intoPast.length > 0) {
      return NextResponse.json({
        error:
          'That would move ' + intoPast.length + ' article' + (intoPast.length === 1 ? '' : 's') +
          ' to today or earlier, publishing them all at once. The earliest it can move by is ' +
          (moves[0].from === today ? 0 : -(daysBetween(today, moves[0].from) - 1)) + ' days.',
      }, { status: 400 });
    }

    // One article per day is the drip's whole premise. Check the shifted set
    // against itself AND against the dates that are staying put.
    const staying = await (prisma as any).teaching.findMany({
      where: { status: 'PUBLISHED', publishAt: { not: null, lte: toDbDate(today) } },
      select: { publishAt: true },
    });
    const taken = new Set<string>(staying.map((s: any) => toDateStr(s.publishAt) as string));
    const collisions: string[] = [];
    moves.forEach((m: any) => {
      if (taken.has(m.to)) collisions.push(m.to);
      taken.add(m.to);
    });
    if (collisions.length > 0) {
      return NextResponse.json({
        error: 'That would put two teachings on ' + collisions.length + ' day' +
          (collisions.length === 1 ? '' : 's') + ' (' + Array.from(new Set(collisions)).slice(0, 3).join(', ') + '). Pick a different number of days.',
      }, { status: 409 });
    }

    const summary = {
      count: moves.length,
      days,
      firstFrom: moves[0].from, firstTo: moves[0].to,
      lastFrom: moves[moves.length - 1].from, lastTo: moves[moves.length - 1].to,
    };

    // Preview is the default. Writing takes an explicit act.
    if (b.apply !== true) {
      return NextResponse.json({ preview: true, summary, moves: moves.slice(0, 400) });
    }

    // One transaction: the drip moves as a unit or not at all. A half-shifted
    // drip is worse than an unshifted one — it publishes twice on some days and
    // never on others, and nobody would know which half.
    await (prisma as any).$transaction(
      moves.map((m: any) =>
        (prisma as any).teaching.update({ where: { id: m.id }, data: { publishAt: toDbDate(m.to) } })
      )
    );

    await logAudit({
      action: 'TEACHING_DRIP_SHIFTED', category: 'TEACHING',
      description: 'Moved the remaining drip by ' + days + ' day' + (Math.abs(days) === 1 ? '' : 's') +
        ' — ' + moves.length + ' teachings, now ending ' + summary.lastTo,
      userId: session.userId, userName: session.name,
      targetType: 'Teaching',
      metadata: { days, count: moves.length, firstTo: summary.firstTo, lastTo: summary.lastTo },
    });

    const paths = new Set<string>(['/home', '/sitemap.xml']);
    moves.forEach((m: any) => {
      paths.add('/teaching/' + m.slug);
      paths.add('/teaching/topic/' + m.topic);
    });
    Array.from(paths).forEach((p) => revalidatePath(p));

    return NextResponse.json({ applied: true, summary });
  } catch (error) {
    return handleAuthError(error);
  }
}

function daysBetween(a: string, b: string): number {
  return Math.round((toDbDate(b).getTime() - toDbDate(a).getTime()) / 86400000);
}
