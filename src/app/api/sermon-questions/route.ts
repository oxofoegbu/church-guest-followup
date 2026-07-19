// Run 59 — Ask a Question.
// POST is the public, no-login submission endpoint behind the QR code at
// /ask. It stores NOTHING that could identify the sender -- no name, email,
// phone, or IP. GET is the leader-level moderation queue read, filtered to a
// single sermonDate (defaults to today).
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { sermonQuestionSchema, todayEastern, toDbDate, toDateStr, isDateStr } from '@/lib/sermon-questions';

export async function POST(request: NextRequest) {
  try {
    const parsed = sermonQuestionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Please write a question.' }, { status: 400 });
    }

    // Honeypot (mirrors /api/enroll): bots fill it, humans never see it --
    // fake success, write nothing.
    if (parsed.data.website && parsed.data.website.trim() !== '') {
      return NextResponse.json({ ok: true });
    }

    await (prisma as any).sermonQuestion.create({
      data: {
        text: parsed.data.text,
        sermonDate: toDbDate(todayEastern()),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[sermon-questions] POST failed:', error);
    return NextResponse.json({ error: 'Something went wrong -- please try again.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['LEADER']);
    const sp = new URL(request.url).searchParams;
    const dateParam = sp.get('date'); // 'yyyy-mm-dd' | 'all' | null (defaults to today)

    const where: any = {};
    if (dateParam && dateParam !== 'all') {
      if (!isDateStr(dateParam)) {
        return NextResponse.json({ error: 'Invalid date.' }, { status: 400 });
      }
      where.sermonDate = toDbDate(dateParam);
    } else if (!dateParam) {
      where.sermonDate = toDbDate(todayEastern());
    }

    const rows = await (prisma as any).sermonQuestion.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const questions = rows.map((r: any) => ({
      id: r.id,
      text: r.text,
      sermonDate: toDateStr(r.sermonDate),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    const counts = { NEW: 0, ANSWERED: 0, DISMISSED: 0 };
    questions.forEach((q: any) => { counts[q.status as keyof typeof counts] = (counts[q.status as keyof typeof counts] || 0) + 1; });

    return NextResponse.json({ questions, counts, today: todayEastern() });
  } catch (error) {
    return handleAuthError(error);
  }
}
