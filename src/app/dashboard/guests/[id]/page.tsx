'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS, ACTIVITY_LABELS, ACTIVITY_ICONS, PREFERRED_CONTACT_LABELS, BUILTIN_TARGETS, PROSPECT_STATUSES, SPIRITUAL_STATUS_LABELS, SOURCE_LABELS, formatDate, formatDateTime } from '@/lib/utils';

export default function GuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [guest, setGuest] = useState<any>(null);
  const [targetConfig, setTargetConfig] = useState<{ key: string; label: string; builtin: boolean }[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const fetchGuest = async () => {
    const res = await fetch(`/api/guests/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setGuest(data.guest);
    }
  };

  const DEFAULT_TARGETS = [
    { key: 'becomeSignup', label: 'Become Signup', builtin: true },
    { key: 'waterBaptism', label: 'Water Baptism', builtin: true },
    { key: 'volunteerInChurch', label: 'Volunteer in Church', builtin: true },
    { key: 'joinSmallGroup', label: 'Join A Small Group', builtin: true },
  ];

  useEffect(() => {
    Promise.all([
      fetchGuest(),
      fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)),
      fetch('/api/users').then(r => r.ok ? r.json() : { users: [] })
        .then(d => setUsers((d.users || []).filter((u: any) => u.active))),
      fetch('/api/settings').then(r => r.ok ? r.json() : {}).then((d: any) => {
        try {
          const parsed = JSON.parse(d.target_config || '[]');
          setTargetConfig(Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TARGETS);
        } catch { setTargetConfig(DEFAULT_TARGETS); }
      }),
    ]).then(() => setLoading(false));
  }, [params.id]);

  const updateGuest = async (data: any) => {
    await fetch(`/api/guests/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await fetchGuest();
  };

  if (loading || !guest) {
    return <div className="flex items-center justify-center h-64 text-church-400">Loading...</div>;
  }

  const isAdmin = user?.permissionLevel === 'ADMIN_ACCESS';
  const isLeader = user?.permissionLevel === 'LEADER_ACCESS';
  const canAssign = isAdmin || isLeader;
  const isVolunteer = user?.permissionLevel === 'VOLUNTEER_ACCESS';

  const guestCustomTargets: Record<string, { completed: boolean; date: string | null }> = (() => {
    try { return typeof guest.customTargets === 'string' ? JSON.parse(guest.customTargets) : (guest.customTargets || {}); }
    catch { return {}; }
  })();

  const isProspect = PROSPECT_STATUSES.includes(guest.status);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <Link href={isProspect ? "/dashboard/prospects" : "/dashboard/guests"}
            className="text-sm text-church-400 hover:text-church-600 mb-1 inline-block">
            ← Back to {isProspect ? 'Prospects' : 'Guests'}
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="page-header">{guest.firstName} {guest.lastName}</h1>
            {guest.source === 'PROSPECT' && (
              <span className="badge bg-orange-100 text-orange-700 text-[10px]">PROSPECT</span>
            )}
          </div>
          {guest.status === 'ARCHIVED' && (
            <span className="badge bg-stone-100 text-stone-600 mt-1">Archived {guest.archivedAt ? `on ${formatDate(guest.archivedAt)}` : ''}</span>
          )}
          {guest.convertedToGuestAt && (
            <span className="badge bg-emerald-50 text-emerald-700 mt-1">Converted to Guest {formatDate(guest.convertedToGuestAt)}</span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {isProspect && (
            <button onClick={() => setShowConvertModal(true)} className="btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700">
              🎉 Convert to Guest
            </button>
          )}
          {guest.status !== 'ARCHIVED' && (
            <button onClick={() => setShowActivityModal(true)} className="btn-primary btn-sm">+ Log Activity</button>
          )}
          {!isProspect && guest.status !== 'ARCHIVED' && guest.serviceReturnCount < 7 && (
            <button onClick={() => setShowReturnModal(true)} className="btn-secondary btn-sm">+ Record Return</button>
          )}
          {isAdmin && guest.status !== 'ARCHIVED' && (
            <button onClick={() => setShowArchiveModal(true)} className="btn-secondary btn-sm text-amber-600">Archive</button>
          )}
          {isAdmin && guest.status === 'ARCHIVED' && (
            <button onClick={() => updateGuest({ status: 'NEW_GUEST' })} className="btn-secondary btn-sm text-green-600">Restore</button>
          )}
          {isAdmin && (
            <button onClick={() => setShowDeleteModal(true)} className="btn-secondary btn-sm text-red-600">Delete</button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Guest Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="card">
            <h2 className="section-header mb-4">{isProspect ? 'Prospect Information' : 'Guest Information'}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-church-500">Phone:</span> <span className="font-medium">{guest.phone || '—'}</span></div>
              <div><span className="text-church-500">Email:</span> <span className="font-medium">{guest.email || '—'}</span></div>
              <div><span className="text-church-500">Preferred Contact:</span> <span className="font-medium">{PREFERRED_CONTACT_LABELS[guest.preferredContactMethod]}</span></div>
              {!isProspect && (
                <>
                  <div><span className="text-church-500">First Visit:</span> <span className="font-medium">{guest.firstVisitDate ? formatDate(guest.firstVisitDate) : '—'}</span></div>
                  <div><span className="text-church-500">Service Attended:</span> <span className="font-medium">{guest.serviceAttended || '—'}</span></div>
                  <div><span className="text-church-500">How Heard:</span> <span className="font-medium">{guest.howHeardAboutUs || '—'}</span></div>
                </>
              )}
              {guest.source === 'PROSPECT' && (
                <>
                  {guest.spiritualStatus && (
                    <div><span className="text-church-500">Spiritual Status:</span> <span className="font-medium">{SPIRITUAL_STATUS_LABELS[guest.spiritualStatus] || guest.spiritualStatus}</span></div>
                  )}
                  {guest.relationshipToAdder && (
                    <div><span className="text-church-500">Relationship:</span> <span className="font-medium">{guest.relationshipToAdder}</span></div>
                  )}
                  {guest.addedBy && (
                    <div><span className="text-church-500">Added By:</span> <span className="font-medium">{guest.addedBy.name}</span></div>
                  )}
                  <div><span className="text-church-500">Source:</span> <span className="font-medium">{SOURCE_LABELS[guest.source] || guest.source}</span></div>
                </>
              )}
              {guest.prayerRequest && (
                <div className="col-span-2"><span className="text-church-500">Prayer Request:</span> <span className="font-medium">{guest.prayerRequest}</span></div>
              )}
              {guest.prospectNotes && (
                <div className="col-span-2"><span className="text-church-500">Notes:</span> <span className="font-medium">{guest.prospectNotes}</span></div>
              )}
            </div>
          </div>

          {/* Target Goals */}
          <div className="card">
            <h2 className="section-header mb-4">🎯 Target Goals</h2>
            <div className="space-y-3">
              {targetConfig.map((target) => {
                // Built-in targets use dedicated DB columns
                const builtinFieldMap: Record<string, { field: string; dateField: string }> = {
                  becomeSignup: { field: 'becomeSignup', dateField: 'becomeSignupDate' },
                  waterBaptism: { field: 'waterBaptism', dateField: 'waterBaptismDate' },
                  volunteerInChurch: { field: 'volunteerInChurch', dateField: 'volunteerInChurchDate' },
                  joinSmallGroup: { field: 'joinSmallGroup', dateField: 'joinSmallGroupDate' },
                };
                const builtin = builtinFieldMap[target.key];
                if (builtin) {
                  return (
                    <TargetRow key={target.key} label={target.label}
                      completed={guest[builtin.field]}
                      date={guest[builtin.dateField]}
                      onToggle={(val) => updateGuest({
                        [builtin.field]: val,
                        [builtin.dateField]: val ? new Date().toISOString() : null,
                      })} />
                  );
                }
                // Custom targets use JSON field
                return (
                  <TargetRow key={target.key} label={target.label}
                    completed={guestCustomTargets[target.key]?.completed || false}
                    date={guestCustomTargets[target.key]?.date || null}
                    onToggle={(val) => {
                      const updated = { ...guestCustomTargets, [target.key]: { completed: val, date: val ? new Date().toISOString() : null } };
                      updateGuest({ customTargets: JSON.stringify(updated) });
                    }} />
                );
              })}
            </div>
            {guest.becomeCohort && (
              <div className="mt-3 pt-3 border-t border-church-100 text-sm">
                <span className="text-church-500">Become Cohort:</span> <span className="font-medium">{guest.becomeCohort}</span>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <h2 className="section-header mb-4">Activity Timeline ({guest.activities?.length || 0})</h2>
            {!guest.activities?.length ? (
              <p className="text-sm text-church-400 italic">No activities logged yet.</p>
            ) : (
              <div className="space-y-3">
                {guest.activities.map((act: any) => {
                  const overdue = act.nextFollowUpDate && new Date(act.nextFollowUpDate) < new Date();
                  return (
                    <div key={act.id} className="flex gap-3 p-3 rounded-lg bg-church-50">
                      <span className="text-xl">{ACTIVITY_ICONS[act.activityType] || '📝'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{ACTIVITY_LABELS[act.activityType]}</span>
                          <span className="text-xs text-church-400">by {act.performedBy?.name}</span>
                          <span className="text-xs text-church-400">{formatDateTime(act.activityDateTime)}</span>
                        </div>
                        {act.outcome && <p className="text-sm text-church-600">{act.outcome}</p>}
                        {act.notes && <p className="text-xs text-church-500 mt-1">{act.notes}</p>}
                        {act.nextFollowUpDate && (
                          <p className={`text-xs mt-1 ${overdue ? 'text-red-600 font-medium' : 'text-church-400'}`}>
                            Next follow-up: {formatDate(act.nextFollowUpDate)} {overdue ? '⚠️ Overdue' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Status, Assignment, Returns */}
        <div className="space-y-6">
          {/* Status */}
          <div className="card">
            <h2 className="section-header mb-3">Status</h2>
            <select value={guest.status}
              onChange={e => updateGuest({ status: e.target.value })}
              className="select-field w-full"
              disabled={guest.status === 'ARCHIVED' && !isAdmin}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Assignment */}
          <div className="card">
            <h2 className="section-header mb-3">Assigned To</h2>
            {canAssign ? (
              <select value={guest.assignedVolunteerId || ''}
                onChange={e => updateGuest({ assignedVolunteerId: e.target.value || null })}
                className="select-field w-full">
                <option value="">Unassigned</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-medium">{guest.assignedVolunteer?.name || 'Unassigned'}</p>
            )}
            {guest.assignedAt && (
              <p className="text-xs text-church-400 mt-2">Assigned: {formatDate(guest.assignedAt)}</p>
            )}
          </div>

          {/* Service Returns */}
          <div className="card">
            <h2 className="section-header mb-3">Service Returns</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-church-100 rounded-full h-3">
                <div className={`h-3 rounded-full transition-all ${guest.serviceReturnCount >= 7 ? 'bg-emerald-500' : 'bg-brand-400'}`}
                  style={{ width: `${(guest.serviceReturnCount / 7) * 100}%` }} />
              </div>
              <span className={`text-sm font-bold ${guest.serviceReturnCount >= 7 ? 'text-emerald-600' : 'text-church-700'}`}>
                {guest.serviceReturnCount}/7
              </span>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, i) => {
                const ret = guest.serviceReturns?.find((r: any) => r.returnNumber === i + 1);
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${ret ? 'bg-emerald-500 text-white' : 'bg-church-100 text-church-400'}`}>
                      {ret ? '✓' : i + 1}
                    </span>
                    <span className={ret ? 'text-church-700' : 'text-church-300'}>
                      {ret ? `${formatDate(ret.serviceDate)} — ${ret.serviceName || 'Service'}` : `Return #${i + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notification Log (admin/leader) */}
          {(isAdmin || isLeader) && guest.notifications?.length > 0 && (
            <div className="card">
              <h2 className="section-header mb-3">Notification Log</h2>
              <div className="space-y-2">
                {guest.notifications.map((n: any) => (
                  <div key={n.id} className="text-xs flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${n.status === 'SENT' ? 'bg-green-500' : n.status === 'FAILED' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <span className="text-church-600">{n.channel}</span>
                    <span className="text-church-400">{formatDate(n.createdAt)}</span>
                    <span className={n.status === 'SENT' ? 'text-green-600' : 'text-red-600'}>{n.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showActivityModal && <ActivityModal guestId={guest.id} onClose={() => { setShowActivityModal(false); fetchGuest(); }} />}
      {showReturnModal && <ReturnModal guestId={guest.id} nextNumber={guest.serviceReturnCount + 1} onClose={() => { setShowReturnModal(false); fetchGuest(); }} />}
      {showArchiveModal && <ArchiveModal guestId={guest.id} guestName={`${guest.firstName} ${guest.lastName}`} onClose={() => { setShowArchiveModal(false); fetchGuest(); }} />}
      {showDeleteModal && <DeleteModal guestId={guest.id} guestName={`${guest.firstName} ${guest.lastName}`} onClose={() => setShowDeleteModal(false)} onDeleted={() => router.push('/dashboard/guests')} />}
      {showConvertModal && <ConvertModal guestId={guest.id} guestName={`${guest.firstName} ${guest.lastName}`} onClose={() => { setShowConvertModal(false); fetchGuest(); }} />}
    </div>
  );
}

function TargetRow({ label, completed, date, onToggle, disabled }: { label: string; completed: boolean; date: string | null; onToggle: (val: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-church-50">
      <div className="flex items-center gap-3">
        <button onClick={() => !disabled && onToggle(!completed)}
          disabled={disabled}
          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors
            ${completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-church-300 hover:border-brand-400'}`}>
          {completed && '✓'}
        </button>
        <span className={`text-sm font-medium ${completed ? 'text-emerald-700' : 'text-church-700'}`}>{label}</span>
      </div>
      {date && <span className="text-xs text-church-400">{formatDate(date)}</span>}
    </div>
  );
}

function ActivityModal({ guestId, onClose }: { guestId: string; onClose: () => void }) {
  const [form, setForm] = useState({
    activityType: 'PHONE_CALL',
    outcome: '',
    notes: '',
    nextFollowUpDate: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, guestId, nextFollowUpDate: form.nextFollowUpDate || null }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h2 className="section-header mb-4">Log Activity</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Activity Type</label>
            <select value={form.activityType} onChange={e => setForm({ ...form, activityType: e.target.value })} className="select-field">
              {Object.entries(ACTIVITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Outcome</label>
            <input type="text" value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} className="input-field" placeholder="Brief outcome..." />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows={3} placeholder="Additional notes..." />
          </div>
          <div>
            <label className="label">Next Follow-Up Date</label>
            <input type="date" value={form.nextFollowUpDate} onChange={e => setForm({ ...form, nextFollowUpDate: e.target.value })} className="input-field" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Log Activity'}</button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReturnModal({ guestId, nextNumber, onClose }: { guestId: string; nextNumber: number; onClose: () => void }) {
  const [form, setForm] = useState({ serviceDate: new Date().toISOString().split('T')[0], serviceName: 'Sunday 10am' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/service-returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, guestId }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h2 className="section-header mb-4">Record Service Return #{nextNumber}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Service Date</label>
            <input type="date" value={form.serviceDate} onChange={e => setForm({ ...form, serviceDate: e.target.value })} required className="input-field" />
          </div>
          <div>
            <label className="label">Service Name</label>
            <select value={form.serviceName} onChange={e => setForm({ ...form, serviceName: e.target.value })} className="select-field">
              <option value="Sunday 10am">Sunday 10am</option>
              <option value="Wednesday Bible Study">Wednesday Bible Study</option>
              <option value="Friday Prayer Meeting">Friday Prayer Meeting</option>
              <option value="Special Event">Special Event</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : `Record Return #${nextNumber}`}</button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ArchiveModal({ guestId, guestName, onClose }: { guestId: string; guestName: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleArchive = async () => {
    setSaving(true);
    await fetch(`/api/guests/${guestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ARCHIVED', archivedReason: reason }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h2 className="section-header text-amber-700 mb-4">Archive {guestName}?</h2>
        <p className="text-sm text-church-600 mb-4">
          This guest will be hidden from active views but can be restored later. Their data will be preserved.
        </p>
        <div className="mb-4">
          <label className="label">Reason (optional)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="input-field" placeholder="e.g. Moved away, Duplicate entry..." />
        </div>
        <div className="flex gap-3">
          <button onClick={handleArchive} disabled={saving} className="btn-primary flex-1 bg-amber-500 hover:bg-amber-600">
            {saving ? 'Archiving...' : 'Archive Guest'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ guestId, guestName, onClose, onDeleted }: { guestId: string; guestName: string; onClose: () => void; onDeleted: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/guests/${guestId}`, { method: 'DELETE' });
    onDeleted();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h2 className="section-header text-red-700 mb-4">⚠️ Permanently Delete {guestName}?</h2>
        <p className="text-sm text-church-600 mb-2">
          This will permanently delete this guest and all their activities, service returns, and notification logs. This action cannot be undone.
        </p>
        <p className="text-sm text-red-600 font-medium mb-4">
          Type <strong>DELETE</strong> to confirm:
        </p>
        <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
          className="input-field mb-4" placeholder="Type DELETE" />
        <div className="flex gap-3">
          <button onClick={handleDelete} disabled={confirmText !== 'DELETE' || deleting}
            className="btn-primary flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40">
            {deleting ? 'Deleting...' : 'Permanently Delete'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ConvertModal({ guestId, guestName, onClose }: { guestId: string; guestName: string; onClose: () => void }) {
  const [form, setForm] = useState({
    firstVisitDate: new Date().toISOString().split('T')[0],
    serviceAttended: '',
  });
  const [saving, setSaving] = useState(false);

  const handleConvert = async () => {
    setSaving(true);
    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'convert',
        guestId,
        firstVisitDate: form.firstVisitDate,
        serviceAttended: form.serviceAttended,
      }),
    });
    if (res.ok) {
      onClose();
    } else {
      setSaving(false);
      alert('Failed to convert prospect');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <span className="text-4xl">🎉</span>
          <h2 className="section-header mt-2">Convert to Guest</h2>
          <p className="text-sm text-church-500 mt-1">
            <strong>{guestName}</strong> visited church! Move them into the guest follow-up pipeline.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Date of First Visit</label>
            <input type="date" value={form.firstVisitDate}
              onChange={e => setForm({ ...form, firstVisitDate: e.target.value })}
              className="input-field" />
          </div>
          <div>
            <label className="label">Service Attended</label>
            <select value={form.serviceAttended}
              onChange={e => setForm({ ...form, serviceAttended: e.target.value })}
              className="select-field">
              <option value="">Select...</option>
              <option value="Sunday 10am">Sunday 10am</option>
              <option value="Wednesday Bible Study">Wednesday Bible Study</option>
              <option value="Friday Prayer Meeting">Friday Prayer Meeting</option>
              <option value="Special Event">Special Event</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleConvert} disabled={saving} className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Converting...' : '✅ Convert to Guest'}
            </button>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
