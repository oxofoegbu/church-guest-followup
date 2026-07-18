'use client';

import { useState, useEffect, useCallback } from 'react';
import ModuleWorkbook from '@/components/ModuleWorkbook';
import PageHelp from '@/components/PageHelp';
import WeekCircle from '@/components/WeekCircle';
import TrackCoachmark from '@/components/TrackCoachmark';
import type { WorkbookBlock, ReflectionEntry } from '@/lib/workbook';

type Enrollment = {
  id: string; trackId: string; status: string;
  track: {
    id: string; name: string; description: string | null;
    milestoneLabel: string | null; workbookUrl: string | null;
    modules: { id: string; weekNumber: number; title: string; summary: string | null; kind: string; hasContent: boolean }[];
  };
  discipler: { name: string; email: string; phone: string | null; photoUrl: string | null } | null;
  cohort: { name: string; meetingDay: string | null; meetingTime: string | null } | null;
  progress: { moduleId: string; completedAt: string }[];
  // Run 54 -- null until the participant dismisses the first-run coachmark
  helpSeenAt?: string | null;
  // Run 20 -- cohort announcements + personal notes, newest first
  announcements?: { id: string; title: string | null; body: string; createdAt: string; enrollmentId: string | null; author: { name: string } | null }[];
};

type DisciplerNote = { note: string; updatedAt: string; author: { name: string } | null } | null;

type ModuleData = { blocks: WorkbookBlock[]; reflections: ReflectionEntry[]; disciplerNote: DisciplerNote };

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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [moduleData, setModuleData] = useState<Record<string, ModuleData>>({});
  const [moduleLoading, setModuleLoading] = useState<string | null>(null);
  // Run 16 — track panels are collapsible; the first track starts open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Run 16 — Introduction/Appendix modules are content-only: no completion
  // circle, and they never count toward the N/weeks progress.
  const isCore = (m: { kind?: string }) => !m.kind || m.kind === 'CORE';

  const fetchMine = useCallback(async () => {
    const res = await fetch('/api/my-tracks');
    if (res.ok) {
      const d = await res.json();
      const list = d.enrollments || [];
      setEnrollments(list);
      setCollapsed(prev => {
        if (Object.keys(prev).length > 0) return prev; // keep the user's choices on refetch
        const init: Record<string, boolean> = {};
        list.forEach((e: Enrollment, i: number) => { init[e.id] = i > 0; });
        return init;
      });
    }
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

  // Run 54 -- dismiss the first-run coachmark. Optimistic and fire-safe: the
  // card closes immediately and a failed stamp simply means the hint returns
  // on a later visit, which is far better than a card that will not close.
  const dismissHelp = async (e: Enrollment) => {
    setEnrollments(prev => prev.map(x =>
      x.id === e.id ? { ...x, helpSeenAt: new Date().toISOString() } : x));
    try {
      await fetch('/api/my-tracks/help-seen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: e.id }),
      });
    } catch {
      /* ignore -- the hint reappears next visit at worst */
    }
  };

  // moduleData/expanded are keyed by `${enrollmentId}:${moduleId}` so the same
  // module in two enrollments (edge case) cannot collide.
  const expandWeek = async (e: Enrollment, moduleId: string) => {
    const key = `${e.id}:${moduleId}`;
    if (expanded === key) { setExpanded(null); return; }
    setExpanded(key);
    if (!moduleData[key]) {
      setModuleLoading(key);
      const res = await fetch(`/api/tracks/${e.trackId}/enrollments/${e.id}/modules/${moduleId}`);
      if (res.ok) {
        const d = await res.json();
        setModuleData(prev => ({
          ...prev,
          [key]: {
            blocks: d.module?.content?.blocks || [],
            reflections: d.reflections || [],
            disciplerNote: d.disciplerNote || null,
          },
        }));
      }
      setModuleLoading(null);
    }
  };

  const saveReflection = async (e: Enrollment, moduleId: string, promptId: string, response: string) => {
    const res = await fetch(`/api/tracks/${e.trackId}/enrollments/${e.id}/modules/${moduleId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId, response }),
    });
    if (res.ok) {
      // Keep the cached snapshot in step with what was just saved. A week's
      // ModuleWorkbook is only mounted while it is open, so collapsing and
      // re-opening it remounts fresh and re-seeds from this cache. Without
      // this upsert the re-opened week reverts to the pre-edit fetch and the
      // saved answers look like they vanished until a refresh. Cache is keyed
      // by `${enrollmentId}:${moduleId}` here (same as expandWeek).
      const key = `${e.id}:${moduleId}`;
      setModuleData(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        const rest = cur.reflections.filter(r => r.promptId !== promptId);
        return {
          ...prev,
          [key]: {
            ...cur,
            reflections: [...rest, { promptId, response, updatedAt: new Date().toISOString() }],
          },
        };
      });
    }
    return res.ok;
  };

  return (
    <div className="fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="page-header">📖 My Tracks</h1>
        <p className="text-church-500 text-sm mt-1">
          Your own formation journeys — one week at a time, walking with Jesus and with each other.
        </p>
      </div>

      {/* Run 54 -- My Tracks was the one participant-facing dashboard page that
          never got a PageHelp panel, so people had nowhere to learn the circle. */}
      <PageHelp
        docSection="tracks"
        tips={[
          { icon: '✅', title: 'Tap the numbered circle to mark a week complete', body: 'The circle turns into a green check and your progress bar moves. Tap it again if you marked it by mistake. Only the numbered weeks count toward your progress.' },
          { icon: '📖', title: 'Tap the week name to open it', body: 'Each week opens in place with its content and reflection questions. Your answers save on their own as you write them — there is no submit button.' },
          { icon: '📚', title: 'Introduction and Appendix are for reading', body: 'Sections marked 📖 and 📋 have no circle. They are yours to read, and they never count for or against your progress.' },
          { icon: '🤝', title: 'Your discipler walks with you', body: 'They can see your progress and reflections, and may leave a comment on a week. Their contact details are at the top of each track.' },
        ]}
      />

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
            const coreIds = new Set(e.track.modules.filter(isCore).map(m => m.id));
            const total = coreIds.size;
            const doneCount = e.progress.filter(p => coreIds.has(p.moduleId)).length;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            const anyContent = e.track.modules.some(m => m.hasContent);
            const isCollapsed = !!collapsed[e.id];
            return (
              <div key={e.id} className="card">
                {/* Run 16 — clickable panel header: tap to expand/collapse this track */}
                <div
                  className="flex items-start justify-between gap-3 mb-2 cursor-pointer select-none -m-2 p-2 rounded-xl hover:bg-warm-50/70 transition-colors"
                  onClick={() => setCollapsed(prev => ({ ...prev, [e.id]: !prev[e.id] }))}
                  role="button"
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${e.track.name}`}>
                  <div>
                    <h2 className="font-bold text-church-900 text-lg">{e.track.name}</h2>
                    {e.track.milestoneLabel && (
                      <p className="text-xs text-brand-600 mt-0.5">🏁 Leads to: {e.track.milestoneLabel}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge ${STATUS_STYLES[e.status] || 'bg-gray-100 text-gray-500'}`}>{e.status}</span>
                    <span className={`text-church-400 text-sm transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-2 bg-church-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-church-600">{doneCount}/{total}</span>
                </div>

                {!isCollapsed && (<>
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

                {(e.announcements?.length || 0) > 0 && (
                  <div className="mb-4 border border-church-100 rounded-xl px-4 py-3 bg-warm-50/60">
                    <p className="text-xs uppercase text-church-400 font-semibold mb-2">📣 Announcements</p>
                    <div className="space-y-2.5">
                      {e.announcements!.map(a => (
                        <div key={a.id}>
                          <div className="flex items-center gap-2 flex-wrap">
                            {a.title && <p className="font-semibold text-church-900 text-sm">{a.title}</p>}
                            {a.enrollmentId && (
                              <span className="badge bg-brand-50 text-brand-600 border border-brand-200 text-xs">Just for you</span>
                            )}
                          </div>
                          <p className="text-sm text-church-700 whitespace-pre-wrap">{a.body}</p>
                          <p className="text-xs text-church-400 mt-0.5">
                            {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {a.author ? ` · ${a.author.name}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Run 54 -- the hint moved ABOVE the list. Below it, people had
                    already concluded the weeks were not tappable.
                    Run 55 -- and it now waits for the coachmark to be dismissed.
                    Showing both at once said the same sentence twice, which read
                    as nagging rather than helping. Coachmark while you learn;
                    this quiet line forever after. */}
                {e.status === 'ACTIVE' && !!e.helpSeenAt && (
                  <p className="text-xs text-church-400 mb-2">
                    {anyContent
                      ? 'Tap a week to open its content and write your reflections. Tap the circle to mark it complete.'
                      : 'Tap the circle to mark a week complete when you finish it.'}
                  </p>
                )}

                {e.status === 'ACTIVE' && !e.helpSeenAt && (
                  <TrackCoachmark hasContent={anyContent} onDismiss={() => dismissHelp(e)} />
                )}

                <div className="space-y-2">
                  {e.track.modules.map(m => {
                    const core = isCore(m);
                    const done = core && e.progress.some(p => p.moduleId === m.id);
                    const busy = toggling === m.id;
                    const key = `${e.id}:${m.id}`;
                    const isOpen = expanded === key;
                    const data = moduleData[key];
                    return (
                      <div key={m.id}
                        className={`rounded-xl border px-3 py-2.5 transition-all ${done ? 'border-green-200 bg-green-50/60' : 'border-church-100 bg-white'}`}>
                        <div
                          className={`flex items-center gap-3 ${m.hasContent ? 'cursor-pointer' : ''}`}
                          onClick={() => { if (m.hasContent) expandWeek(e, m.id); }}>
                          {core ? (
                            <WeekCircle
                              weekNumber={m.weekNumber}
                              done={done}
                              busy={busy}
                              interactive={e.status === 'ACTIVE'}
                              onToggle={() => toggleWeek(e, m.id)}
                              size="sm"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-sm flex-shrink-0">
                              {m.kind === 'INTRO' ? '📖' : '📋'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${done ? 'text-green-800' : 'text-church-800'}`}>
                              {core ? `Week ${m.weekNumber}: ${m.title}` : m.title}
                            </p>
                          </div>
                          {m.hasContent && (
                            <span className={`text-church-400 text-xs flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                          )}
                        </div>
                        {isOpen && (
                          <div className="mt-3 pt-3 border-t border-church-100">
                            {moduleLoading === key || !data ? (
                              <p className="text-sm text-church-400 text-center py-6">Loading this week…</p>
                            ) : (
                              <>
                                <ModuleWorkbook
                                  blocks={data.blocks}
                                  reflections={data.reflections}
                                  readOnly={e.status !== 'ACTIVE'}
                                  onSave={(promptId, response) => saveReflection(e, m.id, promptId, response)}
                                />
                                {data.disciplerNote && <DisciplerNoteCard note={data.disciplerNote} />}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {e.track.workbookUrl && (
                  <a href={e.track.workbookUrl} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary btn-sm inline-block mt-4">📕 Open Workbook</a>
                )}
                </>)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Run 18 — read-only display of the discipler's one general comment for a
// module (written from 🤝 My Disciples).
function DisciplerNoteCard({ note }: { note: { note: string; updatedAt: string; author: { name: string } | null } }) {
  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5">
      <p className="text-xs font-semibold text-brand-700 mb-1">
        💬 A note from your discipler{note.author?.name ? ` — ${note.author.name}` : ''}
      </p>
      <p className="text-sm text-church-800 whitespace-pre-wrap">{note.note}</p>
      <p className="text-xs text-church-400 mt-1">{new Date(note.updatedAt).toLocaleDateString()}</p>
    </div>
  );
}
