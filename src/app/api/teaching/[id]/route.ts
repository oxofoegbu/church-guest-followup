// Run 57 — teaching admin: read one (with its body, for the editor) + update.
// ADMIN only.
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { toBlocks } from '@/lib/teaching';
import {
  toDateStr, toDbDate, isDateStr, todayEastern, validateBlocks,
  isTopic, youTubeIdFrom, slugify, revalidateTargets, STATUSES, shapeRow,
} from '@/lib/teaching-admin';

// GET /api/teaching/[id] — everything the editor needs to open a teaching.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(request, ['ADMIN']);
    const r = await (prisma as any).teaching.findUnique({ where: { id: params.id } });
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      teaching: {
        ...shapeRow(r, todayEastern()),
        // Validated on the way out, exactly as the public read path does — a
        // malformed block must degrade, never 500 the editor.
        body: toBlocks(r.body),
        transcript: toBlocks(r.transcript),
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

// PATCH /api/teaching/[id] — update. Every field is optional; only what is
// sent is touched.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth(request, ['ADMIN']);
    const b = await request.json();

    const before = await (prisma as any).teaching.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data: any = {};
    const changes: string[] = [];

    if (typeof b.title === 'string') {
      const t = b.title.trim();
      if (!t) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });
      if (t !== before.title) { data.title = t; changes.push('title'); }
    }
    if (typeof b.slug === 'string') {
      const s = slugify(b.slug);
      if (!s) return NextResponse.json({ error: 'That is not a usable web address.' }, { status: 400 });
      if (s !== before.slug) {
        const clash = await (prisma as any).teaching.findUnique({ where: { slug: s } });
        if (clash) return NextResponse.json({ error: 'The web address "' + s + '" is already used.' }, { status: 409 });
        data.slug = s; changes.push('web address');
      }
    }
    if (typeof b.excerpt === 'string' && b.excerpt.trim() !== before.excerpt) {
      data.excerpt = b.excerpt.trim(); changes.push('excerpt');
    }
    if (b.date !== undefined) {
      if (!isDateStr(b.date)) return NextResponse.json({ error: 'That is not a valid date.' }, { status: 400 });
      if (b.date !== toDateStr(before.date)) { data.date = toDbDate(b.date); changes.push('date'); }
    }
    if (b.topic !== undefined) {
      if (!isTopic(b.topic)) return NextResponse.json({ error: 'That is not a known topic.' }, { status: 400 });
      if (b.topic !== before.topic) { data.topic = b.topic; changes.push('topic'); }
    }
    if (b.series !== undefined) {
      const s = (b.series || '').trim() || null;
      if (s !== before.series) { data.series = s; changes.push('series'); }
    }
    if (b.author !== undefined && b.author.trim() && b.author.trim() !== before.author) {
      data.author = b.author.trim(); changes.push('author');
    }
    if (b.featured !== undefined && b.featured !== before.featured) {
      data.featured = b.featured === true; changes.push('featured');
    }
    if (b.readMin !== undefined) {
      const v = typeof b.readMin === 'number' ? b.readMin : null;
      if (v !== before.readMin) { data.readMin = v; changes.push('read time'); }
    }
    if (b.durationMin !== undefined) {
      const v = typeof b.durationMin === 'number' ? b.durationMin : null;
      if (v !== before.durationMin) { data.durationMin = v; changes.push('duration'); }
    }
    if (b.youTubeId !== undefined && before.kind === 'sermon') {
      const id = youTubeIdFrom(b.youTubeId || '');
      if (!id) return NextResponse.json({ error: 'That is not a YouTube link we can read.' }, { status: 400 });
      if (id !== before.youTubeId) { data.youTubeId = id; changes.push('video'); }
    }

    // --- the two that touch what the public sees, and when ------------------
    if (b.status !== undefined) {
      if ((STATUSES as readonly string[]).indexOf(b.status) === -1) {
        return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
      }
      if (b.status !== before.status) { data.status = b.status; changes.push('status -> ' + b.status); }
    }
    if (b.publishAt !== undefined) {
      const next = b.publishAt === null || b.publishAt === '' ? null : b.publishAt;
      if (next !== null && !isDateStr(next)) {
        return NextResponse.json({ error: 'The publish date is not a valid date.' }, { status: 400 });
      }
      const prev = toDateStr(before.publishAt);
      if (next !== prev) {
        data.publishAt = next ? toDbDate(next) : null;
        changes.push('publish date ' + (prev || 'always visible') + ' -> ' + (next || 'always visible'));
      }
    }

    // --- body / transcript --------------------------------------------------
    if (b.body !== undefined) {
      const checked = validateBlocks(b.body);
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
      const field = before.kind === 'sermon' ? 'transcript' : 'body';
      if (JSON.stringify(checked.blocks) !== JSON.stringify(before[field] ?? [])) {
        data[field] = checked.blocks;
        changes.push(field);
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ teaching: shapeRow(before, todayEastern()), changed: false });
    }

    const after = await (prisma as any).teaching.update({ where: { id: params.id }, data });

    // Only one teaching may be the pinned featured item.
    if (data.featured === true) {
      await (prisma as any).teaching.updateMany({ where: { featured: true, id: { not: after.id } }, data: { featured: false } });
    }

    await logAudit({
      action: 'TEACHING_UPDATED', category: 'TEACHING',
      description: 'Edited ' + after.kind + ' "' + after.title + '" — ' + changes.join(', '),
      userId: session.userId, userName: session.name,
      targetId: after.id, targetType: 'Teaching', targetName: after.title,
      metadata: { slug: after.slug, changes },
    });

    // Both addresses, when the slug moved: the old page must stop existing.
    const paths = revalidateTargets(after.slug, after.topic);
    if (data.slug) paths.push('/teaching/' + before.slug);
    if (data.topic) paths.push('/teaching/topic/' + before.topic);
    Array.from(new Set(paths)).forEach((p) => revalidatePath(p));

    return NextResponse.json({ teaching: shapeRow(after, todayEastern()), changed: true, changes });
  } catch (error) {
    return handleAuthError(error);
  }
}
