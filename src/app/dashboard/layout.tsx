import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import DashboardShell from '@/components/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  // Check if user must change password
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { mustChangePassword: true },
  });

  if (user?.mustChangePassword) {
    redirect('/change-password');
  }

  return (
    <DashboardShell user={session}>
      {children}
    </DashboardShell>
  );
}
