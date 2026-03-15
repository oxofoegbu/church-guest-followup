'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS, formatDate } from '@/lib/utils';

interface Stats {
  totalGuests: number;
  newGuestsWeek: number;
  newGuestsMonth: number;
  totalAssigned: number;
  becomeSignups: number;
  pctAssigned24h: number;
  pctContacted48h: number;
  overdueCount: number;
  returned1x: number;
  returned3x: number;
  returned7x: number;
  pctReturned1x: number;
  pctReturned7x: number;
  statusCounts: Record<string, number>;
  returnDistribution: { returns: number; count: number }[];
}

interface Operational {
  unassigned24h: any[];
  overdueFollowUps: any[];
  stalledGuests: any[];
  nearTarget: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ops, setOps] = useState<Operational | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/reports?type=overview').then(r => r.ok ? r.json() : null),
      fetch('/api/reports?type=operational').then(r => r.ok ? r.json() : null),
      fetch('/api/guests?deletionRequested=true&limit=50').then(r => r.ok ? r.json() : { guests: [] }),
    ]).then(([me, statsData, opsData, delData]) => {
      setUser(me.user);
      setStats(statsData);
      setOps(opsData);
      setDeletionRequests(delData.guests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const isVolunteer = user?.permissionLevel === 'VOLUNTEER_ACCESS';

  if (isVolunteer) {
    return <VolunteerDashboard />;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-header">Dashboard</h1>
        <Link href="/" target="_blank"
          className="btn-accent btn-sm flex items-center gap-2">
          📋 Guest Form
        </Link>
      </div>

      {stats && (
        <>
          {/* Stats Cards Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="New This Week" value={stats.newGuestsWeek} icon="🆕" color="blue" />
            <StatCard label="New This Month" value={stats.newGuestsMonth} icon="📅" color="indigo" />
            <StatCard label="Become Signups" value={stats.becomeSignups} icon="✅" color="green" />
            <StatCard label="Overdue Follow-ups" value={stats.overdueCount} icon="⚠️"
              color={stats.overdueCount > 0 ? 'red' : 'green'} />
          </div>

          {/* Stats Cards Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Assigned <24h" value={`${stats.pctAssigned24h}%`} icon="⏱️" color="amber" />
            <StatCard label="Contacted <48h" value={`${stats.pctContacted48h}%`} icon="📞" color="teal" />
            <StatCard label="Returned 1x+" value={`${stats.pctReturned1x}%`} icon="🔄" color="purple" />
            <StatCard label="Hit 7/7 Target" value={stats.returned7x} icon="🎯" color="emerald" />
          </div>

          {/* Status Pipeline */}
          <div className="card">
            <h2 className="section-header mb-4">Guest Pipeline</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="text-center p-3 rounded-lg bg-church-50">
                  <div className="text-2xl font-bold text-church-900">
                    {stats.statusCounts[key] || 0}
                  </div>
                  <div className={`badge mt-1 ${STATUS_COLORS[key]}`}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Distribution - Bar Chart */}
          <div className="card">
            <h2 className="section-header mb-6">Service Return Distribution</h2>
            <div className="flex items-end justify-between gap-3" style={{ height: '200px' }}>
              {Array.from({ length: 8 }, (_, i) => {
                const item = stats.returnDistribution.find(r => r.returns === i);
                const count = item?.count || 0;
                const maxCount = Math.max(...stats.returnDistribution.map(r => r.count), 1);
                const heightPct = count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;
                const barColor = i === 7
                  ? 'bg-emerald-500'
                  : i >= 5
                    ? 'bg-teal-400'
                    : i >= 3
                      ? 'bg-blue-400'
                      : i >= 1
                        ? 'bg-church-300'
                        : 'bg-church-200';
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-sm font-bold text-church-800 mb-1">{count}</span>
                    <div
                      className={`w-full max-w-[48px] mx-auto rounded-t-md transition-all duration-500 ${barColor}`}
                      style={{ height: count > 0 ? `${heightPct}%` : '2px' }}
                    />
                    <div className="mt-2 text-center">
                      <span className="text-xs font-medium text-church-600">{i}</span>
                      {i === 0 && <div className="text-[9px] text-church-400">visits</div>}
                      {i === 7 && <div className="text-[9px] text-emerald-600 font-medium">target</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-xs text-church-500 mt-4 pt-3 border-t border-church-100">
              Number of service returns (0 = first visit only)
            </div>
          </div>
        </>
      )}

      {/* Operational Alerts */}
      {ops && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Deletion Requests */}
          {user?.permissionLevel === 'ADMIN_ACCESS' && deletionRequests.length > 0 && (
            <div className="card border-l-4 border-l-red-500">
              <h3 className="section-header text-red-700 mb-3">
                🗑️ Deletion Requests ({deletionRequests.length})
              </h3>
              <div className="space-y-2">
                {deletionRequests.slice(0, 5).map((g: any) => (
                  <Link key={g.id} href={`/dashboard/guests/${g.id}`}
                    className="flex justify-between items-center p-2 rounded hover:bg-red-50">
                    <div>
                      <span className="font-medium">{g.firstName} {g.lastName}</span>
                      <span className="text-xs text-church-500 ml-2">by {g.deletionRequestedBy}</span>
                    </div>
                    <span className="text-xs text-red-500">{formatDate(g.deletionRequestedAt)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Unassigned */}
          {ops.unassigned24h.length > 0 && (
            <div className="card border-l-4 border-l-red-400">
              <h3 className="section-header text-red-700 mb-3">
                ⚠️ Unassigned &gt;24h ({ops.unassigned24h.length})
              </h3>
              <div className="space-y-2">
                {ops.unassigned24h.slice(0, 5).map((g: any) => (
                  <Link key={g.id} href={`/dashboard/guests/${g.id}`}
                    className="flex justify-between items-center p-2 rounded hover:bg-red-50">
                    <span className="font-medium">{g.firstName} {g.lastName}</span>
                    <span className="text-xs text-church-500">{formatDate(g.createdAt)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Near Target */}
          {ops.nearTarget.length > 0 && (
            <div className="card border-l-4 border-l-emerald-400">
              <h3 className="section-header text-emerald-700 mb-3">
                🎯 Near Target ({ops.nearTarget.length})
              </h3>
              <div className="space-y-2">
                {ops.nearTarget.map((g: any) => (
                  <Link key={g.id} href={`/dashboard/guests/${g.id}`}
                    className="flex justify-between items-center p-2 rounded hover:bg-emerald-50">
                    <span className="font-medium">{g.firstName} {g.lastName}</span>
                    <span className="badge bg-emerald-100 text-emerald-700">
                      {g.serviceReturnCount}/7
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stalled */}
          {ops.stalledGuests.length > 0 && (
            <div className="card border-l-4 border-l-amber-400">
              <h3 className="section-header text-amber-700 mb-3">
                💤 Stalled – No Activity 7+ Days ({ops.stalledGuests.length})
              </h3>
              <div className="space-y-2">
                {ops.stalledGuests.slice(0, 5).map((g: any) => (
                  <Link key={g.id} href={`/dashboard/guests/${g.id}`}
                    className="flex justify-between items-center p-2 rounded hover:bg-amber-50">
                    <div>
                      <span className="font-medium">{g.firstName} {g.lastName}</span>
                      <span className="text-xs text-church-500 ml-2">→ {g.assignedVolunteer?.name}</span>
                    </div>
                    <span className={`badge ${STATUS_COLORS[g.status]}`}>
                      {STATUS_LABELS[g.status]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VolunteerDashboard() {
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/guests?limit=100')
      .then(r => r.json())
      .then(data => { setGuests(data.guests || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  const active = guests.filter(g => !['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE'].includes(g.status));
  const overdue = guests.filter(g =>
    g.activities?.[0]?.nextFollowUpDate && new Date(g.activities[0].nextFollowUpDate) < new Date()
    && !['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE'].includes(g.status)
  );

  return (
    <div className="space-y-6 fade-in">
      <h1 className="page-header">Welcome Back</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="My Guests" value={guests.length} icon="👥" color="blue" />
        <StatCard label="Active" value={active.length} icon="🟢" color="green" />
        <StatCard label="Overdue" value={overdue.length} icon="⚠️" color={overdue.length > 0 ? 'red' : 'green'} />
        <StatCard label="Become Signups" value={guests.filter(g => g.becomeSignup).length} icon="✅" color="emerald" />
      </div>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header">Quick Actions</h2>
        </div>
        <Link href="/dashboard/my-assigned" className="btn-primary inline-flex items-center gap-2">
          🙋 View My Guests →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    green: 'bg-green-50 border-green-100',
    red: 'bg-red-50 border-red-100',
    amber: 'bg-amber-50 border-amber-100',
    teal: 'bg-teal-50 border-teal-100',
    purple: 'bg-purple-50 border-purple-100',
    emerald: 'bg-emerald-50 border-emerald-100',
  };

  return (
    <div className={`stat-card border ${colorClasses[color] || 'bg-church-50 border-church-100'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-church-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-church-900">{value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-church-100 rounded animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card border border-church-100">
            <div className="h-4 w-20 bg-church-100 rounded animate-pulse mb-2" />
            <div className="h-8 w-12 bg-church-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
