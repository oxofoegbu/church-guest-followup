import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    return NextResponse.json({ user: session });
  } catch (error) {
    return handleAuthError(error);
  }
}
