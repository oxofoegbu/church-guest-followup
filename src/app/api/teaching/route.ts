// Run 57 — teaching admin: list + create. ADMIN only (publishing is not a
// Leader capability). Mirrors the /api/tracks route conventions.
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import {
  toDateStr, toDbDate, isDateStr, todayEastern, validateBlocks,
  isTopic, youTubeIdFrom, slugify, revalidateTargets, STATUSES, shapeRow,
} from '@/lib/teaching-admin';

// GET /api/teaching — the admin list. Deliberately UNFILTERED by publishAt:
// this is the one surface that must show scheduled and draft work.
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);
    const sp = request.nextUrl.searchParams;
    const kind = sp.get('kind');
    const topic = sp.get('topic');
    const status = sp.get('status');
    const q = (sp.get('q') || '').trim();

    const where: any = {};
    if (kind === 'article' || kind === 'sermon') where.kind = kind;
    if (topic && isTopic(topic)) where.topic = topic;
    if (status && (STATUSES as readonly string[]).indexOf(status) !== -1) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    // The same ORDER BY the live read path uses. `seq` is the tie-break and is
    // load-bearing: three dates are shared by seven teachings and their order
    // comes from nothing else.
    const rows = await (prisma as any).teaching.findMany({
      where,
      orderBy: [{ date: 'desc' }, { seq: 'asc' }],
      select: {
        id: true, kind: true, slug: true, title: true, excerpt: true, date: true,
        topic: true, series: true, author: true, featured: true, publishAt: true,
        status: true, seq: true, youTubeId: true, durationMin: true, readMin: true,
        updatedAt: true,
      },
    });
    const today = todayEastern();
    return NextResponse.json({ teachings: rows.map((r: any) => shapeRow(r, today)), today });
  } catch (error) {
    return handleAuthError(error);
  }
}

// POST /api/teaching — create.
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const b = await request.json();

    const kind = b.kind === 'sermon' ? 'sermon' : 'article';
    const title = (b.title || '').trim();
    if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });

    const slug = slugify(b.slug?.trim() || title);
    if (!slug) return NextResponse.json({ error: 'That title cannot make a web address. Add a slug.' }, { status: 400 });
    const clash = await (prisma as any).teaching.findUnique({ where: { slug } });
    if (clash) return NextResponse.json({ error: 'The web address "' + slug + '" is already used.' }, { status: 409 });

    if (!isDateStr(b.date)) return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 });
    if (!isTopic(b.topic)) return NextResponse.json({ error: 'Choose a topic.' }, { status: 400 });
    if (b.publishAt != null && b.publishAt !== '' && !isDateStr(b.publishAt)) {
      return NextResponse.json({ error: 'The publish date is not a valid date.' }, { status: 400 });
    }

    let youTubeId: string | null = null;
    if (kind === 'sermon') {
      youTubeId = youTubeIdFrom(b.youTubeId || '');
      if (!youTubeId) return NextResponse.json({ error: 'Paste a YouTube link (or its 11-character id).' }, { status: 400 });
    }

    const checked = validateBlocks(b.body ?? []);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

    // `seq` is the tie-break within a shared date. New content takes the next
    // one so it lands after everything already on that day.
    const top = await (prisma as any).teaching.findFirst({ orderBy: { seq: 'desc' }, select: { seq: true } });
    const seq = (top?.seq ?? -1) + 1;

    const status = (STATUSES as readonly string[]).indexOf(b.status) !== -1 ? b.status : 'DRAFT';

    const created = await (prisma as any).teaching.create({
      data: {
        kind, slug, title,
        excerpt: (b.excerpt || '').trim(),
        date: toDbDate(b.date),
        topic: b.topic,
        series: b.series?.trim() || null,
        author: (b.author || '').trim() || 'Pastor Okezie Ofoegbu',
        featured: b.featured === true,
        publishAt: b.publishAt ? toDbDate(b.publishAt) : null,
        seq,
        status,
        body: kind === 'article' ? checked.blocks : undefined,
        transcript: kind === 'sermon' && checked.blocks.length > 0 ? checked.blocks : undefined,
        youTubeId,
        durationMin: typeof b.durationMin === 'number' ? b.durationMin : null,
        readMin: typeof b.readMin === 'number' ? b.readMin : null,
      },
    });

    // Only one teaching may be the pinned featured item.
    if (created.featured) {
      await (prisma as any).teaching.updateMany({ where: { featured: true, id: { not: created.id } }, data: { featured: false } });
    }

    await logAudit({
      action: 'TEACHING_CREATED', category: 'TEACHING',
      description: 'Created ' + kind + ' "' + title + '" (' + status + ')',
      userId: session.userId, userName: session.name,
      targetId: created.id, targetType: 'Teaching', targetName: title,
      metadata: { slug, kind, status, publishAt: b.publishAt || null },
    });

    revalidateTargets(slug, b.topic).forEach((p) => revalidatePath(p));

    return NextResponse.json({ teaching: shapeRow(created, todayEastern()) }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
