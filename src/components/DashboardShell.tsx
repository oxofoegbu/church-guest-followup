'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getPermissionLevel, getRoleLabel } from '@/lib/roles';

interface User { userId: string; name: string; email: string; role: string; }

const NAV_BY_PERMISSION = {
  ADMIN_ACCESS: [
    { href: '/dashboard',           label: 'Dashboard',        icon: '📊' },
    { href: '/dashboard/guests',    label: 'All Guests',       icon: '👥' },
    { href: '/dashboard/prospects', label: 'Prospects',        icon: '🎯' },
    { href: '/dashboard/overview',  label: 'All Guests Overview', icon: '📋' },
    { href: '/dashboard/my-assigned', label: 'My Guests',      icon: '🙋' },
    { href: '/dashboard/calendar',  label: 'My Calendar',      icon: '📅' },
    { href: '/dashboard/schedule',  label: 'Sunday Schedule',  icon: '⛪' },
    { href: '/dashboard/clusters',  label: 'Clusters',         icon: '👥' },
    { href: '/dashboard/users',     label: 'Users',            icon: '⚙️' },
    { href: '/dashboard/reports',   label: 'Reports',          icon: '📈' },
    { href: '/dashboard/audit',     label: 'Audit Trail',      icon: '📜' },
    { href: '/dashboard/settings',  label: 'Settings',         icon: '🔔' },
  ],
  LEADER_ACCESS: [
    { href: '/dashboard',           label: 'Dashboard',        icon: '📊' },
    { href: '/dashboard/guests',    label: 'All Guests',       icon: '👥' },
    { href: '/dashboard/prospects', label: 'Prospects',        icon: '🎯' },
    { href: '/dashboard/overview',  label: 'All Guests Overview', icon: '📋' },
    { href: '/dashboard/my-assigned', label: 'My Guests',      icon: '🙋' },
    { href: '/dashboard/calendar',  label: 'My Calendar',      icon: '📅' },
    { href: '/dashboard/schedule',  label: 'Sunday Schedule',  icon: '⛪' },
    { href: '/dashboard/clusters',  label: 'Clusters',         icon: '👥' },
    { href: '/dashboard/reports',   label: 'Reports',          icon: '📈' },
  ],
  VOLUNTEER_ACCESS: [
    { href: '/dashboard',           label: 'Dashboard',        icon: '📊' },
    { href: '/dashboard/prospects', label: 'Prospects',        icon: '🎯' },
    { href: '/dashboard/my-assigned', label: 'My Guests',      icon: '🙋' },
    { href: '/dashboard/calendar',  label: 'My Calendar',      icon: '📅' },
    { href: '/dashboard/schedule',  label: 'Sunday Schedule',  icon: '⛪' },
    { href: '/dashboard/clusters',  label: 'Clusters',         icon: '👥' },
  ],
};

export default function DashboardShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customRolesJson, setCustomRolesJson] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/roles').then(r => r.ok ? r.json() : {}).then((data: any) => {
      if (data.customRolesJson) setCustomRolesJson(data.customRolesJson);
    }).catch(() => {});
  }, []);

  const permLevel = getPermissionLevel(user.role, customRolesJson);
  const items     = NAV_BY_PERMISSION[permLevel] || NAV_BY_PERMISSION.VOLUNTEER_ACCESS;
  const roleLabel = getRoleLabel(user.role, customRolesJson);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-warm-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-church-900 text-white
        transform transition-transform duration-200 lg:transform-none flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-church-700/50">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="text-2xl">⛪</span>
            <div>
              <h1 className="font-display font-bold text-base leading-tight">Guest Follow-Up</h1>
              <p className="text-church-400 text-[11px]">Church Management</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors
                  ${active ? 'bg-brand-500/20 text-brand-300 font-medium' : 'text-church-300 hover:bg-church-800 hover:text-white'}`}>
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          <div className="pt-3 mt-3 border-t border-church-700/50">
            <Link href="/dashboard/help" onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-church-400 hover:bg-church-800 hover:text-white transition-colors">
              <span className="text-lg">❓</span>Help & Tutorial
            </Link>
            <Link href="/" target="_blank" onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-church-400 hover:bg-church-800 hover:text-white transition-colors">
              <span className="text-lg">📋</span>Guest Form
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-church-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-500/30 flex items-center justify-center text-sm font-bold text-brand-300">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-church-400">{roleLabel}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/change-password" className="text-xs text-church-400 hover:text-brand-300 transition-colors px-1">Change Password</Link>
            <button onClick={handleLogout} className="text-xs text-church-400 hover:text-red-400 transition-colors px-1">Sign Out →</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-church-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-church-50">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <span className="font-display font-bold text-church-900">⛪ Guest Follow-Up</span>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
