'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  STATUS_LABELS, STATUS_COLORS, ACTIVITY_LABELS, ACTIVITY_ICONS,
  PREFERRED_CONTACT_LABELS, VOLUNTEER_ALLOWED_STATUSES,
  formatDate, formatDateTime,
} from '@/lib/utils';

export default function GuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const guestId = params.id as string;

  const [guest, setGuest] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const fetchGuest = useCallback(async () => {
    const res = await fetch(`/api/guests/${guestId}`);
    if (res.ok) {
      const data = await res.json();
      setGuest(data.guest);
    }
  }, [guestId]);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetchGuest(),
      fetch('/api/users').then(r => r.ok ? r.json() : { users: [] }),
    ]).then(([me, _, usersData]) => {
      setUser(me.user);
      setVolunteers((usersData.users || []).filter((u: any) => u.role === 'VOLUNTEER' && u.active));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [fetchGuest]);

  const isAdmin = user?.role === 'ADMIN';
  const isLeader = user?.role === 'LEADER';

  const updateGuest = async (updates: any) => {
    const res = await fetch(`/api/guests/${guestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) fetchGuest();
  };

  const handleResendNotification = async () => {
    await fetch('/api/notifications/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId }),
    });
    fetchGuest();
    alert('Notifications resent!');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-church-400">Loading...</div>;
  }
  if (!guest) {
    return <div className="card text-center py-12"><p className="text-church-500">Guest not found</p></div>;
  }

  const allowedStatuses = isAdmin
    ? Object.keys(STATUS_LABELS)
    : VOLUNTEER_ALLOWED_STATUSES;

  return (
    <div className="space-y-6 fade-in max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <button onClick={() => router.back()} className="text-sm text-church-500 hover:text-church-700 mb-1">
            ← Back
          </button>
          <h1 className="page-header">{guest.firstName} {guest.lastName}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge text-sm ${STATUS_COLORS[guest.status]}`}>
            {STATUS_LABELS[guest.status]}
          </span>
          <span className={`badge text-sm ${guest.serviceReturnCount >= 7 ? 'bg-emerald-100 text-emerald-700' : 'bg-church-100 text-church-600'}`}>
            Returns: {guest.serviceReturnCount}/7
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Guest Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="card">
            <h2 className="section-header mb-4">Guest Information</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <InfoRow label="Phone" value={guest.phone} />
              <InfoRow label="Email" value={guest.email} />
              <InfoRow label="Address" value={guest.address} />
              <InfoRow label="Preferred Contact" value={PREFERRED_CONTACT_LABELS[guest.preferredContactMethod]} />
              <InfoRow label="First Visit" value={formatDate(guest.firstVisitDate)} />
              <InfoRow label="Service Attended" value={guest.serviceAttended} />
              <InfoRow label="How They Heard" value={guest.howHeardAboutUs} />
              {guest.prayerRequest && (
                <div className="sm:col-span-2">
                  <span className="text-church-500">Prayer Request:</span>
                  <p className="mt-1 p-3 bg-warm-100 rounded-lg text-church-700 italic">
                    "{guest.prayerRequest}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Status & Assignment */}
          <div className="card">
            <h2 className="section-header mb-4">Status & Assignment</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Status</label>
                <select
                  value={guest.status}
                  onChange={e => updateGuest({ status: e.target.value })}
                  disabled={isLeader}
                  className="select-field"
                >
                  {allowedStatuses.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                  ))}
                </select>
              </div>
              {isAdmin && (
                <div>
                  <label className="label">Assigned Volunteer</label>
                  <select
                    value={guest.assignedVolunteerId || ''}
                    onChange={e => updateGuest({ assignedVolunteerId: e.target.value || null })}
                    className="select-field"
                  >
                    <option value="">Unassigned</option>
                    {volunteers.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  {guest.assignedAt && (
                    <p className="text-xs text-church-400 mt-1">
                      Assigned {formatDate(guest.assignedAt)}
                    </p>
                  )}
                </div>
              )}
              {!isAdmin && guest.assignedVolunteer && (
                <InfoRow label="Assigned To" value={guest.assignedVolunteer.name} />
              )}
            </div>

            {isAdmin && guest.assignedVolunteerId && (
              <button onClick={handleResendNotification}
                className="btn-secondary btn-sm mt-4">
                🔔 Resend Notification
              </button>
            )}
          </div>

          {/* Become Signup */}
          <div className="card">
            <h2 className="section-header mb-4">Become Enrollment</h2>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={guest.becomeSignup}
                  onChange={e => updateGuest({
                    becomeSignup: e.target.checked,
                    becomeSignupDate: e.target.checked ? new Date().toISOString() : null,
                    status: e.target.checked ? 'BECOME_SIGNED_UP' : guest.status,
                  })}
                  disabled={isLeader}
                  className="w-5 h-5 rounded border-church-300 text-emerald-600" />
                <span className="font-medium">Signed up for Become</span>
              </label>
            </div>
            {guest.becomeSignup && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Signup Date</label>
                  <input type="date" value={guest.becomeSignupDate?.split('T')[0] || ''}
                    onChange={e => updateGuest({ becomeSignupDate: e.target.value })}
                    disabled={isLeader} className="input-field" />
                </div>
                <div>
                  <label className="label">Cohort</label>
                  <input type="text" value={guest.becomeCohort || ''}
                    onChange={e => updateGuest({ becomeCohort: e.target.value })}
                    disabled={isLeader} className="input-field" placeholder="e.g. Cohort 2025-Q1" />
                </div>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-header">Follow-Up Activities ({guest.activities?.length || 0})</h2>
              {!isLeader && guest.status !== 'NOT_INTERESTED' && (
                <button onClick={() => setShowActivity(true)} className="btn-accent btn-sm">
                  + Log Activity
                </button>
              )}
              {isLeader && (
                <button onClick={() => setShowActivity(true)} className="btn-accent btn-sm">
                  + Pastoral Meeting
                </button>
              )}
            </div>
            <div className="space-y-3">
              {(guest.activities || []).length === 0 ? (
                <p className="text-sm text-church-400 italic py-4">No activities logged yet.</p>
              ) : guest.activities.map((act: any, i: number) => (
                <div key={act.id} className="flex gap-3 slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-church-100 flex items-center justify-center text-sm shrink-0">
                      {ACTIVITY_ICONS[act.activityType] || '📝'}
                    </div>
                    {i < guest.activities.length - 1 && (
                      <div className="w-px flex-1 bg-church-100 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{ACTIVITY_LABELS[act.activityType]}</span>
                      {act.outcome && <span className="badge bg-church-100 text-church-600">{act.outcome}</span>}
                    </div>
                    <p className="text-xs text-church-500 mt-0.5">
                      {formatDateTime(act.activityDateTime)} · {act.performedBy?.name}
                    </p>
                    {act.notes && <p className="text-sm text-church-700 mt-1">{act.notes}</p>}
                    {act.nextFollowUpDate && (
                      <p className={`text-xs mt-1 ${new Date(act.nextFollowUpDate) < new Date() ? 'text-red-600 font-medium' : 'text-church-500'}`}>
                        Next follow-up: {formatDate(act.nextFollowUpDate)}
                        {new Date(act.nextFollowUpDate) < new Date() && ' ⚠️ OVERDUE'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Service Returns + Notifications */}
        <div className="space-y-6">
          {/* Service Return Tracker */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-header">Service Returns</h2>
              <span className={`text-lg font-bold ${guest.serviceReturnCount >= 7 ? 'text-emerald-600' : 'text-church-700'}`}>
                {guest.serviceReturnCount}/7
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-church-100 rounded-full h-3 mb-4">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${guest.serviceReturnCount >= 7 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                style={{ width: `${(guest.serviceReturnCount / 7) * 100}%` }}
              />
            </div>

            {/* Return List */}
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, i) => {
                const ret = (guest.serviceReturns || []).find((r: any) => r.returnNumber === i + 1);
                return (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg text-sm
                    ${ret ? 'bg-sage-50' : 'bg-church-50'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${ret ? 'bg-sage-500 text-white' : 'bg-church-200 text-church-500'}`}>
                      {ret ? '✓' : i + 1}
                    </div>
                    <div className="flex-1">
                      {ret ? (
                        <>
                          <span className="font-medium">{formatDate(ret.serviceDate)}</span>
                          {ret.serviceName && (
                            <span className="text-church-500 ml-1">· {ret.serviceName}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-church-400">Return #{i + 1}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Record Return Button */}
            {!isLeader && guest.serviceReturnCount < 7 && (
              <button onClick={() => setShowReturn(true)}
                className="btn-primary w-full mt-4 btn-sm">
                + Record Return #{guest.serviceReturnCount + 1}
              </button>
            )}

            {guest.serviceReturnCount >= 7 && (
              <div className="text-center mt-4 p-3 bg-emerald-50 rounded-lg">
                <span className="text-emerald-700 font-medium">🎉 Target Reached!</span>
              </div>
            )}
          </div>

          {/* Notification Log */}
          {(isAdmin || isLeader) && guest.notifications?.length > 0 && (
            <div className="card">
              <h2 className="section-header mb-3">Notification Log</h2>
              <div className="space-y-2">
                {guest.notifications.map((notif: any) => (
                  <div key={notif.id} className="flex items-center gap-2 text-sm p-2 rounded bg-church-50">
                    <span>{notif.channel === 'EMAIL' ? '✉️' : '💬'}</span>
                    <span className={`badge ${notif.status === 'SENT' ? 'bg-green-100 text-green-700' : notif.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {notif.status}
                    </span>
                    <span className="text-church-500 text-xs">{formatDateTime(notif.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      {showActivity && (
        <ActivityModal
          guestId={guestId}
          isLeader={isLeader}
          onClose={() => { setShowActivity(false); fetchGuest(); }}
        />
      )}

      {/* Record Return Modal */}
      {showReturn && (
        <ReturnModal
          guestId={guestId}
          nextNumber={guest.serviceReturnCount + 1}
          onClose={() => { setShowReturn(false); fetchGuest(); }}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-church-500">{label}:</span>
      <span className="ml-2 font-medium">{value || '—'}</span>
    </div>
  );
}

function ActivityModal({ guestId, isLeader, onClose }: { guestId: string; isLeader: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    activityType: isLeader ? 'PASTORAL_MEETING' : 'PHONE_CALL',
    activityDateTime: new Date().toISOString().slice(0, 16),
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

  const activityTypes = isLeader
    ? [['PASTORAL_MEETING', 'Pastoral Meeting']]
    : Object.entries(ACTIVITY_LABELS);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="section-header mb-4">Log Follow-Up Activity</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Activity Type</label>
            <select value={form.activityType}
              onChange={e => setForm({ ...form, activityType: e.target.value })}
              className="select-field">
              {activityTypes.map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date/Time</label>
            <input type="datetime-local" value={form.activityDateTime}
              onChange={e => setForm({ ...form, activityDateTime: e.target.value })}
              className="input-field" />
          </div>
          <div>
            <label className="label">Outcome</label>
            <input type="text" value={form.outcome}
              onChange={e => setForm({ ...form, outcome: e.target.value })}
              className="input-field" placeholder="e.g. Connected, Voicemail, No Answer" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3} className="textarea-field" placeholder="Activity details..." />
          </div>
          <div>
            <label className="label">Next Follow-Up Date (optional)</label>
            <input type="date" value={form.nextFollowUpDate}
              onChange={e => setForm({ ...form, nextFollowUpDate: e.target.value })}
              className="input-field" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Save Activity'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReturnModal({ guestId, nextNumber, onClose }: { guestId: string; nextNumber: number; onClose: () => void }) {
  const [form, setForm] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    serviceName: 'Sunday 10am',
  });
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
            <input type="date" value={form.serviceDate}
              onChange={e => setForm({ ...form, serviceDate: e.target.value })}
              required className="input-field" />
          </div>
          <div>
            <label className="label">Service Name</label>
            <select value={form.serviceName}
              onChange={e => setForm({ ...form, serviceName: e.target.value })}
              className="select-field">
              <option value="Sunday 10am">Sunday 10am</option>
              <option value="Wednesday Bible Study">Wednesday Bible Study</option>
              <option value="Friday Prayer Meeting">Friday Prayer Meeting</option>
              <option value="Special Event">Special Event</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : `Record Return #${nextNumber}`}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
