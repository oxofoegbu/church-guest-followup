'use client';

// Run 13 — admin review of self-enrollment requests.
// Run 19 — also receives Welcome Track requests from the public /begin page:
// those enrollees become GUESTS (no Harvest account); an optional discipler
// can be assigned right on the Approve action (the discipler is emailed),
// and the person's "which best describes you" + share/prayer note are shown.
// Approve enrolls the person; reject sends a brief courteous email.
// Decisions are admin-level only.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type EnrollmentRequest = {
  id: string;
  firstName: string; lastName: string; email: string; phone: string | null;
  status: string; createdAt: string; decidedAt: string | null;
  audience: string | null; shareNote: string | null;
  track: { id: string; name: string; slug: string };
  cohort: { id: string; name: string; meetingDay: string | null; meetingTime: string | null } | null;
  matchedUser: { id: string; name: string } | null;
  decidedBy: { id: string; name: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-gray-100 text-gray-500',
};

const AUDIENCE_LABELS: Record<string, string> = {
  FIRST_TIME: "This is my first time / I'm new here",
  RETURNING: "I'm coming back after a while",
  MEMBER: "I'm a member wanting to re-anchor",
  EXPLORING: "I'm just exploring \u2014 not sure yet",
  // Run 24 -- /become page audiences
  WELCOME_GRAD: "I've completed the Welcome Track",
  GLC_MEMBER: "I'm a Grace Life Center member / regular",
  OTHER_CHURCH: "I'm part of another church family",
  NEW_TO_FAITH: "I'm fairly new to all of this",
};

const WELCOME_SLUG = 'welcome-track';

export default function EnrollmentRequestsPage() {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  // Run 19 — per-request discipler choice for the Approve action
  const [disciplers, setDisciplers] = useState<Record<string, string>>({});

  const fetchRequests = useCallback(async () => {
    const res = await fetch('/api/enrollment-requests?status=ALL');
    if (res.ok) { const d = await res.json(); setRequests(d.requests || []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
    fetch('/api/users').then(r => r.ok ? r.json() : { users: [] })
      .then(d => setUsers((d.users || []).filter((u: any) => u.active).map((u: any) => ({ id: u.id, name: u.name }))))
      .catch(() => {});
  }, [fetchRequests]);

  const decide = async (req: EnrollmentRequest, action: 'approve' | 'reject') => {
    if (busy) return;
    if (action === 'reject' && !confirm(`Reject ${req.firstName} ${req.lastName}\u2019s request for ${req.track.name}? They will receive a brief email.`)) return;
    setBusy(req.id);
    setNotice('');
    const disciplerUserId = disciplers[req.id] || undefined;
    const res = await fetch(`/api/enrollment-requests/${req.id}/decide`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(action === 'approve' && disciplerUserId ? { disciplerUserId } : {}) }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      if (action === 'approve') {
        const name = `${req.firstName} ${req.lastName}`.trim();
        const disciplerNote = d.disciplerAssigned ? ' Their discipler has been notified by email.' : '';
        if (d.createdAccount) {
          setNotice(`${name} enrolled \u2014 a new Harvest account was created and their credentials were emailed to them.${disciplerNote}`);
        } else if (d.createdGuest) {
          setNotice(`${name} enrolled as a guest \u2014 their journey page link was emailed to them.${disciplerNote}`);
        } else {
          setNotice(`${name} enrolled \u2014 notification sent.${disciplerNote}${d.note ? ` (${d.note})` : ''}`);
        }
      } else {
        setNotice(`Request from ${req.firstName} ${req.lastName} was rejected.`);
      }
      fetchRequests();
    } else {
      alert(d.error || 'Action failed');
    }
    setBusy(null);
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const visible = tab === 'PENDING' ? requests.filter(r => r.status === 'PENDING') : requests;

  return (
    <div className="fade-in max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/tracks" className="text-sm text-brand-600 hover:underline">← Back to Tracks</Link>
        <h1 className="page-header mt-2">📥 Enrollment Requests</h1>
        <p className="text-church-500 text-sm mt-1">
          People asking to join a track from the public pages — Become &amp; Leaders from <span className="font-mono">/enroll</span>,
          the Welcome Track from <span className="font-mono">/begin</span>. Approving enrolls them (Welcome Track
          sign-ups become guests; the others get a Harvest account if they do not have one). You can assign a
          discipler as you approve — they will be notified by email.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('PENDING')}
          className={`btn-sm rounded-lg px-4 py-1.5 text-sm font-medium ${tab === 'PENDING' ? 'bg-church-900 text-white' : 'bg-white border border-church-200 text-church-600'}`}>
          Pending{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </button>
        <button onClick={() => setTab('ALL')}
          className={`btn-sm rounded-lg px-4 py-1.5 text-sm font-medium ${tab === 'ALL' ? 'bg-church-900 text-white' : 'bg-white border border-church-200 text-church-600'}`}>
          All
        </button>
      </div>

      {notice && (
        <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          ✅ {notice}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-church-400">Loading requests…</div>
      ) : visible.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold text-church-700 mb-1">
            {tab === 'PENDING' ? 'No pending requests' : 'No requests yet'}
          </p>
          <p className="text-sm text-church-400">
            Share the public links with people you want to invite: <span className="font-mono">/begin</span> (Welcome Track)
            {' '}· <span className="font-mono">/enroll</span> (Become &amp; Leaders)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(r => {
            const isWelcome = r.track.slug === WELCOME_SLUG;
            return (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-church-900">{r.firstName} {r.lastName}</p>
                    <span className={`badge ${STATUS_STYLES[r.status] || ''}`}>{r.status}</span>
                    {r.status === 'PENDING' && (
                      r.matchedUser ? (
                        <span className="badge bg-brand-100 text-brand-700">Existing user: {r.matchedUser.name}</span>
                      ) : isWelcome ? (
                        <span className="badge bg-amber-100 text-amber-700">Will be added as a guest</span>
                      ) : (
                        <span className="badge bg-blue-100 text-blue-700">New account will be created</span>
                      )
                    )}
                  </div>
                  <p className="text-sm text-church-600 mt-1">
                    {r.email}{r.phone ? ` · ${r.phone}` : ''}
                  </p>
                  <p className="text-sm text-church-700 mt-1.5">
                    <span className="font-semibold">{r.track.name}</span>
                    {r.cohort && (
                      <span className="text-church-500">
                        {' '}· {r.cohort.name}
                        {r.cohort.meetingDay ? ` (${r.cohort.meetingDay}s${r.cohort.meetingTime ? ` at ${r.cohort.meetingTime}` : ''})` : ''}
                      </span>
                    )}
                  </p>
                  {r.audience && AUDIENCE_LABELS[r.audience] && (
                    <p className="text-sm text-church-600 mt-1.5">
                      <span className="text-church-400">Describes themselves as:</span> {AUDIENCE_LABELS[r.audience]}
                    </p>
                  )}
                  {r.shareNote && (
                    <div className="mt-2 text-sm text-church-700 bg-amber-50 border-l-2 border-amber-300 rounded-r px-3 py-2">
                      <span className="text-church-400">💬 They shared:</span> {r.shareNote}
                    </div>
                  )}
                  <p className="text-xs text-church-400 mt-1.5">
                    Requested {new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {r.decidedAt && r.decidedBy ? ` · Decided by ${r.decidedBy.name}` : ''}
                  </p>
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-56">
                    <select
                      value={disciplers[r.id] || ''}
                      onChange={e => setDisciplers(prev => ({ ...prev, [r.id]: e.target.value }))}
                      className="select-field text-sm"
                      aria-label={`Discipler for ${r.firstName} ${r.lastName}`}
                    >
                      <option value="">Assign a discipler (optional)</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => decide(r, 'approve')} disabled={busy === r.id}
                        className="btn-primary btn-sm flex-1">
                        {busy === r.id ? '…' : '✓ Approve'}
                      </button>
                      <button onClick={() => decide(r, 'reject')} disabled={busy === r.id}
                        className="btn-secondary btn-sm flex-1">
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}
