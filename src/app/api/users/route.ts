import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, handleAuthError, hashPassword } from '@/lib/auth';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  role: z.enum(['ADMIN', 'VOLUNTEER', 'LEADER']),
  password: z.string().min(6),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional().nullable(),
  role: z.enum(['ADMIN', 'VOLUNTEER', 'LEADER']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request, ['ADMIN', 'LEADER']);
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, active: true, createdAt: true,
        _count: { select: { assignedGuests: true, activities: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        role: data.role,
        password: await hashPassword(data.password),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, active: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth(request, ['ADMIN']);
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const parsed = updateUserSchema.safeParse(updateFields);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data: any = { ...parsed.data };
    if (data.password) {
      data.password = await hashPassword(data.password);
      data.mustChangePassword = true; // Force password change on next login
    }
    if (data.email) {
      data.email = data.email.toLowerCase();
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, active: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return handleAuthError(error);
  }
}
