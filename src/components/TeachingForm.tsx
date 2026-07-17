'use client';

// Run 57 — the create/edit form, shared by /dashboard/teaching/new and
// /dashboard/teaching/[id].
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TeachingEditor from '@/components/TeachingEditor';
import type { Block } from '@/content/teaching/types';
import { TOPICS } from '@/content/teaching/types';

export type FormValue = {
  id?: string;
  kind: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  topic: string;
  series: string;
  featured: boolean;
  publishAt: string;
  status: string;
  youTubeId: string;
  readMin: string;
  durationMin: string;
  body: Block[];
};

const label = 'block text-xs font-semibold uppercase tracking-wide text-church-500 mb-1';
const input = 'w-full rounded-lg border border-church-200 px-3 py-2 text-sm focus:border-church-400 focus:outline-none';

export default function TeachingForm({ initial, today }: { initial: FormValue; today: string }) {
  const router = useRouter();
  const [v, setV] = useState<FormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const isNew = !v.id;
  const isSermon = v.kind === 'sermon';

  const set = <K extends keyof FormValue>(k: K, val: FormValue[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setSaved(false);
  };

  const save = async (overrides?: Partial<FormValue>) => {
    const next = { ...v, ...(overrides || {}) };
    setSaving(true); setError('');
    const payload: any = {
      kind: next.kind, slug: next.slug, title: next.title, excerpt: next.excerpt,
      date: next.date, topic: next.topic, series: next.series,
      featured: next.featured, status: next.status,
      publishAt: next.publishAt || null,
      body: next.body,
      readMin: next.readMin === '' ? null : Number(next.readMin),
      durationMin: next.durationMin === '' ? null : Number(next.durationMin),
    };
    if (isSermon) payload.youTubeId = next.youTubeId;

    const res = await fetch(isNew ? '/api/teaching' : '/api/teaching/' + v.id, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || 'That did not save.'); return; }
    setV((p) => ({ ...p, ...(overrides || {}) }));
    setSaved(true);
    if (isNew) router.push('/dashboard/teaching/' + d.teaching.id);
    else router.refresh();
  };

  // What a reader sees right now, computed the same way the site computes it.
  const live = v.status === 'PUBLISHED' && (!v.publishAt || v.publishAt <= today);
  const scheduled = v.status === 'PUBLISHED' && !!v.publishAt && v.publishAt > today;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/dashboard/teaching" className="text-sm text-church-500 hover:text-church-700">← Teaching</Link>
        <span className="text-church-300">/</span>
        <h1 className="text-xl font-bold text-church-900">
          {isNew ? (isSermon ? 'New sermon' : 'New article') : v.title || 'Untitled'}
        </h1>
        {!isNew && (
          <span className="ml-1">
            {v.status === 'DRAFT' && <span className="rounded-full bg-church-100 px-2 py-0.5 text-xs font-medium text-church-600">Draft</span>}
            {v.status === 'ARCHIVED' && <span className="rounded-full bg-church-100 px-2 py-0.5 text-xs font-medium text-church-400">Archived</span>}
            {live && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Live</span>}
            {scheduled && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Scheduled for {v.publishAt}</span>}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!isNew && (
            <a href={'/teaching/' + v.slug} target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-church-300 px-3 py-2 text-sm font-medium text-church-700 hover:bg-church-50">
              Preview ↗
            </a>
          )}
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
          <button onClick={() => save()} disabled={saving}
            className="rounded-lg bg-church-700 px-4 py-2 text-sm font-medium text-white hover:bg-church-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        {/* main column */}
        <div className="space-y-4">
          <div>
            <label className={label}>Title</label>
            <input className={input} value={v.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div>
            <label className={label}>Excerpt</label>
            <textarea className={input + ' h-20 resize-y'} value={v.excerpt} onChange={(e) => set('excerpt', e.target.value)}
              placeholder="One or two sentences. Shown on the Watch & Read page and in search results." />
          </div>

          {isSermon && (
            <div>
              <label className={label}>YouTube link</label>
              <input className={input} value={v.youTubeId} onChange={(e) => set('youTubeId', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…" />
              <p className="mt-1 text-xs text-church-400">Paste the whole link — the address bar one, a youtu.be short link, or a live link. We take what we need from it.</p>
            </div>
          )}

          <div>
            <label className={label}>{isSermon ? 'Transcript (optional)' : 'Article'}</label>
            <TeachingEditor value={v.body} onChange={(b) => set('body', b)}
              placeholder={isSermon ? 'Leave this empty unless you have a transcript.' : 'Start writing…'} />
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-church-200 bg-white p-4 space-y-3">
            <div>
              <label className={label}>Status</label>
              <select className={input} value={v.status} onChange={(e) => set('status', e.target.value)}>
                <option value="DRAFT">Draft — nobody can see it</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived — taken down</option>
              </select>
            </div>
            <div>
              <label className={label}>Publish date</label>
              <input type="date" className={input} value={v.publishAt} onChange={(e) => set('publishAt', e.target.value)} />
              <p className="mt-1 text-xs text-church-400">
                {v.publishAt
                  ? (v.publishAt > today ? 'Appears on its own that morning.' : 'Already past — visible now.')
                  : 'Empty means visible as soon as it is published.'}
              </p>
            </div>
            {!isNew && (
              <div className="flex gap-2 pt-1">
                {v.status !== 'PUBLISHED' && (
                  <button onClick={() => save({ status: 'PUBLISHED', publishAt: '' })}
                    className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                    Publish now
                  </button>
                )}
                {v.status === 'PUBLISHED' && (
                  <button onClick={() => save({ status: 'DRAFT' })}
                    className="flex-1 rounded-lg border border-church-300 px-2 py-1.5 text-xs font-medium text-church-700 hover:bg-church-50">
                    Unpublish
                  </button>
                )}
                {v.status !== 'ARCHIVED' && (
                  <button onClick={() => save({ status: 'ARCHIVED' })}
                    className="flex-1 rounded-lg border border-church-300 px-2 py-1.5 text-xs font-medium text-church-500 hover:bg-church-50">
                    Archive
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-church-200 bg-white p-4 space-y-3">
            <div>
              <label className={label}>Topic</label>
              <select className={input} value={v.topic} onChange={(e) => set('topic', e.target.value)}>
                {TOPICS.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Date</label>
              <input type="date" className={input} value={v.date} onChange={(e) => set('date', e.target.value)} />
              <p className="mt-1 text-xs text-church-400">The teaching&rsquo;s own date — what it is sorted by.</p>
            </div>
            <div>
              <label className={label}>Series (optional)</label>
              <input className={input} value={v.series} onChange={(e) => set('series', e.target.value)} placeholder="The Well" />
            </div>
            <div>
              <label className={label}>{isSermon ? 'Duration (minutes)' : 'Read time (minutes)'}</label>
              <input type="number" className={input}
                value={isSermon ? v.durationMin : v.readMin}
                onChange={(e) => set(isSermon ? 'durationMin' : 'readMin', e.target.value)} />
            </div>
            <div>
              <label className={label}>Web address</label>
              <input className={input} value={v.slug} onChange={(e) => set('slug', e.target.value)}
                placeholder={isNew ? 'made from the title' : undefined} />
              <p className="mt-1 text-xs text-church-400">
                gracelifecenter.com/teaching/<strong>{v.slug || '…'}</strong>
                {!isNew && <><br />Changing this breaks any existing link to the old address.</>}
              </p>
            </div>
            <label className="flex items-center gap-2 pt-1 text-sm text-church-700">
              <input type="checkbox" checked={v.featured} onChange={(e) => set('featured', e.target.checked)} />
              Pin as the featured teaching
            </label>
            {v.featured && !initial.featured && (
              <p className="text-xs text-amber-700">This will un-pin whichever teaching is featured now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
