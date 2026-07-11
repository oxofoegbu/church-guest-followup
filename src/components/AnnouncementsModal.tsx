'use client';

// Run 20 — shared announcements modal, launched from the 📣 buttons on a
// cohort card or a participant row in the track detail page. Lists existing
// announcements newest-first, posts new ones (participants are ALWAYS emailed
// on post — the modal says so plainly), and lets admins delete.
// Rendered OUTSIDE any fade-in wrapper (stacking-context rule).

import { useState, useEffect, useCallback } from 'react';

type Announcement = {
  id: string;
  title: string | null;
  body: string;
  createdAt: string;
  emailedAt: string | null;
  author: { id: string; name: string } | null;
};

export default function AnnouncementsModal({ target, heading, subheading, isAdmin, onClose }: {
  target: { cohortId?: string; enrollmentId?: string };
  heading: string;      // e.g. '📣 Announcements — Final Session'
  subheading: string;   // e.g. 'Everyone in this cohort is emailed when you post.'
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const qs = target.cohortId
    ? `cohortId=${target.cohortId}`
    : `enrollmentId=${target.enrollmentId}`;

  const fetchItems = useCallback(async () => {
    const res = await fetch(`/api/announcements?${qs}`);
    if (res.ok) { const d = await res.json(); setItems(d.announcements || []); }
    setLoading(false);
  }, [qs]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const post = async () => {
    if (posting || !body.trim()) return;
    setPosting(true);
    setError('');
    setNotice('');
    const res = await fetch('/api/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...target, title: title.trim() || undefined, body }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setTitle('');
      setBody('');
      setNotice(d.recipients === 0
        ? 'Posted. (No participants with an email on file, so no emails were sent.)'
        : `Posted — emailed ${d.emailed} of ${d.recipients} participant${d.recipients === 1 ? '' : 's'}.`);
      fetchItems();
    } else {
      setError(d.error || 'Could not post the announcement');
    }
    setPosting(false);
  };

  const remove = async (a: Announcement) => {
    if (!confirm('Delete this announcement? Participants will no longer see it on their journey page.')) return;
    const res = await fetch(`/api/announcements/${a.id}`, { method: 'DELETE' });
    if (res.ok) fetchItems();
    else alert('Could not delete the announcement');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-church-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-church-900">{heading}</h2>
              <p className="text-xs text-church-500 mt-0.5">{subheading}</p>
            </div>
            <button onClick={onClose} className="text-church-400 hover:text-church-600 text-xl leading-none">×</button>
          </div>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Post form */}
          <div className="space-y-2.5 mb-5">
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={140}
              className="input-field" placeholder="Title (optional) — e.g. No meeting this Sunday" />
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} maxLength={4000}
              className="textarea-field" placeholder="Your announcement or instructions…" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✅ {notice}</p>}
            <button onClick={post} disabled={posting || !body.trim()} className="btn-primary btn-sm w-full">
              {posting ? 'Posting…' : '📣 Post & email participants'}
            </button>
          </div>

          {/* Existing announcements */}
          {loading ? (
            <p className="text-sm text-church-400 text-center py-4">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-church-400 text-center py-4">No announcements yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map(a => (
                <div key={a.id} className="border border-church-100 rounded-xl px-4 py-3 bg-warm-50/60">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {a.title && <p className="font-semibold text-church-900 text-sm">{a.title}</p>}
                      <p className="text-sm text-church-700 whitespace-pre-wrap mt-0.5">{a.body}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => remove(a)} title="Delete announcement"
                        className="p-1 text-church-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm flex-shrink-0">🗑️</button>
                    )}
                  </div>
                  <p className="text-xs text-church-400 mt-1.5">
                    {new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {a.author ? ` · ${a.author.name}` : ''}
                    {a.emailedAt ? ' · ✉️ emailed' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
