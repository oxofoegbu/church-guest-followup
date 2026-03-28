'use client';
import PageHelp from '@/components/PageHelp';

import { useEffect, useState, useCallback } from 'react';

type UserRef = { id: string; name: string; email: string; phone: string | null } | null;
type ServiceSchedule = {
  id: string; date: string; monthTheme: string | null; topic: string;
  speakerName: string | null; serviceCoordinatorName: string | null;
  propheticPrayerName: string | null; worshipLeaderName: string | null;
  speakerId: string | null; serviceCoordinatorId: string | null;
  propheticPrayerId: string | null; worshipLeaderId: string | null;
  speaker: UserRef; serviceCoordinator: UserRef;
  propheticPrayer: UserRef; worshipLeader: UserRef;
  reminderSent: boolean; notes: string | null;
};
type ScheduleYear = { year: number; label: string; archived: boolean; theme: string | null; sundayCount: number };

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_COLORS = [
  'border-violet-300 bg-violet-50','border-rose-300 bg-rose-50','border-emerald-300 bg-emerald-50',
  'border-amber-300 bg-amber-50','border-cyan-300 bg-cyan-50','border-lime-300 bg-lime-50',
  'border-orange-300 bg-orange-50','border-teal-300 bg-teal-50','border-indigo-300 bg-indigo-50',
  'border-red-300 bg-red-50','border-purple-300 bg-purple-50','border-blue-300 bg-blue-50',
];
const HEADER_COLORS = [
  'bg-violet-700','bg-rose-700','bg-emerald-700','bg-amber-600','bg-cyan-700','bg-lime-700',
  'bg-orange-700','bg-teal-700','bg-indigo-700','bg-red-700','bg-purple-700','bg-blue-700',
];

function getDisplayName(name: string | null, user: UserRef): string {
  if (user?.name) return user.name;
  if (name && name !== 'TBD') return name;
  return 'TBD';
}

function AssignModal({ service, onClose, onSaved }: { service: ServiceSchedule; onClose: () => void; onSaved: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    speakerId: service.speakerId,             speakerName: service.speakerName || '',
    serviceCoordinatorId: service.serviceCoordinatorId, serviceCoordinatorName: service.serviceCoordinatorName || '',
    propheticPrayerId: service.propheticPrayerId,       propheticPrayerName: service.propheticPrayerName || '',
    worshipLeaderId: service.worshipLeaderId,           worshipLeaderName: service.worshipLeaderName || '',
    notes: service.notes || '',
    isSeminar: (service as any).isSeminar || false,
    panelSpeakers: (service as any).panelSpeakers || [{ name: '', userId: '', title: '' }, { name: '', userId: '', title: '' }],
  });

  useEffect(() => {
    fetch('/api/users?limit=200').then(r => r.json())
      .then(d => setUsers(Array.isArray(d) ? d : (d.users || []))).catch(() => {});
  }, []);

  const dateStr = new Date(service.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/schedule/${service.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, panelSpeakers: form.isSeminar ? form.panelSpeakers.filter((s: any) => s.name.trim()) : null }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const roles = [
    { label: '🎤 Speaker (Word Minister)', idKey: 'speakerId' as const,            nameKey: 'speakerName' as const },
    { label: '📋 Service Coordinator',     idKey: 'serviceCoordinatorId' as const,  nameKey: 'serviceCoordinatorName' as const },
    { label: '🙏 Prophetic Prayer',        idKey: 'propheticPrayerId' as const,     nameKey: 'propheticPrayerName' as const },
    { label: '🎵 Worship Leader',          idKey: 'worshipLeaderId' as const,       nameKey: 'worshipLeaderName' as const },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 z-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-church-900">✏️ Assign Roles</h2>
            <p className="text-sm text-church-500">{dateStr}</p>
            <p className="text-xs text-church-400 mt-0.5 italic line-clamp-1">{service.topic}</p>
          </div>
          <button onClick={onClose} className="p-2 text-church-400 hover:text-church-600 rounded-lg">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {roles.map(({ label, idKey, nameKey }) => (
            <div key={idKey}>
              <label className="label">{label}</label>
              <select
                value={form[idKey] || ''}
                onChange={e => {
                  const sel = users.find(u => u.id === e.target.value);
                  setForm(f => ({ ...f, [idKey]: e.target.value || null, [nameKey]: sel?.name || f[nameKey] }));
                }}
                className="select-field mb-1.5"
              >
                <option value="">— Select from users (links to calendar) —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
              <input
                type="text" value={form[nameKey]}
                onChange={e => setForm(f => ({ ...f, [nameKey]: e.target.value, [idKey]: null }))}
                placeholder="Or type name manually (TBD, Young Adults…)"
                className="input-field text-church-500 text-sm"
              />
            </div>
          ))}
          <div>
            <label className="label">📌 Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="textarea-field" />
          </div>
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            💡 Selecting a user by name sends them an <strong>immediate email + WhatsApp</strong> and adds this to their <strong>My Calendar</strong>.
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Saving…' : 'Save & Notify'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewYearModal({ onClose, onCreated }: { onClose: () => void; onCreated: (year: number) => void }) {
  const nextYear = new Date().getFullYear() + 1;
  const [form, setForm] = useState({ year: nextYear, label: `${nextYear} Sunday Schedule`, theme: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const countSundays = (y: number) => {
    let c = 0; const d = new Date(Date.UTC(y,0,1));
    while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate()+1);
    while (d.getUTCFullYear() === y) { c++; d.setUTCDate(d.getUTCDate()+7); }
    return c;
  };

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/schedule/years', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, panelSpeakers: form.isSeminar ? form.panelSpeakers.filter((s: any) => s.name.trim()) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(form.year);
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 z-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-bold text-church-900 mb-4">📅 Create New Schedule Year</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Year *</label>
            <input type="number" value={form.year}
              onChange={e => setForm(f => ({ ...f, year: Number(e.target.value), label: `${e.target.value} Sunday Schedule` }))}
              className="input-field" min={2025} max={2100} />
          </div>
          <div>
            <label className="label">Label</label>
            <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="label">Year Theme (optional)</label>
            <input type="text" value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
              className="input-field" placeholder="e.g. Walking in the Spirit…" />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            🗓️ Will generate <strong>{countSundays(form.year)}</strong> blank Sundays for {form.year}.
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Creating…' : `Create ${form.year} Schedule`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [years, setYears] = useState<ScheduleYear[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [coordinatorUserIds, setCoordinatorUserIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<ServiceSchedule | null>(null);
  const [showNewYear, setShowNewYear] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const fetchYears = useCallback(async () => {
    const res = await fetch('/api/schedule/years?includeArchived=true');
    const data = await res.json();
    const all = Array.isArray(data) ? data : [];
    setYears(all);
  }, []);

  const doFetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?year=${selectedYear}`);
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => {
    // Load user, years, and coordinator settings in parallel
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()).catch(() => ({})),
      fetchYears(),
      fetch('/api/settings').then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([meData, _years, settingsData]) => {
      if (meData?.user) setUser(meData.user);
      // Parse schedule_coordinators to get list of authorised user IDs
      try {
        const coords = JSON.parse((settingsData as any)?.schedule_coordinators || '[]');
        setCoordinatorUserIds(coords.map((c: any) => c.userId));
      } catch { setCoordinatorUserIds([]); }
    });
  }, [fetchYears]);

  useEffect(() => { doFetch(); }, [doFetch]);

  // canEdit: admin/senior_leader/leader roles OR explicitly designated coordinator
  const canEdit = user && (
    ['ADMIN', 'SENIOR_LEADER', 'LEADER'].includes(user.role) ||
    coordinatorUserIds.includes(user.userId || user.id)
  );
  const isAdmin = user && ['ADMIN', 'SENIOR_LEADER'].includes(user.role);
  const selectedYearData = years.find(y => y.year === selectedYear);

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/schedule/${selectedYear}`
    : `/schedule/${selectedYear}`;
  const printUrl = `/schedule/${selectedYear}/print`;

  const handleCopyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); }
    catch { prompt('Copy this link:', publicUrl); return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleArchive = async () => {
    if (!confirm(`Archive the ${selectedYear} schedule?`)) return;
    await fetch('/api/schedule/years', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: selectedYear, archived: true }),
    });
    await fetchYears();
    const active = years.filter(y => !y.archived && y.year !== selectedYear);
    if (active.length > 0) setSelectedYear(active[0].year);
  };

  const handleUnarchive = async () => {
    await fetch('/api/schedule/years', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: selectedYear, archived: false }),
    });
    await fetchYears();
  };

  const byMonth = schedules.reduce<Record<number, ServiceSchedule[]>>((acc, svc) => {
    const m = new Date(svc.date).getUTCMonth();
    if (!acc[m]) acc[m] = [];
    acc[m].push(svc);
    return acc;
  }, {});

  const todayStr = new Date().toISOString().slice(0, 10);
  const visibleYears = showArchived ? years : years.filter(y => !y.archived);

  return (
    <>
    <div className="fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="page-header">⛪ Sunday Schedule</h1>
        <PageHelp docSection="sunday-schedule" tips={[
          { icon: "✏️", title: "Assigning roles", body: "Click the pencil icon on any Sunday card. Select a user from the dropdown to link them — they get an immediate notification and a calendar entry. Or type a name manually for guests or TBD." },
          { icon: "🔗", title: "Linking sends notifications", body: "Only roles linked to a user account trigger email + WhatsApp notifications and 7-day advance reminders. Plain text names do not." },
          { icon: "🌐", title: "Share publicly", body: "Use Copy Share Link to send the full schedule to anyone — no login required. Great for the church WhatsApp group." }
        ]} />
          <p className="text-church-500 text-sm mt-1">Grace Life Center — {selectedYearData?.label || selectedYear}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="select-field text-sm py-1.5">
            {visibleYears.map(y => <option key={y.year} value={y.year}>{y.label}{y.archived ? ' 📦' : ''}</option>)}
          </select>
          {years.some(y => y.archived) && (
            <button onClick={() => setShowArchived(s => !s)} className="btn-secondary btn-sm text-xs">
              {showArchived ? 'Hide Archived' : '📦 Archived'}
            </button>
          )}
          {isAdmin && selectedYearData?.archived && (
            <button onClick={handleUnarchive} className="btn-secondary btn-sm text-xs text-emerald-600">♻️ Restore</button>
          )}
          {isAdmin && !selectedYearData?.archived && (
            <button onClick={handleArchive} className="btn-secondary btn-sm text-xs text-amber-600">📦 Archive</button>
          )}
          {isAdmin && (
            <button onClick={() => setShowNewYear(true)} className="btn-primary btn-sm">+ New Year</button>
          )}
        </div>
      </div>

      {/* Share + Print toolbar */}
      <div className="flex flex-wrap gap-2 mb-5 p-3 bg-church-50 border border-church-200 rounded-xl">
        <button onClick={handleCopyLink}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-white border border-church-300 text-church-700 hover:bg-church-100'}`}>
          {copied ? '✓ Link Copied!' : '🔗 Copy Share Link'}
        </button>
        <a href={publicUrl} target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-church-300 text-church-700 hover:bg-church-100 transition-colors">
          🌐 Open Public Page
        </a>
        <a href={printUrl} target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-church-300 text-church-700 hover:bg-church-100 transition-colors">
          🖨️ Print / Save as PDF
        </a>
        <div className="flex items-center ml-auto text-xs text-church-400 gap-1 flex-wrap">
          <span>Share:</span>
          <code className="bg-white border border-church-200 px-2 py-0.5 rounded text-church-600 text-[11px]">{publicUrl}</code>
        </div>
      </div>

      {/* Year theme banner */}
      {selectedYearData?.theme && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-church-900 via-purple-900 to-church-900 text-white px-6 py-4">
          <p className="text-xs font-semibold tracking-widest text-purple-300 uppercase mb-1">
            Year Theme · {selectedYear}
            {selectedYearData.archived && <span className="ml-2 bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded text-[10px]">ARCHIVED</span>}
          </p>
          <h2 className="text-lg font-bold">{selectedYearData.theme.split(' — ')[0]}</h2>
          {selectedYearData.theme.includes(' — ') && (
            <p className="text-purple-200 text-sm italic">{selectedYearData.theme.split(' — ')[1]}</p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-church-900">{schedules.length}</p>
          <p className="text-xs text-church-500">Sundays</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-brand-600">
            {schedules.filter(s => s.speakerId || s.serviceCoordinatorId || s.propheticPrayerId || s.worshipLeaderId).length}
          </p>
          <p className="text-xs text-church-500">Roles Linked</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{schedules.filter(s => s.reminderSent).length}</p>
          <p className="text-xs text-church-500">Reminders Sent</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-church-400">Loading schedule…</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-church-400 mb-2">No Sundays found for {selectedYear}.</p>
          {isAdmin && <p className="text-sm text-church-400">Click <strong>+ New Year</strong> to generate all Sundays automatically.</p>}
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
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [month]: !c[month] }))}
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
                    <span className="text-white/70">{isCollapsed ? '▼' : '▲'}</span>
                  </button>

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
                          <div key={svc.id} className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all ${isToday ? 'ring-2 ring-brand-500' : 'border-gray-200'}`}>
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center">
                                    <span className="text-[10px] text-gray-400 uppercase leading-none">{dayName}</span>
                                    <span className="text-lg font-bold text-gray-800 leading-tight">{day}</span>
                                  </div>
                                  {isToday && <span className="text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full uppercase">Today</span>}
                                </div>
                                {canEdit && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditing(svc); }}
                                    className="p-1.5 text-church-300 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                                    title="Assign roles"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>
                              <h3 className={`text-sm font-semibold leading-snug line-clamp-2 mb-1 ${title.startsWith('TBD') ? 'text-church-400 italic' : 'text-gray-900'}`}>
                                {title}
                              </h3>
                              {scripture && <p className="text-[11px] text-purple-600 italic mb-3">{scripture}</p>}
                              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                                {[
                                  { label: '🎤 Speaker', name: (svc as any).isSeminar ? '🎓 Seminar' : svc.speakerName, user: (svc as any).isSeminar ? null : svc.speaker },
                                  { label: '📋 Coord.',  name: svc.serviceCoordinatorName, user: svc.serviceCoordinator },
                                  { label: '🙏 Prayer',  name: svc.propheticPrayerName, user: svc.propheticPrayer },
                                  { label: '🎵 Worship', name: svc.worshipLeaderName, user: svc.worshipLeader },
                                ].map(({ label, name, user: u }) => {
                                  const display = getDisplayName(name, u);
                                  return (
                                    <div key={label}>
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
                                      <p className={`text-xs font-medium truncate ${display === 'TBD' ? 'text-gray-400 italic' : u ? 'text-brand-600' : 'text-gray-800'}`}>
                                        {display}{u ? ' 🔗' : ''}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                              {svc.notes && <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded italic">📌 {svc.notes}</p>}
                              {svc.reminderSent && <p className="mt-1 text-[10px] text-emerald-600">✓ Reminder sent</p>}
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

    </div>
      {editing && (
        <AssignModal service={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); doFetch(); }} />
      )}
      {showNewYear && (
        <NewYearModal
          onClose={() => setShowNewYear(false)}
          onCreated={(year) => { setShowNewYear(false); fetchYears(); setSelectedYear(year); }}
        />
      )}
    </>
  );
}
