'use client';

// Run 17 — 🤝 My Disciples: the discipler-facing view.
// Shows every enrollment where the signed-in user is the assigned discipler,
// with the same expandable workbook experience as My Tracks — but strictly
// READ-ONLY: a discipler can read their disciples' reflections (the session
// module API has enforced this privacy model since Run 12: read =
// participant / discipler / ADMIN) but never write or mark progress.
//
// Run 18 — the ONE thing a discipler can write here: a single general
// comment at the end of each module about what they reviewed. Saved via PUT
// on the session module route; shared with the disciple (portal + My Tracks).

import { useState, useEffect, useCallback } from 'react';
import ModuleWorkbook from '@/components/ModuleWorkbook';
import type { WorkbookBlock, ReflectionEntry } from '@/lib/workbook';

type Enrollment = {
  id: string; trackId: string; status: string;
  startedAt: string; completedAt: string | null; notes: string | null;
  participant: { name: string; email: string | null; phone: string | null; photoUrl: string | null; kind: 'MEMBER' | 'GUEST' };
  cohort: { name: string; meetingDay: string | null; meetingTime: string | null } | null;
  progress: { moduleId: string; completedAt: string }[];
  track: {
    id: string; name: string; description: string | null; milestoneLabel: string | null;
    modules: { id: string; weekNumber: number; title: string; summary: string | null; kind: string; hasContent: boolean }[];
  };
};

type DisciplerNote = { note: string; updatedAt: string; author: { name: string } | null } | null;

type ModuleData = { blocks: WorkbookBlock[]; reflections: ReflectionEntry[]; disciplerNote: DisciplerNote; canComment: boolean };

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-brand-100 text-brand-700',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

export default function MyDisciplesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [moduleData, setModuleData] = useState<Record<string, ModuleData>>({});
  const [moduleLoading, setModuleLoading] = useState<string | null>(null);
  // Panels are collapsible like My Tracks (Run 16) — first disciple open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Intro/Appendix are content-only: no completion circle, excluded from N/weeks.
  const isCore = (m: { kind?: string }) => !m.kind || m.kind === 'CORE';

  const fetchMine = useCallback(async () => {
    const res = await fetch('/api/my-disciples');
    if (res.ok) {
      const d = await res.json();
      const list = d.enrollments || [];
      setEnrollments(list);
      setCollapsed(prev => {
        if (Object.keys(prev).length > 0) return prev;
        const init: Record<string, boolean> = {};
        list.forEach((e: Enrollment, i: number) => { init[e.id] = i > 0; });
        return init;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  // moduleData/expanded are keyed `${enrollmentId}:${moduleId}` — the same
  // track appears once per disciple, so keys must include the enrollment.
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
            canComment: !!d.canComment,
          },
        }));
      }
      setModuleLoading(null);
    }
  };

  const saveComment = async (e: Enrollment, moduleId: string, note: string): Promise<DisciplerNote | false> => {
    const res = await fetch(`/api/tracks/${e.trackId}/enrollments/${e.id}/modules/${moduleId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) return false;
    const d = await res.json();
    const key = `${e.id}:${moduleId}`;
    setModuleData(prev => prev[key] ? { ...prev, [key]: { ...prev[key], disciplerNote: d.disciplerNote || null } } : prev);
    return d.disciplerNote || null;
  };

  return (
    <div className="fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="page-header">🤝 My Disciples</h1>
        <p className="text-church-500 text-sm mt-1">
          The people entrusted to you — walk with them, pray for them, and read their journey. This view is read-only.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-church-400">Loading your disciples…</div>
      ) : enrollments.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🤝</div>
          <p className="font-semibold text-church-700 mb-1">No one is assigned to you yet</p>
          <p className="text-sm text-church-400">When a pastor or leader assigns you as someone&apos;s discipler, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {enrollments.map(e => {
            const coreIds = new Set(e.track.modules.filter(isCore).map(m => m.id));
            const total = coreIds.size;
            const doneCount = e.progress.filter(p => coreIds.has(p.moduleId)).length;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            const isCollapsed = !!collapsed[e.id];
            return (
              <div key={e.id} className="card">
                {/* Clickable panel header: tap to expand/collapse this disciple */}
                <div
                  className="flex items-start justify-between gap-3 mb-2 cursor-pointer select-none -m-2 p-2 rounded-xl hover:bg-warm-50/70 transition-colors"
                  onClick={() => setCollapsed(prev => ({ ...prev, [e.id]: !prev[e.id] }))}
                  role="button"
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${e.participant.name}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {e.participant.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.participant.photoUrl} alt={e.participant.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {e.participant.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="font-bold text-church-900 text-lg truncate">{e.participant.name}</h2>
                      <p className="text-xs text-church-500">
                        {e.track.name}{e.participant.kind === 'GUEST' ? ' · Guest' : ''}
                      </p>
                    </div>
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
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  {(e.participant.phone || e.participant.email) && (
                    <div className="flex items-center gap-2 bg-warm-50 border border-church-100 rounded-xl px-3 py-2 text-xs">
                      {e.participant.phone && <a className="text-brand-600 hover:underline" href={`tel:${e.participant.phone}`}>📞 Call</a>}
                      {e.participant.phone && <a className="text-brand-600 hover:underline" href={waLink(e.participant.phone)} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>}
                      {e.participant.email && <a className="text-brand-600 hover:underline" href={`mailto:${e.participant.email}`}>✉️ Email</a>}
                    </div>
                  )}
                  {e.cohort && (
                    <div className="flex items-center gap-2 bg-warm-50 border border-church-100 rounded-xl px-3 py-2 text-xs text-church-600">
                      🧑‍🤝‍🧑 {e.cohort.name}{e.cohort.meetingDay ? ` · ${e.cohort.meetingDay}s` : ''}{e.cohort.meetingTime ? ` at ${e.cohort.meetingTime}` : ''}
                    </div>
                  )}
                </div>

                {e.notes && (
                  <div className="mb-4 text-xs text-church-600 bg-warm-50 border border-church-100 rounded-xl px-3 py-2">
                    📝 {e.notes}
                  </div>
                )}

                <div className="space-y-2">
                  {e.track.modules.map(m => {
                    const core = isCore(m);
                    const done = core && e.progress.some(p => p.moduleId === m.id);
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
                            <div
                              aria-label={done ? `Week ${m.weekNumber} completed` : `Week ${m.weekNumber} not completed`}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-church-100 text-church-400'}`}>
                              {done ? '✓' : m.weekNumber}
                            </div>
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
                                  readOnly={true}
                                  onSave={async () => false}
                                />
                                {data.canComment && (
                                  <DisciplerCommentBox
                                    key={key}
                                    initialNote={data.disciplerNote?.note || ''}
                                    savedAt={data.disciplerNote?.updatedAt || null}
                                    onSave={note => saveComment(e, m.id, note)}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-church-400 mt-3">
                  Tap a week to read its content and your disciple&apos;s reflections. Reflections are shared with you in trust — handle them with care.
                </p>
                </>)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Run 18 — the discipler's ONE general comment for a module. Edited in
// place; saving an empty comment removes it. The disciple can read this in
// their portal and in My Tracks.
function DisciplerCommentBox({ initialNote, savedAt, onSave }: {
  initialNote: string;
  savedAt: string | null;
  onSave: (note: string) => Promise<{ note: string; updatedAt: string; author: { name: string } | null } | null | false>;
}) {
  const [note, setNote] = useState(initialNote);
  const [state, setState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(savedAt);

  const save = async () => {
    setState('saving');
    const result = await onSave(note);
    if (result === false) { setState('error'); return; }
    setLastSaved(result ? result.updatedAt : null);
    setState('saved');
  };

  return (
    <div className="mt-4 pt-4 border-t border-brand-100">
      <p className="text-sm font-semibold text-church-800 mb-1">💬 My comment on this module</p>
      <p className="text-xs text-church-400 mb-2">
        One general comment about what you reviewed — your disciple will see this in their portal and My Tracks.
      </p>
      <textarea
        value={note}
        onChange={ev => { setNote(ev.target.value); setState('dirty'); }}
        rows={3}
        placeholder="Encourage them, reflect back what you noticed, point to a next step…"
        className="textarea-field w-full text-sm"
      />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-church-400">
          {lastSaved ? `Last saved ${new Date(lastSaved).toLocaleDateString()}` : note.trim() === '' ? 'No comment yet' : ''}
        </span>
        <span>
          {state === 'saved' && <span className="text-xs font-medium text-green-600">Saved ✓</span>}
          {state === 'saving' && <span className="text-xs text-church-400">Saving…</span>}
          {state === 'error' && (
            <button onClick={save} className="text-xs font-medium text-red-600 hover:underline">
              Could not save — tap to retry
            </button>
          )}
          {state === 'dirty' && (
            <button onClick={save} className="btn-primary btn-sm text-xs px-3 py-1">Save comment</button>
          )}
        </span>
      </div>
    </div>
  );
}
