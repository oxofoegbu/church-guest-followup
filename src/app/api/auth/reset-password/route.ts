import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return NextResponse.json({ valid: false });

  const record = await (prisma as any).passwordResetToken.findUnique({ where: { token } }).catch(() => null);
  if (!record || record.used || new Date(record.expiresAt) < new Date()) {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({ valid: true });
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password || password.length < 6) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const record = await (prisma as any).passwordResetToken.findUnique({ where: { token } });
    if (!record || record.used || new Date(record.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed, mustChangePassword: false },
    });

    await (prisma as any).passwordResetToken.update({
      where: { token },
      data: { used: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[reset-password POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
