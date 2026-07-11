'use client';

import { useState, useEffect, useCallback } from 'react';

type Enrollment = {
  id: string; trackId: string; status: string;
  track: {
    id: string; name: string; description: string | null;
    milestoneLabel: string | null; workbookUrl: string | null;
    modules: { id: string; weekNumber: number; title: string; summary: string | null }[];
  };
  discipler: { name: string; email: string; phone: string | null; photoUrl: string | null } | null;
  cohort: { name: string; meetingDay: string | null; meetingTime: string | null } | null;
  progress: { moduleId: string; completedAt: string }[];
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-brand-100 text-brand-700',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

export default function MyTracksPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchMine = useCallback(async () => {
    const res = await fetch('/api/my-tracks');
    if (res.ok) { const d = await res.json(); setEnrollments(d.enrollments || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  const toggleWeek = async (e: Enrollment, moduleId: string) => {
    if (e.status !== 'ACTIVE' || toggling) return;
    const done = e.progress.some(p => p.moduleId === moduleId);
    setToggling(moduleId);
    const res = await fetch(`/api/tracks/${e.trackId}/enrollments/${e.id}/progress`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId, completed: !done }),
    });
    if (res.ok) {
      const d = await res.json();
      setEnrollments(prev => prev.map(x => x.id === e.id ? { ...x, progress: d.progress } : x));
    }
    setToggling(null);
  };

  return (
    <div className="fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="page-header">📖 My Tracks</h1>
        <p className="text-church-500 text-sm mt-1">
          Your own formation journeys — one week at a time, walking with Jesus and with each other.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-church-400">Loading your journeys…</div>
      ) : enrollments.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🌱</div>
          <p className="font-semibold text-church-700 mb-1">You are not enrolled in a track yet</p>
          <p className="text-sm text-church-400">Speak with your pastor or leader about joining Become or Leaders Track.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {enrollments.map(e => {
            const total = e.track.modules.length;
            const doneCount = e.progress.length;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            return (
              <div key={e.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h2 className="font-bold text-church-900 text-lg">{e.track.name}</h2>
                    {e.track.milestoneLabel && (
                      <p className="text-xs text-brand-600 mt-0.5">🏁 Leads to: {e.track.milestoneLabel}</p>
                    )}
                  </div>
                  <span className={`badge ${STATUS_STYLES[e.status] || 'bg-gray-100 text-gray-500'}`}>{e.status}</span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-2 bg-church-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-church-600">{doneCount}/{total}</span>
                </div>

                {(e.discipler || e.cohort) && (
                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    {e.discipler && (
                      <div className="flex items-center gap-2.5 bg-warm-50 border border-church-100 rounded-xl px-3 py-2">
                        {e.discipler.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.discipler.photoUrl} alt={e.discipler.name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {e.discipler.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-church-800 text-xs">{e.discipler.name}</p>
                          <div className="flex gap-2 text-xs">
                            {e.discipler.phone && <a className="text-brand-600 hover:underline" href={`tel:${e.discipler.phone}`}>Call</a>}
                            {e.discipler.phone && <a className="text-brand-600 hover:underline" href={waLink(e.discipler.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                            <a className="text-brand-600 hover:underline" href={`mailto:${e.discipler.email}`}>Email</a>
                          </div>
                        </div>
                      </div>
                    )}
                    {e.cohort && (e.cohort.meetingDay || e.cohort.meetingTime) && (
                      <div className="flex items-center gap-2 bg-warm-50 border border-church-100 rounded-xl px-3 py-2 text-xs text-church-600">
                        🧑‍🤝‍🧑 {e.cohort.name}{e.cohort.meetingDay ? ` · ${e.cohort.meetingDay}s` : ''}{e.cohort.meetingTime ? ` at ${e.cohort.meetingTime}` : ''}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {e.track.modules.map(m => {
                    const done = e.progress.some(p => p.moduleId === m.id);
                    const busy = toggling === m.id;
                    return (
                      <button key={m.id} onClick={() => toggleWeek(e, m.id)}
                        disabled={e.status !== 'ACTIVE' || busy}
                        className={`w-full text-left flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${done ? 'border-green-200 bg-green-50/60' : 'border-church-100 bg-white'} ${e.status === 'ACTIVE' ? 'hover:shadow-sm active:scale-[0.99]' : 'cursor-default'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-church-100 text-church-400'}`}>
                          {busy ? '…' : done ? '✓' : m.weekNumber}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${done ? 'text-green-800' : 'text-church-800'}`}>
                            Week {m.weekNumber}: {m.title}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {e.track.workbookUrl && (
                  <a href={e.track.workbookUrl} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary btn-sm inline-block mt-4">📕 Open Workbook</a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
