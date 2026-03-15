'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type UserRef = { id: string; name: string; email: string; phone: string | null } | null;

type ServiceSchedule = {
  id: string;
  date: string;
  monthTheme: string | null;
  topic: string;
  speakerName: string | null;
  serviceCoordinatorName: string | null;
  propheticPrayerName: string | null;
  worshipLeaderName: string | null;
  speakerId: string | null;
  serviceCoordinatorId: string | null;
  propheticPrayerId: string | null;
  worshipLeaderId: string | null;
  speaker: UserRef;
  serviceCoordinator: UserRef;
  propheticPrayer: UserRef;
  worshipLeader: UserRef;
  reminderSent: boolean;
  notes: string | null;
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const MONTH_COLORS = [
  'border-violet-300 bg-violet-50',
  'border-rose-300 bg-rose-50',
  'border-emerald-300 bg-emerald-50',
  'border-amber-300 bg-amber-50',
  'border-cyan-300 bg-cyan-50',
  'border-lime-300 bg-lime-50',
  'border-orange-300 bg-orange-50',
  'border-teal-300 bg-teal-50',
  'border-indigo-300 bg-indigo-50',
  'border-red-300 bg-red-50',
  'border-purple-300 bg-purple-50',
  'border-blue-300 bg-blue-50',
];

const HEADER_COLORS = [
  'bg-violet-700','bg-rose-700','bg-emerald-700','bg-amber-600',
  'bg-cyan-700','bg-lime-700','bg-orange-700','bg-teal-700',
  'bg-indigo-700','bg-red-700','bg-purple-700','bg-blue-700',
];

function getDisplayName(name: string | null, user: UserRef): string {
  if (user?.name) return user.name;
  if (name && name !== 'TBD') return name;
  return 'TBD';
}

function AssignModal({
  service,
  currentUser,
  onClose,
  onSaved,
}: {
  service: ServiceSchedule;
  currentUser: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    speakerId: service.speakerId,
    speakerName: service.speakerName || '',
    serviceCoordinatorId: service.serviceCoordinatorId,
    serviceCoordinatorName: service.serviceCoordinatorName || '',
    propheticPrayerId: service.propheticPrayerId,
    propheticPrayerName: service.propheticPrayerName || '',
    worshipLeaderId: service.worshipLeaderId,
    worshipLeaderName: service.worshipLeaderName || '',
    notes: service.notes || '',
  });

  useEffect(() => {
    fetch('/api/users?limit=200')
      .then(r => r.json())
      .then(d => setUsers(Array.isArray(d) ? d : (d.users || [])))
      .catch(() => {});
  }, []);

  const date = new Date(service.date);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/schedule/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const roles = [
    { label: '🎤 Speaker (Word Minister)', idKey: 'speakerId', nameKey: 'speakerName' },
    { label: '📋 Service Coordinator',      idKey: 'serviceCoordinatorId', nameKey: 'serviceCoordinatorName' },
    { label: '🙏 Prophetic Prayer',         idKey: 'propheticPrayerId', nameKey: 'propheticPrayerName' },
    { label: '🎵 Worship Leader',           idKey: 'worshipLeaderId', nameKey: 'worshipLeaderName' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">✏️ Assign Roles</h2>
            <p className="text-sm text-gray-500">{dateStr}</p>
            <p className="text-xs text-gray-400 mt-0.5 italic line-clamp-1">{service.topic}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {roles.map(({ label, idKey, nameKey }) => (
            <div key={idKey}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
              <div className="flex gap-2">
                <select
                  value={form[idKey] || ''}
                  onChange={e => {
                    const selected = users.find(u => u.id === e.target.value);
                    setForm(f => ({
                      ...f,
                      [idKey]: e.target.value || null,
                      [nameKey]: selected?.name || f[nameKey],
                    }));
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— Select from users —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={form[nameKey]}
                onChange={e => setForm(f => ({ ...f, [nameKey]: e.target.value, [idKey]: null }))}
                placeholder="Or type name manually (TBD, Young Adults…)"
                className="mt-1.5 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">📌 Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any special notes for this service…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState<ServiceSchedule | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedule?year=2026');
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)).catch(() => {});
    fetchSchedules();
  }, [fetchSchedules]);

  const canEdit = user && ['ADMIN', 'SENIOR_LEADER', 'LEADER'].includes(user.role);

  const byMonth = schedules.reduce<Record<number, ServiceSchedule[]>>((acc, svc) => {
    const m = new Date(svc.date).getUTCMonth();
    if (!acc[m]) acc[m] = [];
    acc[m].push(svc);
    return acc;
  }, {});

  const todayStr = new Date().toISOString().slice(0, 10);

  const toggleMonth = (m: number) => setCollapsed(c => ({ ...c, [m]: !c[m] }));

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-church-900">📅 Sunday Schedule</h1>
        <p className="text-church-500 text-sm mt-1">Grace Life Center · 2026 — Bringing In The Harvest</p>
      </div>

      {/* Year theme banner */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-church-900 via-purple-900 to-church-900 text-white px-6 py-4">
        <p className="text-xs font-semibold tracking-widest text-purple-300 uppercase mb-1">Year Theme · 2026</p>
        <h2 className="text-lg font-bold">Bringing In The Harvest</h2>
        <p className="text-purple-200 text-sm italic">Matt. 9:35–38 · John 4:35–37 · Psalm 126:6</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-church-400">Loading schedule…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byMonth)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([monthStr, services]) => {
              const month = Number(monthStr);
              const isCollapsed = collapsed[month];
              const theme = services[0]?.monthTheme || '';
              const [themeName, themeSub] = theme.includes(' — ') ? theme.split(' — ') : [theme, ''];
              const cleanName = themeName.replace(/^[A-Z]+ THEME:\s*/i, '');

              return (
                <div key={month} className={`rounded-xl border-2 overflow-hidden ${MONTH_COLORS[month]}`}>
                  {/* Month header */}
                  <button
                    onClick={() => toggleMonth(month)}
                    className={`w-full text-left px-5 py-4 ${HEADER_COLORS[month]} text-white flex items-center justify-between`}
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{MONTH_NAMES[month]}</span>
                        <span className="text-white/60 text-sm">{services.length} Sundays</span>
                      </div>
                      {cleanName && (
                        <p className="text-white/85 text-sm mt-0.5">
                          {cleanName}{themeSub ? <span className="text-white/55"> — {themeSub}</span> : null}
                        </p>
                      )}
                    </div>
                    <span className="text-white/70 text-lg">{isCollapsed ? '▼' : '▲'}</span>
                  </button>

                  {/* Sunday cards */}
                  {!isCollapsed && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      {services.map(svc => {
                        const date = new Date(svc.date);
                        const day = date.getUTCDate();
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
                        const isToday = svc.date.startsWith(todayStr);
                        const scriptureMatch = svc.topic.match(/\(([^)]+)\)\s*$/);
                        const scripture = scriptureMatch?.[1] || null;
                        const title = scripture ? svc.topic.replace(/\s*\([^)]+\)\s*$/, '') : svc.topic;

                        return (
                          <div
                            key={svc.id}
                            className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all
                              ${isToday ? 'ring-2 ring-brand-500 shadow-brand-100' : 'border-gray-200'}`}
                          >
                            <div className="p-4">
                              {/* Date row */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center">
                                    <span className="text-[10px] text-gray-400 uppercase leading-none">{dayName}</span>
                                    <span className="text-lg font-bold text-gray-800 leading-tight">{day}</span>
                                  </div>
                                  {isToday && (
                                    <span className="text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full uppercase">
                                      This Sunday
                                    </span>
                                  )}
                                </div>
                                {canEdit && (
                                  <button
                                    onClick={() => setEditing(svc)}
                                    className="text-gray-400 hover:text-brand-500 text-lg transition-colors"
                                    title="Assign roles"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>

                              {/* Topic */}
                              <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">
                                {title}
                              </h3>
                              {scripture && (
                                <p className="text-[11px] text-purple-600 italic mb-3">{scripture}</p>
                              )}

                              {/* Roles */}
                              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                                {[
                                  { label: '🎤', role: 'Speaker', name: svc.speakerName, user: svc.speaker },
                                  { label: '📋', role: 'Coord.', name: svc.serviceCoordinatorName, user: svc.serviceCoordinator },
                                  { label: '🙏', role: 'Prayer', name: svc.propheticPrayerName, user: svc.propheticPrayer },
                                  { label: '🎵', role: 'Worship', name: svc.worshipLeaderName, user: svc.worshipLeader },
                                ].map(({ label, role, name, user: u }) => {
                                  const display = getDisplayName(name, u);
                                  return (
                                    <div key={role}>
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">
                                        {label} {role}
                                      </p>
                                      <p className={`text-xs font-medium truncate ${display === 'TBD' ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                                        {display}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>

                              {svc.notes && (
                                <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded italic">
                                  📌 {svc.notes}
                                </p>
                              )}
                              {svc.reminderSent && (
                                <p className="mt-1 text-[10px] text-emerald-600">✓ Reminder sent</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {editing && (
        <AssignModal
          service={editing}
          currentUser={user}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchSchedules(); }}
        />
      )}
    </div>
  );
}
