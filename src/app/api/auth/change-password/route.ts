import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError, verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user must change password (first login), currentPassword check is optional
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }
      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ ok: true, message: 'Password changed successfully' });
  } catch (error) {
    return handleAuthError(error);
  }
}
