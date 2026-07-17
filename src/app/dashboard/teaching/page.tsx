'use client';

// Run 57 — Teaching admin. The list. Modelled on /dashboard/web-contacts.
//
// The question this page exists to answer, at a glance: what is live, what is
// waiting its turn, and what is not finished. `status` (intent) and `publishAt`
// (scheduling) are separate fields and are deliberately shown as separate
// facts — conflating them is how you accidentally publish something.
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageHelp from '@/components/PageHelp';
import { TOPICS } from '@/content/teaching/types';

type Row = {
  id: string; kind: string; slug: string; title: string; excerpt: string;
  date: string | null; topic: string; series: string | null; featured: boolean;
  publishAt: string | null; status: string; seq: number;
  youTubeId: string | null; readMin: number | null; durationMin: number | null;
  live: boolean; scheduled: boolean;
};

const KINDS = [
  { key: 'ALL', label: 'All' },
  { key: 'article', label: 'Articles' },
  { key: 'sermon', label: 'Sermons' },
];
const STATUS_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'ARCHIVED', label: 'Archived' },
];

export default function TeachingAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [today, setToday] = useState('');
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [topic, setTopic] = useState('ALL');
  const [q, setQ] = useState('');
  const [shiftOpen, setShiftOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (kind !== 'ALL') p.set('kind', kind);
    if (status !== 'ALL') p.set('status', status);
    if (topic !== 'ALL') p.set('topic', topic);
    if (q.trim()) p.set('q', q.trim());
    const res = await fetch('/api/teaching?' + p.toString());
    if (res.ok) {
      const d = await res.json();
      setRows(d.teachings);
      setToday(d.today);
    }
    setLoading(false);
  }, [kind, status, topic, q]);

  useEffect(() => {
    const t = window.setTimeout(load, q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [load, q]);

  const liveCount = rows.filter((r) => r.live).length;
  const scheduledCount = rows.filter((r) => r.scheduled).length;
  const nextUp = rows.filter((r) => r.scheduled).sort((a, b) => (a.publishAt! < b.publishAt! ? -1 : 1))[0];
  const lastDrip = rows.filter((r) => r.scheduled).sort((a, b) => (a.publishAt! > b.publishAt! ? -1 : 1))[0];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold text-church-900">Teaching</h1>
          <p className="text-sm text-church-500 mt-0.5">Sermons and articles on the church website.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/teaching/new?kind=article"
            className="rounded-lg bg-church-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-church-800">
            + Article
          </Link>
          <Link href="/dashboard/teaching/new?kind=sermon"
            className="rounded-lg border border-church-300 px-3.5 py-2 text-sm font-medium text-church-700 hover:bg-church-50">
            + Sermon
          </Link>
        </div>
      </div>

      <PageHelp
        docSection="teaching"
        tips={[
          { icon: '👁️', title: 'Live vs Scheduled', body: 'Live means a reader can see it right now. Scheduled means it is finished and waiting for its date — it will appear on its own, with no deploy and nothing for you to do. Draft means nobody can see it, whatever its date says.' },
          { icon: '📅', title: 'The daily drip', body: 'Articles are publishing one per day. Changing a publish date is safe and takes effect immediately. "Move the schedule" shifts everything still to come by the same number of days — useful if you want to pause for a week.' },
          { icon: '✍️', title: 'Editing published writing', body: 'Edits go live within a few seconds; there is no deploy. The editor only offers what the website can display, so you cannot accidentally create something that breaks a page.' },
          { icon: '📌', title: 'Featured', body: 'Exactly one teaching is pinned to the top of the Watch & Read page. Marking a new one featured automatically un-features the old one.' },
        ]}
      />

      {/* drip summary */}
      <div className="mb-5 rounded-lg border border-church-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <div><span className="text-2xl font-bold text-church-900">{liveCount}</span> <span className="text-church-500">live</span></div>
          <div><span className="text-2xl font-bold text-amber-600">{scheduledCount}</span> <span className="text-church-500">scheduled</span></div>
          {nextUp && <div className="text-church-600">Next up <strong>{nextUp.publishAt}</strong> — {nextUp.title}</div>}
          {lastDrip && <div className="text-church-600">Runs through <strong>{lastDrip.publishAt}</strong></div>}
          <button onClick={() => setShiftOpen(true)}
            className="ml-auto rounded-lg border border-church-300 px-3 py-1.5 text-sm font-medium text-church-700 hover:bg-church-50">
            Move the schedule…
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)}
            className={'rounded-full px-3 py-1.5 text-sm font-medium ' + (kind === k.key ? 'bg-church-700 text-white' : 'bg-church-100 text-church-600 hover:bg-church-200')}>
            {k.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-church-200" />
        {STATUS_FILTERS.map((s) => (
          <button key={s.key} onClick={() => setStatus(s.key)}
            className={'rounded-full px-3 py-1.5 text-sm font-medium ' + (status === s.key ? 'bg-church-700 text-white' : 'bg-church-100 text-church-600 hover:bg-church-200')}>
            {s.label}
          </button>
        ))}
        <select value={topic} onChange={(e) => setTopic(e.target.value)}
          className="rounded-lg border border-church-200 px-2.5 py-1.5 text-sm">
          <option value="ALL">All topics</option>
          {TOPICS.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles…"
          className="ml-auto w-56 rounded-lg border border-church-200 px-3 py-1.5 text-sm focus:border-church-400 focus:outline-none" />
      </div>

      {/* list */}
      <div className="overflow-hidden rounded-lg border border-church-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-church-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-church-400">Nothing matches those filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-church-50 text-left text-xs uppercase tracking-wide text-church-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Title</th>
                <th className="px-4 py-2.5 font-semibold">Topic</th>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Publishes</th>
                <th className="px-4 py-2.5 font-semibold">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-church-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-church-50/60">
                  <td className="px-4 py-2.5">
                    <Link href={'/dashboard/teaching/' + r.id} className="font-medium text-church-900 hover:text-church-700">
                      {r.featured && <span title="Featured" className="mr-1">📌</span>}
                      {r.kind === 'sermon' && <span title="Sermon" className="mr-1">▶️</span>}
                      {r.title}
                    </Link>
                    <div className="text-xs text-church-400">/{r.slug}</div>
                  </td>
                  <td className="px-4 py-2.5 text-church-600">{TOPICS.find((t) => t.slug === r.topic)?.label || r.topic}</td>
                  <td className="px-4 py-2.5 text-church-600">{r.date}</td>
                  <td className="px-4 py-2.5 text-church-600">{r.publishAt || <span className="text-church-300">—</span>}</td>
                  <td className="px-4 py-2.5">
                    {r.status === 'DRAFT' && <span className="rounded-full bg-church-100 px-2 py-0.5 text-xs font-medium text-church-600">Draft</span>}
                    {r.status === 'ARCHIVED' && <span className="rounded-full bg-church-100 px-2 py-0.5 text-xs font-medium text-church-400">Archived</span>}
                    {r.live && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Live</span>}
                    {r.scheduled && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Scheduled</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-xs text-church-400">{rows.length} shown · today is {today} (church time)</p>

      {shiftOpen && <ShiftModal onClose={() => setShiftOpen(false)} onDone={() => { setShiftOpen(false); load(); }} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Moving the drip. Preview first, always — this button can move 130 articles.
// Rendered as a sibling of the page content, never inside an animated
// container, so it cannot be trapped in a stacking context.
// ---------------------------------------------------------------------------
function ShiftModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState('7');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const call = async (apply: boolean) => {
    setBusy(true); setError('');
    const res = await fetch('/api/teaching/bulk-shift', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: parseInt(days, 10), apply }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || 'That did not work.'); setPreview(null); return; }
    if (d.applied) { onDone(); return; }
    setPreview(d);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-church-900">Move the schedule</h2>
        <p className="mt-1 text-sm text-church-500">
          Shifts every teaching that has not published yet. Nothing already published moves.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <input type="number" value={days} onChange={(e) => { setDays(e.target.value); setPreview(null); }}
            className="w-24 rounded-lg border border-church-200 px-3 py-2 text-sm" />
          <span className="text-sm text-church-600">days later (use a negative number to bring it forward)</span>
        </div>

        {error && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        {preview && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900">
              {preview.summary.count} teachings will move by {preview.summary.days} days.
            </p>
            <p className="mt-1 text-amber-800">
              Next one: {preview.summary.firstFrom} → <strong>{preview.summary.firstTo}</strong><br />
              Last one: {preview.summary.lastFrom} → <strong>{preview.summary.lastTo}</strong>
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-church-500 hover:bg-church-100">Cancel</button>
          {!preview ? (
            <button disabled={busy} onClick={() => call(false)}
              className="rounded-lg bg-church-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? 'Checking…' : 'Preview'}
            </button>
          ) : (
            <button disabled={busy} onClick={() => call(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? 'Moving…' : 'Move ' + preview.summary.count + ' teachings'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
