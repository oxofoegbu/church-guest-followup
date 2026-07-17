'use client';

// Run 57 — edit one teaching.
import { useEffect, useState } from 'react';
import TeachingForm, { FormValue } from '@/components/TeachingForm';

export default function EditTeachingPage({ params }: { params: { id: string } }) {
  const [value, setValue] = useState<FormValue | null>(null);
  const [today, setToday] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/teaching/' + params.id);
      if (!res.ok) { setError('That teaching could not be found.'); return; }
      const { teaching: t } = await res.json();
      setToday(new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }));
      setValue({
        id: t.id, kind: t.kind, slug: t.slug, title: t.title, excerpt: t.excerpt,
        date: t.date || '', topic: t.topic, series: t.series || '',
        featured: t.featured, publishAt: t.publishAt || '', status: t.status,
        youTubeId: t.youTubeId || '',
        readMin: t.readMin == null ? '' : String(t.readMin),
        durationMin: t.durationMin == null ? '' : String(t.durationMin),
        // A sermon edits its transcript; an article edits its body. One editor,
        // one field on the form, two columns in the table.
        body: t.kind === 'sermon' ? t.transcript : t.body,
      });
    })();
  }, [params.id]);

  if (error) return <div className="p-6 text-sm text-rose-600">{error}</div>;
  if (!value) return <div className="p-6 text-sm text-church-400">Loading…</div>;
  return <TeachingForm initial={value} today={today} />;
}
