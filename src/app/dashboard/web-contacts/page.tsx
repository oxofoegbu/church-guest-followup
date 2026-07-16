'use client';

// Run 48 — Web Contacts Admin. One inbox for every website submission
// (Newsletter, Prayer, Contact, Plan a Visit, The Gathering). Filter by type +
// status, search, and per-contact actions: mark handled / reopen / spam, assign
// to a team member, internal notes, reply by email, convert to a Guest.
// Admin-level (mirrors the enrollment queue). CSV export.
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Contact = {
  id: string; type: string; status: string;
  name: string | null; email: string | null; phone: string | null; message: string | null;
  meta: any; source: string | null;
  guestId: string | null; assignedToId: string | null; assignedToName: string | null;
  notes: string | null; handledAt: string | null; verifiedAt: string | null; createdAt: string;
};

const TYPES = [
  { key: 'ALL', label: 'All' },
  { key: 'NEWSLETTER', label: 'Newsletter' },
  { key: 'PRAYER', label: 'Prayer' },
  { key: 'CONTACT', label: 'Contact' },
  { key: 'VISIT', label: 'Plan a Visit' },
  { key: 'GATHERING', label: 'The Gathering' },
];
const TYPE_BADGE: Record<string, string> = {
  NEWSLETTER: 'bg-blue-100 text-blue-700', PRAYER: 'bg-rose-100 text-rose-700',
  CONTACT: 'bg-brand-100 text-brand-700', VISIT: 'bg-amber-100 text-amber-700',
  GATHERING: 'bg-violet-100 text-violet-700',
};
const TYPE_LABEL: Record<string, string> = {
  NEWSLETTER: 'Newsletter', PRAYER: 'Prayer request', CONTACT: 'Contact message',
  VISIT: 'Plan a Visit', GATHERING: 'The Gathering',
};
const STATUS_BADGE: Record<string, string> = {
  NEW: 'bg-green-100 text-green-700', HANDLED: 'bg-emerald-100 text-emerald-700',
  SPAM: 'bg-gray-100 text-gray-500', UNSUBSCRIBED: 'bg-gray-100 text-gray-500',
  UNVERIFIED: 'bg-yellow-100 text-yellow-700',
};

export default function WebContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [byType, setByType] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('NEW');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== 'ALL') params.set('type', type);
    params.set('status', status);
    const res = await fetch(`/api/web-contacts?${params.toString()}`);
    if (res.ok) { const d = await res.json(); setContacts(d.contacts || []); setByType(d.byType || {}); }
    setLoading(false);
  }, [type, status]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => {
    fetch('/api/users').then(r => r.ok ? r.json() : { users: [] })
      .then(d => setUsers((d.users || []).filter((u: any) => u.active).map((u: any) => ({ id: u.id, name: u.name }))))
      .catch(() => {});
  }, []);

  const act = async (url: string, opts: RequestInit, okMsg: string, id: string) => {
    if (busy) return null;
    setBusy(id); setNotice('');
    const res = await fetch(url, opts);
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { alert(d.error || 'Action failed'); return null; }
    setNotice(okMsg);
    await fetchContacts();
    return d;
  };

  const patch = (c: Contact, data: any, msg: string) =>
    act(`/api/web-contacts/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }, msg, c.id);

  const reply = async (c: Contact) => {
    const body = (replyDraft[c.id] || '').trim();
    if (!body) { alert('Write a reply first.'); return; }
    const d = await act(`/api/web-contacts/${c.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) }, `Reply sent to ${c.email}.`, c.id);
    if (d) setReplyDraft(prev => ({ ...prev, [c.id]: '' }));
  };

  const convert = (c: Contact) =>
    act(`/api/web-contacts/${c.id}/convert`, { method: 'POST' }, 'Added to Guests as a prospect.', c.id);

  const visible = q.trim()
    ? contacts.filter(c => `${c.name || ''} ${c.email || ''} ${c.message || ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    : contacts;

  const metaBits = (c: Contact): string[] => {
    const m = c.meta || {};
    const bits: string[] = [];
    if (c.type === 'PRAYER') { if (m.urgent) bits.push('URGENT'); if (m.private) bits.push('PRIVATE'); }
    if (c.type === 'CONTACT' && m.subject) bits.push(String(m.subject));
    if (c.type === 'GATHERING' && m.interest) bits.push(m.interest === 'LAUNCH_TEAM' ? 'Launch team' : 'Notify at launch');
    if (c.type === 'VISIT' && m.firstVisitDate) bits.push(`Visiting ${m.firstVisitDate}`);
    return bits;
  };

  return (
    <div className="fade-in max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-header">✉️ Web Contacts</h1>
          <p className="text-church-500 text-sm mt-1 max-w-2xl">
            Everyone who reached out from the website — newsletter, prayer, contact, plan-a-visit, and The Gathering.
            Only email-verified submissions appear here. Reply, assign, add notes, or add someone to Guests for follow-up.
          </p>
        </div>
        <a href={`/api/web-contacts/export?type=${type}&status=${status}`} className="btn-secondary btn-sm whitespace-nowrap">⬇ Export CSV</a>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {TYPES.map(t => (
          <button key={t.key} onClick={() => setType(t.key)}
            className={`btn-sm rounded-lg px-3 py-1.5 text-sm font-medium ${type === t.key ? 'bg-church-900 text-white' : 'bg-white border border-church-200 text-church-600'}`}>
            {t.label}{byType[t.key] != null ? ` (${byType[t.key]})` : ''}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={status} onChange={e => setStatus(e.target.value)} className="select-field text-sm w-auto">
          <option value="NEW">New</option>
          <option value="HANDLED">Handled</option>
          <option value="ALL">New + Handled</option>
          <option value="SPAM">Spam</option>
          <option value="UNVERIFIED">Unverified (abandoned)</option>
        </select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, message…"
          className="input-field text-sm flex-1 min-w-[200px]" />
      </div>

      {notice && <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3">✅ {notice}</div>}

      {loading ? (
        <div className="text-center py-12 text-church-400">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold text-church-700 mb-1">No contacts here yet</p>
          <p className="text-sm text-church-400">Verified submissions from the website forms will show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(c => {
            const open = expanded === c.id;
            const m = c.meta || {};
            const replies = Array.isArray(m.replies) ? m.replies : [];
            const notesVal = notesDraft[c.id] !== undefined ? notesDraft[c.id] : (c.notes || '');
            return (
              <div key={c.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3 cursor-pointer" onClick={() => setExpanded(open ? null : c.id)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${TYPE_BADGE[c.type] || ''}`}>{TYPE_LABEL[c.type] || c.type}</span>
                      <span className={`badge ${STATUS_BADGE[c.status] || ''}`}>{c.status}</span>
                      {metaBits(c).map((b, i) => <span key={i} className={`badge ${b === 'URGENT' ? 'bg-red-100 text-red-700' : 'bg-church-100 text-church-600'}`}>{b}</span>)}
                      {c.guestId && <span className="badge bg-emerald-100 text-emerald-700">In Guests</span>}
                      {c.assignedToName && <span className="badge bg-brand-100 text-brand-700">→ {c.assignedToName}</span>}
                    </div>
                    <p className="font-bold text-church-900 mt-1">{c.name || c.email || 'Someone'}</p>
                    <p className="text-sm text-church-600">{c.email || 'no email'}{c.phone ? ` · ${c.phone}` : ''}</p>
                    {c.message && <p className="text-sm text-church-700 mt-1.5 line-clamp-2">{c.message}</p>}
                    <p className="text-xs text-church-400 mt-1.5">
                      {new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-church-400 text-sm flex-shrink-0">{open ? '▲' : '▼'}</span>
                </div>

                {open && (
                  <div className="mt-4 pt-4 border-t border-church-100 space-y-4" onClick={e => e.stopPropagation()}>
                    {c.message && <div className="text-sm text-church-800 whitespace-pre-wrap bg-church-50 rounded-lg p-3">{c.message}</div>}

                    <div className="flex flex-wrap gap-2">
                      {c.status !== 'HANDLED' && <button className="btn-primary btn-sm" disabled={busy === c.id} onClick={() => patch(c, { status: 'HANDLED' }, 'Marked handled.')}>✓ Mark handled</button>}
                      {c.status === 'HANDLED' && <button className="btn-secondary btn-sm" disabled={busy === c.id} onClick={() => patch(c, { status: 'NEW' }, 'Reopened.')}>↩ Reopen</button>}
                      {c.status !== 'SPAM' && <button className="btn-secondary btn-sm" disabled={busy === c.id} onClick={() => patch(c, { status: 'SPAM' }, 'Marked spam.')}>Spam</button>}
                      {!c.guestId && <button className="btn-secondary btn-sm" disabled={busy === c.id} onClick={() => convert(c)}>+ Add to Guests</button>}
                      {c.guestId && <Link href="/dashboard/guests" className="btn-secondary btn-sm">View in Guests →</Link>}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-church-500">Assign to</label>
                      <select className="select-field text-sm w-auto" value={c.assignedToId || ''} disabled={busy === c.id}
                        onChange={e => patch(c, { assignedToId: e.target.value }, 'Assignment updated.')}>
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>

                    {c.email && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-church-700">Reply by email</label>
                        <textarea className="textarea-field text-sm min-h-[90px]" placeholder={`Write to ${c.email}…`}
                          value={replyDraft[c.id] || ''} onChange={e => setReplyDraft(prev => ({ ...prev, [c.id]: e.target.value }))} />
                        <button className="btn-primary btn-sm" disabled={busy === c.id} onClick={() => reply(c)}>Send reply</button>
                        {replies.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {replies.map((rp: any, i: number) => (
                              <div key={i} className="text-xs text-church-500 bg-church-50 rounded px-2.5 py-1.5">
                                <span className="font-medium text-church-600">{rp.by}</span> · {new Date(rp.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                <div className="text-church-700 whitespace-pre-wrap mt-0.5">{rp.body}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-church-700">Internal notes</label>
                      <textarea className="textarea-field text-sm min-h-[70px]" placeholder="Private to the team…"
                        value={notesVal} onChange={e => setNotesDraft(prev => ({ ...prev, [c.id]: e.target.value }))} />
                      <button className="btn-secondary btn-sm" disabled={busy === c.id} onClick={() => patch(c, { notes: notesVal }, 'Notes saved.')}>Save notes</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
