'use client';

// Run 57 — create a teaching. Starts as a DRAFT with no publish date: nothing
// new can reach the public by accident.
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import TeachingForm from '@/components/TeachingForm';

function NewTeaching() {
  const sp = useSearchParams();
  const kind = sp.get('kind') === 'sermon' ? 'sermon' : 'article';
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  return (
    <TeachingForm
      today={today}
      initial={{
        kind, slug: '', title: '', excerpt: '', date: today, topic: 'formation',
        series: '', featured: false, publishAt: '', status: 'DRAFT',
        youTubeId: '', readMin: '', durationMin: '', body: [],
      }}
    />
  );
}

export default function NewTeachingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-church-400">Loading…</div>}>
      <NewTeaching />
    </Suspense>
  );
}
