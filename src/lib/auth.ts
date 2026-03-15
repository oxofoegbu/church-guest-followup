import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-change-me');
const COOKIE_NAME = 'session';

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// API route auth helper - allowedRoles can be specific role names OR permission levels
export async function requireAuth(request: NextRequest, allowedRoles?: string[]): Promise<SessionPayload> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    throw new AuthError('Not authenticated', 401);
  }

  const session = await verifyToken(token);
  if (!session) {
    throw new AuthError('Invalid session', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) {
    throw new AuthError('Account deactivated', 403);
  }

  if (allowedRoles && allowedRoles.length > 0) {
    // Check direct role match first
    if (allowedRoles.includes(session.role)) {
      return session;
    }

    // Then check permission-level based access
    // Load custom roles config to resolve permission levels
    const customRolesSetting = await prisma.appSetting.findUnique({ where: { key: 'custom_roles' } });
    const { getPermissionLevel } = require('./roles');
    const userPermLevel = getPermissionLevel(session.role, customRolesSetting?.value);

    // Map allowed roles to their permission levels and check
    const hasAccess = allowedRoles.some(allowedRole => {
      // If the allowed role is a permission level check
      if (allowedRole === 'ADMIN') return userPermLevel === 'ADMIN_ACCESS';
      if (allowedRole === 'LEADER') return userPermLevel === 'ADMIN_ACCESS' || userPermLevel === 'LEADER_ACCESS';
      // Direct role name match (already checked above, but for completeness)
      return false;
    });

    if (!hasAccess) {
      throw new AuthError('Insufficient permissions', 403);
    }
  }

  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('Unexpected error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
