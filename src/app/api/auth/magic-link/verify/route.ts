import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { setSessionCookie } from '@/lib/auth';
import { getPermissionLevel } from '@/lib/roles';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://harvest.gracelifecenter.com';

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(`${APP_URL}/login?error=invalid_link`);
    }

    const record = await (prisma as any).magicLinkToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.used || new Date(record.expiresAt) < new Date()) {
      return NextResponse.redirect(`${APP_URL}/login?error=expired_link`);
    }

    if (!record.user || !record.user.active) {
      return NextResponse.redirect(`${APP_URL}/login?error=inactive_account`);
    }

    // Mark token as used
    await (prisma as any).magicLinkToken.update({
      where: { token },
      data: { used: true },
    });

    const user = record.user;

    // Get custom roles for permission level
    const customRolesSetting = await prisma.appSetting.findUnique({
      where: { key: 'custom_roles' },
    });
    const permissionLevel = getPermissionLevel(user.role, customRolesSetting?.value ?? null);

    // Create session
    await setSessionCookie({
      userId:          user.id,
      email:           user.email,
      name:            user.name,
      role:            user.role,

    });

    // If they need to change password, redirect there
    if (user.mustChangePassword) {
      return NextResponse.redirect(`${APP_URL}/change-password`);
    }

    return NextResponse.redirect(`${APP_URL}/dashboard`);
  } catch (error) {
    console.error('[magic-link verify]', error);
    return NextResponse.redirect(`${APP_URL}/login?error=server_error`);
  }
}
