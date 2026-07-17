'use client';

// Run 13 — admin review of self-enrollment requests (Become & Leaders Track).
// Approve enrolls the person (creating a Harvest account first when needed);
// reject sends a brief courteous email. Decisions are admin-level only.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type EnrollmentRequest = {
  id: string;
  firstName: string; lastName: string; email: string; phone: string | null;
  status: string; createdAt: string; decidedAt: string | null;
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

export default function EnrollmentRequestsPage() {
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const fetchRequests = useCallback(async () => {
    const res = await fetch('/api/enrollment-requests?status=ALL');
    if (res.ok) { const d = await res.json(); setRequests(d.requests || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const decide = async (req: EnrollmentRequest, action: 'approve' | 'reject') => {
    if (busy) return;
    if (action === 'reject' && !confirm(`Reject ${req.firstName} ${req.lastName}\u2019s request for ${req.track.name}? They will receive a brief email.`)) return;
    setBusy(req.id);
    setNotice('');
    const res = await fetch(`/api/enrollment-requests/${req.id}/decide`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      if (action === 'approve') {
        setNotice(d.createdAccount
          ? `${req.firstName} ${req.lastName} enrolled — a new Harvest account was created and their credentials were emailed to them.`
          : `${req.firstName} ${req.lastName} enrolled — notification sent.${d.note ? ` (${d.note})` : ''}`);
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
          People asking to join Become or Leaders Track from the public enrollment page.
          Approving enrolls them — and creates a Harvest account first if they do not have one.
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
            Share the enrollment link with people you want to invite: <span className="font-mono">/enroll</span>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(r => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-church-900">{r.firstName} {r.lastName}</p>
                    <span className={`badge ${STATUS_STYLES[r.status] || ''}`}>{r.status}</span>
                    {r.status === 'PENDING' && (
                      r.matchedUser ? (
                        <span className="badge bg-brand-100 text-brand-700">Existing user: {r.matchedUser.name}</span>
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
                  <p className="text-xs text-church-400 mt-1">
                    Requested {new Date(r.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {r.decidedAt && r.decidedBy ? ` · Decided by ${r.decidedBy.name}` : ''}
                  </p>
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => decide(r, 'approve')} disabled={busy === r.id}
                      className="btn-primary btn-sm">
                      {busy === r.id ? '…' : '✓ Approve'}
                    </button>
                    <button onClick={() => decide(r, 'reject')} disabled={busy === r.id}
                      className="btn-secondary btn-sm">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
