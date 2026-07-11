'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPermissionLevel } from '@/lib/roles';

type Module = { id: string; weekNumber: number; title: string; summary: string | null };
type Cohort = {
  id: string; name: string; startDate: string | null;
  meetingDay: string | null; meetingTime: string | null; status: string;
  facilitator: { id: string; name: string } | null;
  _count: { enrollments: number };
};
type Enrollment = {
  id: string; status: string; startedAt: string; completedAt: string | null; notes: string | null;
  portalToken: string;
  guest: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; status: string } | null;
  user: { id: string; name: string; email: string; phone: string | null } | null;
  discipler: { id: string; name: string; email: string; phone: string | null } | null;
  cohort: { id: string; name: string } | null;
  progress: { moduleId: string; completedAt: string }[];
};
type TrackDetail = {
  id: string; name: string; slug: string; description: string | null;
  isActive: boolean; milestoneLabel: string | null; workbookUrl: string | null;
  modules: Module[]; cohorts: Cohort[]; enrollments: Enrollment[];
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-brand-100 text-brand-700',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function participantName(e: Enrollment) {
  return e.guest ? `${e.guest.firstName} ${e.guest.lastName}` : e.user?.name || 'Unknown';
}

// ─── Module modal ────────────────────────────────────────────────
function ModuleModal({ trackId, module: mod, nextWeek, onClose, onSaved }: {
  trackId: string; module?: Module; nextWeek: number; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!mod;
  const [weekNumber, setWeekNumber] = useState<number>(mod?.weekNumber ?? nextWeek);
  const [title, setTitle] = useState(mod?.title || '');
  const [summary, setSummary] = useState(mod?.summary || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const res = isEdit
        ? await fetch(`/api/tracks/${trackId}/modules/${mod!.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekNumber, title, summary }),
          })
        : await fetch(`/api/tracks/${trackId}/modules`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekNumber, title, summary }),
          });
      if (!res.ok) throw new Error((await res.json()).error);
      onSaved();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-church-900">{isEdit ? '✏️ Edit Module' : '📚 New Module'}</h2>
          <button onClick={onClose} className="text-church-400 hover:text-church-600 p-1">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="label">Week #</label>
              <input type="number" min={1} value={weekNumber}
                onChange={e => setWeekNumber(parseInt(e.target.value) || 1)} className="input-field" />
            </div>
            <div className="col-span-3">
              <label className="label">Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="input-field" placeholder="e.g. A Life Founded on Rock" />
            </div>
          </div>
          <div>
            <label className="label">Summary (optional)</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)}
              rows={3} className="textarea-field" placeholder="One or two sentences on what this week covers" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Module'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cohort modal ────────────────────────────────────────────────
function CohortModal({ trackId, cohort, users, onClose, onSaved }: {
  trackId: string; cohort?: Cohort; users: any[]; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!cohort;
  const [name, setName] = useState(cohort?.name || '');
  const [startDate, setStartDate] = useState(cohort?.startDate ? cohort.startDate.slice(0, 10) : '');
  const [meetingDay, setMeetingDay] = useState(cohort?.meetingDay || '');
  const [meetingTime, setMeetingTime] = useState(cohort?.meetingTime || '');
  const [facilitatorUserId, setFacilitatorUserId] = useState(cohort?.facilitator?.id || '');
  const [status, setStatus] = useState(cohort?.status || 'ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Cohort name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name, startDate: startDate || null, meetingDay, meetingTime, facilitatorUserId, status };
      const res = isEdit
        ? await fetch(`/api/tracks/${trackId}/cohorts/${cohort!.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/tracks/${trackId}/cohorts`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error((await res.json()).error);
      onSaved();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-church-900">{isEdit ? '✏️ Edit Cohort' : '🧑‍🤝‍🧑 New Cohort'}</h2>
          <button onClick={onClose} className="text-church-400 hover:text-church-600 p-1">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Cohort Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="input-field" placeholder="e.g. Fall 2026 Evening Group" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Meeting Day</label>
              <select value={meetingDay} onChange={e => setMeetingDay(e.target.value)} className="select-field">
                <option value="">— None —</option>
                {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Meeting Time</label>
              <input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Facilitator</label>
              <select value={facilitatorUserId} onChange={e => setFacilitatorUserId(e.target.value)} className="select-field">
                <option value="">— None —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="label">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="select-field">
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Cohort'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Enroll / edit enrollment modal ──────────────────────────────
function EnrollmentModal({ trackId, enrollment, users, cohorts, onClose, onSaved }: {
  trackId: string; enrollment?: Enrollment; users: any[]; cohorts: Cohort[];
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!enrollment;
  const [participantType, setParticipantType] = useState<'GUEST' | 'MEMBER'>('GUEST');
  const [guestSearch, setGuestSearch] = useState('');
  const [guestResults, setGuestResults] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [disciplerUserId, setDisciplerUserId] = useState(enrollment?.discipler?.id || '');
  const [cohortId, setCohortId] = useState(enrollment?.cohort?.id || '');
  const [status, setStatus] = useState(enrollment?.status || 'ACTIVE');
  const [notes, setNotes] = useState(enrollment?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit || participantType !== 'GUEST') return;
    const t = setTimeout(async () => {
      const q = guestSearch.trim();
      const res = await fetch(`/api/guests?limit=15${q ? `&search=${encodeURIComponent(q)}` : ''}`);
      if (res.ok) { const d = await res.json(); setGuestResults(d.guests || []); }
    }, 250);
    return () => clearTimeout(t);
  }, [guestSearch, participantType, isEdit]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (isEdit) {
        const res = await fetch(`/api/tracks/${trackId}/enrollments/${enrollment!.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disciplerUserId, cohortId, status, notes }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const guestId = participantType === 'GUEST' ? selectedGuest?.id : undefined;
        const userId = participantType === 'MEMBER' ? selectedUserId : undefined;
        if (!guestId && !userId) { setError('Choose a participant first'); setSaving(false); return; }
        const res = await fetch(`/api/tracks/${trackId}/enrollments`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId, userId, disciplerUserId: disciplerUserId || undefined, cohortId: cohortId || undefined, notes }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      onSaved();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-church-900">
            {isEdit ? `✏️ ${participantName(enrollment!)}` : '🙋 Enroll Participant'}
          </h2>
          <button onClick={onClose} className="text-church-400 hover:text-church-600 p-1">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {!isEdit && (
            <>
              <div className="flex gap-2">
                <button type="button" onClick={() => setParticipantType('GUEST')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${participantType === 'GUEST' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-church-600 border-church-200 hover:border-brand-300'}`}>
                  Guest
                </button>
                <button type="button" onClick={() => setParticipantType('MEMBER')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${participantType === 'MEMBER' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-church-600 border-church-200 hover:border-brand-300'}`}>
                  Member (User)
                </button>
              </div>

              {participantType === 'GUEST' ? (
                <div>
                  <label className="label">Find Guest</label>
                  {selectedGuest ? (
                    <div className="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-lg px-4 py-2.5">
                      <span className="text-sm font-medium text-church-900">
                        {selectedGuest.firstName} {selectedGuest.lastName}
                      </span>
                      <button onClick={() => setSelectedGuest(null)} className="text-xs text-church-400 hover:text-church-600">Change</button>
                    </div>
                  ) : (
                    <>
                      <input type="text" value={guestSearch} onChange={e => setGuestSearch(e.target.value)}
                        placeholder="Search guests by name…" className="input-field mb-2" />
                      <div className="border border-church-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        {guestResults.length === 0 ? (
                          <p className="text-sm text-church-400 text-center py-4">No guests found</p>
                        ) : guestResults.map(g => (
                          <button key={g.id} type="button" onClick={() => setSelectedGuest(g)}
                            className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50 border-b border-church-50 last:border-0">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-brand-600 bg-brand-100 flex-shrink-0">
                              {g.firstName?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-church-900 truncate">{g.firstName} {g.lastName}</p>
                              <p className="text-xs text-church-400 truncate">{g.email || g.phone || ''} · {g.status}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="label">Member</label>
                  <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="select-field">
                    <option value="">— Choose a member —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Discipler</label>
              <select value={disciplerUserId} onChange={e => setDisciplerUserId(e.target.value)} className="select-field">
                <option value="">— None yet —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cohort</label>
              <select value={cohortId} onChange={e => setCohortId(e.target.value)} className="select-field">
                <option value="">— None —</option>
                {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="label">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="select-field">
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
          )}

          <div>
            <label className="label">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="textarea-field" placeholder="Anything the discipler should know" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Enroll'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────
export default function TrackDetailPage() {
  const params = useParams();
  const trackId = params.id as string;

  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [customRolesJson, setCustomRolesJson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'participants' | 'modules' | 'cohorts'>('participants');

  const [showEnroll, setShowEnroll] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [showAddCohort, setShowAddCohort] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);

  const fetchTrack = useCallback(async () => {
    const res = await fetch(`/api/tracks/${trackId}`);
    if (res.ok) { const d = await res.json(); setTrack(d.track); }
    setLoading(false);
  }, [trackId]);

  useEffect(() => {
    fetchTrack();
    fetch('/api/users').then(r => r.ok ? r.json() : { users: [] })
      .then(d => setUsers((d.users || []).filter((u: any) => u.active)));
    fetch('/api/auth/me').then(r => r.json()).then(d => setCurrentUser(d.user)).catch(() => {});
    fetch('/api/roles').then(r => r.ok ? r.json() : {}).then((d: any) => {
      if (d.customRolesJson) setCustomRolesJson(d.customRolesJson);
    }).catch(() => {});
  }, [fetchTrack]);

  const permLevel = currentUser ? getPermissionLevel(currentUser.role, customRolesJson) : null;
  const isAdmin = permLevel === 'ADMIN_ACCESS';
  const canManageProgress = isAdmin || permLevel === 'LEADER_ACCESS';

  const toggleProgress = async (enrollment: Enrollment, moduleId: string) => {
    if (!canManageProgress || !track) return;
    const done = enrollment.progress.some(p => p.moduleId === moduleId);
    const res = await fetch(`/api/tracks/${trackId}/enrollments/${enrollment.id}/progress`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId, completed: !done }),
    });
    if (res.ok) {
      const d = await res.json();
      setTrack(prev => prev ? {
        ...prev,
        enrollments: prev.enrollments.map(e => e.id === enrollment.id ? { ...e, progress: d.progress } : e),
      } : prev);
    }
  };

  const markCompleted = async (enrollment: Enrollment) => {
    if (!confirm(`Mark ${participantName(enrollment)} as having completed this track?`)) return;
    const res = await fetch(`/api/tracks/${trackId}/enrollments/${enrollment.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    if (res.ok) fetchTrack();
  };

  const deleteEnrollment = async (enrollment: Enrollment) => {
    if (!confirm(`Remove ${participantName(enrollment)} from this track entirely? Progress will be lost.`)) return;
    const res = await fetch(`/api/tracks/${trackId}/enrollments/${enrollment.id}`, { method: 'DELETE' });
    if (!res.ok) { alert((await res.json()).error || 'Failed to remove'); return; }
    fetchTrack();
  };

  const copyPortalLink = async (e: Enrollment) => {
    const link = `${window.location.origin}/track/${e.portalToken}`;
    try {
      await navigator.clipboard.writeText(link);
      alert(`Portal link copied for ${participantName(e)}:\n${link}`);
    } catch {
      prompt('Copy this portal link:', link);
    }
  };

  const sendPortalLink = async (e: Enrollment) => {
    if (!confirm(`Send ${participantName(e)} their personal journey link via email/WhatsApp?`)) return;
    const res = await fetch(`/api/tracks/${trackId}/enrollments/${e.id}/send-link`, { method: 'POST' });
    const d = await res.json();
    if (!res.ok) { alert(d.error || 'Failed to send'); return; }
    const summary = (d.results || []).map((r: any) => `${r.channel}: ${r.ok ? 'sent ✓' : `failed (${r.error})`}`).join('\n');
    alert(`Portal link send results:\n${summary}`);
  };

  const deleteModule = async (mod: Module) => {
    if (!confirm(`Delete Week ${mod.weekNumber}: "${mod.title}"? Progress marks for this week will be lost.`)) return;
    await fetch(`/api/tracks/${trackId}/modules/${mod.id}`, { method: 'DELETE' });
    fetchTrack();
  };

  const deleteCohort = async (cohort: Cohort) => {
    if (!confirm(`Delete cohort "${cohort.name}"? Participants stay enrolled, just without a cohort.`)) return;
    await fetch(`/api/tracks/${trackId}/cohorts/${cohort.id}`, { method: 'DELETE' });
    fetchTrack();
  };

  if (loading) return <div className="fade-in text-center py-12 text-church-400">Loading track…</div>;
  if (!track) return (
    <div className="fade-in text-center py-12">
      <p className="text-church-500 mb-4">Track not found.</p>
      <Link href="/dashboard/tracks" className="btn-secondary">← Back to Tracks</Link>
    </div>
  );

  const sortedEnrollments = [...track.enrollments].sort((a, b) => {
    const order: Record<string, number> = { ACTIVE: 0, PAUSED: 1, COMPLETED: 2, WITHDRAWN: 3 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return (
    <>
      <div className="fade-in max-w-6xl">
        <div className="mb-6">
          <Link href="/dashboard/tracks" className="text-sm text-church-400 hover:text-brand-500 transition-colors">← All Tracks</Link>
          <div className="flex items-center justify-between mt-1">
            <div>
              <h1 className="page-header">{track.name}</h1>
              {track.description && <p className="text-church-500 text-sm mt-1">{track.description}</p>}
            </div>
            <div className="flex gap-2">
              {track.workbookUrl && (
                <a href={track.workbookUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">📕 Workbook</a>
              )}
              {canManageProgress && (
                <button onClick={() => setShowEnroll(true)} className="btn-primary">+ Enroll Participant</button>
              )}
            </div>
          </div>
          {track.milestoneLabel && (
            <div className="mt-3 text-sm text-brand-600 bg-brand-50 border border-brand-100 rounded-lg px-4 py-2.5 inline-block">
              🏁 Completion milestone: <span className="font-semibold">{track.milestoneLabel}</span>
            </div>
          )}
        </div>

        <div className="flex gap-1 border-b border-church-200 mb-6">
          {([
            ['participants', `🙋 Participants (${track.enrollments.length})`],
            ['modules', `📚 Modules (${track.modules.length})`],
            ['cohorts', `🧑‍🤝‍🧑 Cohorts (${track.cohorts.length})`],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${tab === key ? 'bg-white border border-b-0 border-church-200 text-brand-600' : 'text-church-500 hover:text-church-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Participants tab ── */}
        {tab === 'participants' && (
          sortedEnrollments.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-3">🙋</div>
              <p className="font-semibold text-church-700 mb-1">No participants yet</p>
              <p className="text-sm text-church-400 mb-4">Enroll a guest or member to begin their journey.</p>
              {canManageProgress && (
                <button onClick={() => setShowEnroll(true)} className="btn-primary">+ Enroll First Participant</button>
              )}
            </div>
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-church-100 text-left text-xs text-church-400 uppercase">
                    <th className="px-4 py-3 min-w-[180px]">Participant</th>
                    <th className="px-2 py-3 min-w-[120px]">Discipler</th>
                    <th className="px-2 py-3 min-w-[100px]">Cohort</th>
                    <th className="px-2 py-3">Status</th>
                    {track.modules.map(m => (
                      <th key={m.id} className="px-1 py-3 text-center" title={`Week ${m.weekNumber}: ${m.title}`}>
                        W{m.weekNumber}
                      </th>
                    ))}
                    <th className="px-2 py-3 min-w-[90px]">Progress</th>
                    <th className="px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEnrollments.map(e => {
                    const doneCount = e.progress.length;
                    const total = track.modules.length;
                    const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
                    const allDone = total > 0 && doneCount >= total;
                    return (
                      <tr key={e.id} className="border-b border-church-50 hover:bg-warm-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${e.guest ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-600'}`}>
                              {participantName(e)[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-church-900 truncate">{participantName(e)}</p>
                              <p className="text-xs text-church-400">{e.guest ? 'Guest' : 'Member'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-church-600">{e.discipler?.name || <span className="text-church-300">—</span>}</td>
                        <td className="px-2 py-3 text-church-600">{e.cohort?.name || <span className="text-church-300">—</span>}</td>
                        <td className="px-2 py-3">
                          <span className={`badge ${STATUS_STYLES[e.status] || 'bg-gray-100 text-gray-500'}`}>{e.status}</span>
                        </td>
                        {track.modules.map(m => {
                          const done = e.progress.some(p => p.moduleId === m.id);
                          return (
                            <td key={m.id} className="px-1 py-3 text-center">
                              <button onClick={() => toggleProgress(e, m.id)}
                                disabled={!canManageProgress}
                                title={`Week ${m.weekNumber}: ${m.title}`}
                                className={`w-6 h-6 rounded-md text-xs transition-colors ${done ? 'bg-green-500 text-white' : 'bg-church-100 text-church-300 hover:bg-church-200'} ${!canManageProgress ? 'cursor-default' : ''}`}>
                                {done ? '✓' : ''}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-church-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-church-500">{pct}%</span>
                          </div>
                          {allDone && e.status === 'ACTIVE' && canManageProgress && (
                            <button onClick={() => markCompleted(e)}
                              className="mt-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                              🏁 Mark Completed
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex gap-1">
                            {canManageProgress && (
                              <button onClick={() => copyPortalLink(e)} title="Copy portal link"
                                className="p-1.5 text-church-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors text-sm">🔗</button>
                            )}
                            {canManageProgress && (
                              <button onClick={() => sendPortalLink(e)} title="Send portal link via email/WhatsApp"
                                className="p-1.5 text-church-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors text-sm">📤</button>
                            )}
                            {canManageProgress && (
                              <button onClick={() => setEditingEnrollment(e)}
                                className="p-1.5 text-church-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors text-sm">✏️</button>
                            )}
                            {isAdmin && (
                              <button onClick={() => deleteEnrollment(e)}
                                className="p-1.5 text-church-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm">🗑️</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Modules tab ── */}
        {tab === 'modules' && (
          <div className="space-y-3">
            {isAdmin && (
              <div className="flex justify-end">
                <button onClick={() => setShowAddModule(true)} className="btn-primary btn-sm">+ Add Module</button>
              </div>
            )}
            {track.modules.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-3">📚</div>
                <p className="font-semibold text-church-700 mb-1">No modules yet</p>
                <p className="text-sm text-church-400">Add the weekly modules for this track, or run the Run 9 seed SQL.</p>
              </div>
            ) : track.modules.map(m => (
              <div key={m.id} className="card flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center font-bold flex-shrink-0">
                  {m.weekNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-church-900">{m.title}</h3>
                  {m.summary && <p className="text-sm text-church-500 mt-0.5">{m.summary}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditingModule(m)}
                      className="p-1.5 text-church-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors text-sm">✏️</button>
                    <button onClick={() => deleteModule(m)}
                      className="p-1.5 text-church-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm">🗑️</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Cohorts tab ── */}
        {tab === 'cohorts' && (
          <div className="space-y-3">
            {isAdmin && (
              <div className="flex justify-end">
                <button onClick={() => setShowAddCohort(true)} className="btn-primary btn-sm">+ New Cohort</button>
              </div>
            )}
            {track.cohorts.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-3">🧑‍🤝‍🧑</div>
                <p className="font-semibold text-church-700 mb-1">No cohorts yet</p>
                <p className="text-sm text-church-400">Cohorts are small groups walking the track together — e.g. a weekly evening discussion group of 4 or 5 people.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {track.cohorts.map(c => (
                  <div key={c.id} className="card">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-church-900">{c.name}</h3>
                      <div className="flex items-center gap-1">
                        <span className={`badge ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                        {isAdmin && (
                          <>
                            <button onClick={() => setEditingCohort(c)}
                              className="p-1.5 text-church-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors text-sm">✏️</button>
                            <button onClick={() => deleteCohort(c)}
                              className="p-1.5 text-church-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm">🗑️</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-church-500 space-y-1">
                      {c.meetingDay && <p>📅 {c.meetingDay}{c.meetingTime ? ` at ${c.meetingTime}` : ''}</p>}
                      {c.startDate && <p>🚀 Started {new Date(c.startDate).toLocaleDateString()}</p>}
                      {c.facilitator && <p>🧭 Facilitator: {c.facilitator.name}</p>}
                      <p>👥 {c._count.enrollments} participant{c._count.enrollments !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals — rendered OUTSIDE the fade-in div (stacking context rule) */}
      {showEnroll && (
        <EnrollmentModal trackId={trackId} users={users} cohorts={track.cohorts}
          onClose={() => setShowEnroll(false)}
          onSaved={() => { setShowEnroll(false); fetchTrack(); }} />
      )}
      {editingEnrollment && (
        <EnrollmentModal trackId={trackId} enrollment={editingEnrollment} users={users} cohorts={track.cohorts}
          onClose={() => setEditingEnrollment(null)}
          onSaved={() => { setEditingEnrollment(null); fetchTrack(); }} />
      )}
      {showAddModule && (
        <ModuleModal trackId={trackId}
          nextWeek={(track.modules[track.modules.length - 1]?.weekNumber || 0) + 1}
          onClose={() => setShowAddModule(false)}
          onSaved={() => { setShowAddModule(false); fetchTrack(); }} />
      )}
      {editingModule && (
        <ModuleModal trackId={trackId} module={editingModule} nextWeek={editingModule.weekNumber}
          onClose={() => setEditingModule(null)}
          onSaved={() => { setEditingModule(null); fetchTrack(); }} />
      )}
      {showAddCohort && (
        <CohortModal trackId={trackId} users={users}
          onClose={() => setShowAddCohort(false)}
          onSaved={() => { setShowAddCohort(false); fetchTrack(); }} />
      )}
      {editingCohort && (
        <CohortModal trackId={trackId} cohort={editingCohort} users={users}
          onClose={() => setEditingCohort(null)}
          onSaved={() => { setEditingCohort(null); fetchTrack(); }} />
      )}
    </>
  );
}
