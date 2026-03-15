'use client';
import PageHelp from '@/components/PageHelp';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ACTIVITY_LABELS, STATUS_LABELS, STATUS_COLORS, formatDate } from '@/lib/utils';

type Tab = 'funnel' | 'volunteers' | 'operational' | 'exports';

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('funnel');
  const [overview, setOverview] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [volPerf, setVolPerf] = useState<any>(null);
  const [ops, setOps] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports?type=overview').then(r => r.ok ? r.json() : null),
      fetch('/api/reports?type=funnel').then(r => r.ok ? r.json() : null),
      fetch('/api/reports?type=volunteer-performance').then(r => r.ok ? r.json() : null),
      fetch('/api/reports?type=operational').then(r => r.ok ? r.json() : null),
    ]).then(([ov, fn, vp, op]) => {
      setOverview(ov);
      setFunnel(fn);
      setVolPerf(vp);
      setOps(op);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-church-400">Loading reports...</div>;
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'funnel', label: 'Funnel & Outcomes', icon: '📊' },
    { key: 'volunteers', label: 'Assignee Performance', icon: '👥' },
    { key: 'operational', label: 'Operational', icon: '⚙️' },
    { key: 'exports', label: 'Export Data', icon: '📥' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <h1 className="page-header">Leadership Reports</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-church-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${tab === t.key ? 'bg-white shadow-sm text-church-900' : 'text-church-500 hover:text-church-700'}`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'funnel' && overview && funnel && (
        <FunnelReport overview={overview} funnel={funnel} />
      )}
      {tab === 'volunteers' && volPerf && (
        <VolunteerReport data={volPerf} />
      )}
      {tab === 'operational' && ops && (
        <OperationalReport data={ops} />
      )}
      {tab === 'exports' && <ExportsSection />}
    </div>
  );
}

function FunnelReport({ overview, funnel }: { overview: any; funnel: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Assigned within 24h" value={`${overview.pctAssigned24h}%`} target="Goal: 90%" />
        <MetricCard label="Contacted within 48h" value={`${overview.pctContacted48h}%`} target="Goal: 80%" />
        <MetricCard label="Returned at least 1x" value={`${overview.pctReturned1x}%`} />
        <MetricCard label="Hit 7/7 Target" value={`${overview.pctReturned7x}%`} />
      </div>

      <div className="card">
        <h2 className="section-header mb-4">Monthly Funnel (Last 6 Months)</h2>
        <div className="table-container border-0 shadow-none">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">New Guests</th>
                <th className="text-right">Assigned</th>
                <th className="text-right">Contacted</th>
                <th className="text-right">Become Signups</th>
              </tr>
            </thead>
            <tbody>
              {funnel.months?.map((m: any) => (
                <tr key={m.month}>
                  <td className="font-medium">{m.month}</td>
                  <td className="text-right">{m.newGuests}</td>
                  <td className="text-right">{m.assigned}</td>
                  <td className="text-right">{m.contacted}</td>
                  <td className="text-right font-medium text-emerald-600">{m.becomeSignups}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="section-header mb-4">Service Return Milestones</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-700">{overview.returned1x}</div>
            <div className="text-sm text-blue-600 mt-1">Returned 1+ times</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-700">{overview.returned3x}</div>
            <div className="text-sm text-purple-600 mt-1">Returned 3+ times</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-3xl font-bold text-emerald-700">{overview.returned7x}</div>
            <div className="text-sm text-emerald-600 mt-1">Hit 7/7 Target</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-header mb-3">Drop-Off Breakdown</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{overview.statusCounts?.NOT_INTERESTED || 0}</div>
            <div className="text-sm text-red-600">Not Interested</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">{overview.statusCounts?.INACTIVE || 0}</div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VolunteerReport({ data }: { data: any }) {
  const volunteers = data.volunteers || [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [volunteerDetail, setVolunteerDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleVolunteerClick = async (volId: string) => {
    if (expandedId === volId) {
      setExpandedId(null);
      setVolunteerDetail(null);
      return;
    }

    setExpandedId(volId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/volunteers?id=${volId}`);
      if (res.ok) {
        const detail = await res.json();
        setVolunteerDetail(detail);
      }
    } catch (err) {
      console.error('Failed to load volunteer detail', err);
    }
    setDetailLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Assignee</th>
              <th className="text-right">Guests</th>
              <th className="text-right">Activities</th>
              <th className="text-right">Become Signups</th>
              <th className="text-right">Avg Returns</th>
              <th className="text-right">Hit 7/7</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.map((v: any) => (
              <>
                <tr key={v.id} className="cursor-pointer hover:bg-brand-50 transition-colors"
                  onClick={() => handleVolunteerClick(v.id)}>
                  <td className="font-medium text-brand-600 underline decoration-dotted underline-offset-4">
                    <span className="flex items-center gap-2">
                      {expandedId === v.id ? '▼' : '▶'} {v.name}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-church-100 text-church-500 font-normal no-underline">{v.role}</span>
                    </span>
                  </td>
                  <td className="text-right">{v.guestCount}</td>
                  <td className="text-right">{v.activityCount}</td>
                  <td className="text-right font-medium text-emerald-600">{v.becomeSignups}</td>
                  <td className="text-right">{v.avgReturns}</td>
                  <td className="text-right font-medium">{v.guests7Returns}</td>
                </tr>

                {/* Expanded Detail Row */}
                {expandedId === v.id && (
                  <tr key={`${v.id}-detail`}>
                    <td colSpan={6} className="p-0">
                      <div className="bg-church-50 border-t border-b border-church-200 p-4">
                        {detailLoading ? (
                          <div className="text-center py-4 text-church-400">Loading volunteer details...</div>
                        ) : volunteerDetail ? (
                          <VolunteerDetailPanel detail={volunteerDetail} />
                        ) : (
                          <div className="text-center py-4 text-red-500">Failed to load details</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Activity breakdown per volunteer */}
      {volunteers.map((v: any) => (
        <div key={v.id} className="card">
          <h3 className="font-medium mb-3">{v.name} — Activity Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(v.activityByType || {}).map(([type, count]) => (
              <span key={type} className="badge bg-church-100 text-church-700">
                {ACTIVITY_LABELS[type] || type}: {count as number}
              </span>
            ))}
            {Object.keys(v.activityByType || {}).length === 0 && (
              <span className="text-sm text-church-400 italic">No activities logged</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function VolunteerDetailPanel({ detail }: { detail: any }) {
  const guests = detail.assignedGuests || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-church-900">
          {detail.name} — Assigned Guests ({guests.length})
        </h3>
        <div className="text-sm text-church-500">
          {detail.email} {detail.phone ? `• ${detail.phone}` : ''}
        </div>
      </div>

      {guests.length === 0 ? (
        <p className="text-sm text-church-400 italic">No guests currently assigned</p>
      ) : (
        <div className="space-y-3">
          {guests.map((guest: any) => (
            <div key={guest.id} className="bg-white rounded-lg border border-church-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Link href={`/dashboard/guests/${guest.id}`}
                  className="font-medium text-brand-600 hover:text-brand-700 underline">
                  {guest.firstName} {guest.lastName}
                </Link>
                <div className="flex items-center gap-3">
                  <span className={`badge ${STATUS_COLORS[guest.status] || 'bg-church-100 text-church-700'}`}>
                    {STATUS_LABELS[guest.status] || guest.status}
                  </span>
                  <span className="text-xs font-medium text-church-600">
                    Returns: {guest.serviceReturnCount}/{guest.serviceReturnTarget}
                  </span>
                </div>
              </div>

              <div className="text-xs text-church-500 mb-3 flex flex-wrap gap-x-4">
                {guest.phone && <span>📞 {guest.phone}</span>}
                {guest.email && <span>📧 {guest.email}</span>}
                <span>⛪ {guest.serviceAttended || 'N/A'}</span>
                <span>📅 First visit: {formatDate(guest.firstVisitDate)}</span>
                {guest.assignedAt && <span>✅ Assigned: {formatDate(guest.assignedAt)}</span>}
              </div>

              {/* Activity Timeline */}
              {guest.activities && guest.activities.length > 0 ? (
                <div className="border-t border-church-100 pt-2 mt-2">
                  <p className="text-xs font-medium text-church-600 mb-2">
                    Activity Log ({guest.activities.length} total):
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {guest.activities.map((act: any) => {
                      const isOverdue = act.nextFollowUpDate && new Date(act.nextFollowUpDate) < new Date();
                      return (
                        <div key={act.id} className="flex items-start gap-2 text-xs">
                          <span className="text-church-400 whitespace-nowrap min-w-[70px]">
                            {formatDate(act.activityDateTime)}
                          </span>
                          <span className="badge bg-church-100 text-church-600 text-[10px] whitespace-nowrap">
                            {ACTIVITY_LABELS[act.activityType] || act.activityType}
                          </span>
                          <span className="text-church-600 flex-1">
                            {act.outcome || act.notes || '—'}
                          </span>
                          {act.nextFollowUpDate && (
                            <span className={`whitespace-nowrap ${isOverdue ? 'text-red-600 font-medium' : 'text-church-400'}`}>
                              Next: {formatDate(act.nextFollowUpDate)} {isOverdue ? '⚠️' : ''}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-church-400 italic border-t border-church-100 pt-2 mt-2">
                  No activities logged yet
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OperationalReport({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="card border-l-4 border-l-red-400">
        <h2 className="section-header text-red-700 mb-3">
          ⚠️ Unassigned Guests &gt;24h ({data.unassigned24h?.length || 0})
        </h2>
        {data.unassigned24h?.length === 0 ? (
          <p className="text-sm text-green-600">All guests assigned within 24 hours ✓</p>
        ) : (
          <div className="space-y-2">
            {data.unassigned24h.map((g: any) => (
              <Link key={g.id} href={`/dashboard/guests/${g.id}`}
                className="flex justify-between items-center p-2 bg-red-50 rounded hover:bg-red-100">
                <span className="font-medium text-sm">{g.firstName} {g.lastName}</span>
                <span className="text-xs text-church-500">{formatDate(g.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card border-l-4 border-l-amber-400">
        <h2 className="section-header text-amber-700 mb-3">
          📅 Overdue Follow-Ups ({data.overdueFollowUps?.length || 0})
        </h2>
        {data.overdueFollowUps?.length === 0 ? (
          <p className="text-sm text-green-600">No overdue follow-ups ✓</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.overdueFollowUps.map((a: any) => (
              <div key={a.id} className="flex justify-between items-center p-2 bg-amber-50 rounded text-sm">
                <div>
                  <span className="font-medium">{a.guest?.firstName} {a.guest?.lastName}</span>
                  <span className="text-church-500 ml-2">by {a.performedBy?.name}</span>
                </div>
                <span className="text-red-600 text-xs font-medium">
                  Due: {formatDate(a.nextFollowUpDate)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card border-l-4 border-l-gray-400">
        <h2 className="section-header text-gray-700 mb-3">
          💤 Stalled Guests — No Activity 7+ Days ({data.stalledGuests?.length || 0})
        </h2>
        {data.stalledGuests?.length === 0 ? (
          <p className="text-sm text-green-600">No stalled guests ✓</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.stalledGuests.map((g: any) => (
              <Link key={g.id} href={`/dashboard/guests/${g.id}`}
                className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm hover:bg-gray-100">
                <div>
                  <span className="font-medium">{g.firstName} {g.lastName}</span>
                  <span className="text-church-500 ml-2">→ {g.assignedVolunteer?.name}</span>
                </div>
                <span className="text-xs text-church-400">
                  Last: {g.activities?.[0] ? formatDate(g.activities[0].activityDateTime) : 'Never'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card border-l-4 border-l-emerald-400">
        <h2 className="section-header text-emerald-700 mb-3">
          🎯 Near Target — 5/7 or 6/7 ({data.nearTarget?.length || 0})
        </h2>
        {data.nearTarget?.length === 0 ? (
          <p className="text-sm text-church-400">No guests near target currently</p>
        ) : (
          <div className="space-y-2">
            {data.nearTarget.map((g: any) => (
              <Link key={g.id} href={`/dashboard/guests/${g.id}`}
                className="flex justify-between items-center p-2 bg-emerald-50 rounded text-sm hover:bg-emerald-100">
                <span className="font-medium">{g.firstName} {g.lastName}</span>
                <span className="badge bg-emerald-100 text-emerald-700">
                  {g.serviceReturnCount}/7
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExportsSection() {
  const exports = [
    { type: 'guests', label: 'Guests Export', desc: 'All guests with status, volunteer, returns, become signup' },
    { type: 'activities', label: 'Activity Logs Export', desc: 'All follow-up activities with dates and outcomes' },
    { type: 'service-returns', label: 'Service Returns Export', desc: 'Each service return record with dates' },
    { type: 'volunteer-summary', label: 'Volunteer Summary Export', desc: 'Aggregated volunteer performance metrics' },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {exports.map(exp => (
        <div key={exp.type} className="card">
          <h3 className="font-medium mb-1">{exp.label}</h3>
          <p className="text-sm text-church-500 mb-3">{exp.desc}</p>
          <a href={`/api/reports/export?type=${exp.type}`}
            className="btn-primary btn-sm inline-flex items-center gap-2"
            download>
            📥 Download CSV
          </a>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, target }: { label: string; value: string; target?: string }) {
  return (
    <div className="stat-card border border-church-100">
      <div className="text-xs text-church-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-church-900">{value}</div>
      {target && <div className="text-[11px] text-church-400 mt-1">{target}</div>}
    </div>
  );
}
