import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    // Fetch fresh user data including mustChangePassword
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { mustChangePassword: true },
    });

    return NextResponse.json({
      user: {
        ...session,
        mustChangePassword: user?.mustChangePassword ?? false,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
