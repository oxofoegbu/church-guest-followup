// Run 59 — Ask a Question: leader-level status update (mark a question
// Answered or Dismissed once addressed, or reopen it as New by mistake).
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { SERMON_QUESTION_STATUSES } from '@/lib/sermon-questions';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(request, ['LEADER']);
    const body = await request.json();
    const status = body?.status;
    if (!SERMON_QUESTION_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const existing = await (prisma as any).sermonQuestion.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    await (prisma as any).sermonQuestion.update({ where: { id: params.id }, data: { status } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
