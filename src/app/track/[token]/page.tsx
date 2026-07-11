'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ModuleWorkbook from '@/components/ModuleWorkbook';
import type { WorkbookBlock, ReflectionEntry } from '@/lib/workbook';

type Portal = {
  churchName: string;
  participantFirstName: string;
  status: string;
  track: {
    name: string; description: string | null;
    milestoneLabel: string | null; workbookUrl: string | null;
    modules: { id: string; weekNumber: number; title: string; summary: string | null; kind: string; hasContent: boolean }[];
  };
  discipler: { name: string; email: string; phone: string | null; photoUrl: string | null } | null;
  cohort: { name: string; meetingDay: string | null; meetingTime: string | null } | null;
  progress: { moduleId: string; completedAt: string }[];
};

type DisciplerNote = { note: string; updatedAt: string; author: { name: string } | null } | null;

type ModuleData = { blocks: WorkbookBlock[]; reflections: ReflectionEntry[]; disciplerNote: DisciplerNote };

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

export default function TrackPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [moduleData, setModuleData] = useState<Record<string, ModuleData>>({});
  const [moduleLoading, setModuleLoading] = useState<string | null>(null);

  const fetchPortal = useCallback(async () => {
    const res = await fetch(`/api/track-portal/${token}`);
    if (res.ok) { const d = await res.json(); setPortal(d.portal); }
    else setNotFound(true);
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchPortal(); }, [fetchPortal]);

  const toggleWeek = async (moduleId: string) => {
    if (!portal || portal.status !== 'ACTIVE' || toggling) return;
    const done = portal.progress.some(p => p.moduleId === moduleId);
    setToggling(moduleId);
    const res = await fetch(`/api/track-portal/${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId, completed: !done }),
    });
    if (res.ok) {
      const d = await res.json();
      setPortal(prev => prev ? { ...prev, progress: d.progress } : prev);
    }
    setToggling(null);
  };

  const expandWeek = async (moduleId: string) => {
    if (expanded === moduleId) { setExpanded(null); return; }
    setExpanded(moduleId);
    if (!moduleData[moduleId]) {
      setModuleLoading(moduleId);
      const res = await fetch(`/api/track-portal/${token}/module/${moduleId}`);
      if (res.ok) {
        const d = await res.json();
        setModuleData(prev => ({
          ...prev,
          [moduleId]: {
            blocks: d.module?.content?.blocks || [],
            reflections: d.reflections || [],
            disciplerNote: d.disciplerNote || null,
          },
        }));
      }
      setModuleLoading(null);
    }
  };

  const saveReflection = async (moduleId: string, promptId: string, response: string) => {
    const res = await fetch(`/api/track-portal/${token}/module/${moduleId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptId, response }),
    });
    return res.ok;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <p className="text-church-400">Loading your journey…</p>
      </div>
    );
  }

  if (notFound || !portal) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-6">
        <div className="card max-w-md text-center py-10">
          <div className="text-4xl mb-3">🔗</div>
          <p className="font-semibold text-church-800 mb-1">This link is not valid</p>
          <p className="text-sm text-church-500">Please ask the person walking with you at church to send you a fresh link.</p>
        </div>
      </div>
    );
  }

  // Run 16 — Introduction/Appendix modules are content-only: no completion
  // circle, and they never count toward the N/weeks progress.
  const isCore = (m: { kind?: string }) => !m.kind || m.kind === 'CORE';
  const coreIds = new Set(portal.track.modules.filter(isCore).map(m => m.id));
  const total = coreIds.size;
  const doneCount = portal.progress.filter(p => coreIds.has(p.moduleId)).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount >= total;
  const isCompleted = portal.status === 'COMPLETED';
  const anyContent = portal.track.modules.some(m => m.hasContent);

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="bg-church-900 text-white px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-church-300 text-sm mb-1">✝️ {portal.churchName}</p>
          <h1 className="text-2xl font-bold font-serif">{portal.track.name}</h1>
          {portal.track.description && (
            <p className="text-church-200 text-sm mt-2">{portal.track.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Greeting + progress */}
        <div className="card">
          <h2 className="text-lg font-bold text-church-900 mb-1">
            {isCompleted ? `Congratulations, ${portal.participantFirstName}! 🎉` : `Welcome, ${portal.participantFirstName}! 👋`}
          </h2>
          <p className="text-sm text-church-500 mb-4">
            {isCompleted
              ? 'You have completed this journey. We are so proud of you and excited for what God is doing in your life.'
              : 'This is your personal journey page. Take each week at your own pace — you are not walking alone.'}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-church-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-church-700">{doneCount}/{total} weeks</span>
          </div>
          {allDone && !isCompleted && portal.track.milestoneLabel && (
            <div className="mt-4 text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-4 py-3">
              🏁 You finished every week! Next step: <span className="font-semibold">{portal.track.milestoneLabel}</span> — your discipler will share the details.
            </div>
          )}
        </div>

        {/* Discipler card */}
        {portal.discipler && (
          <div className="card">
            <p className="text-xs uppercase text-church-400 font-semibold mb-3">Walking with you</p>
            <div className="flex items-center gap-4">
              {portal.discipler.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portal.discipler.photoUrl} alt={portal.discipler.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-brand-200 flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {portal.discipler.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-church-900">{portal.discipler.name}</p>
                <p className="text-xs text-church-500">Your discipler — reach out any time</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {portal.discipler.phone && (
                <a href={`tel:${portal.discipler.phone}`} className="btn-secondary btn-sm flex-1 text-center">📞 Call</a>
              )}
              {portal.discipler.phone && (
                <a href={waLink(portal.discipler.phone)} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary btn-sm flex-1 text-center">💬 WhatsApp</a>
              )}
              {portal.discipler.email && (
                <a href={`mailto:${portal.discipler.email}`} className="btn-secondary btn-sm flex-1 text-center">✉️ Email</a>
              )}
            </div>
          </div>
        )}

        {/* Cohort */}
        {portal.cohort && (portal.cohort.meetingDay || portal.cohort.meetingTime) && (
          <div className="card flex items-center gap-3">
            <div className="text-2xl">🧑‍🤝‍🧑</div>
            <div>
              <p className="font-semibold text-church-900 text-sm">{portal.cohort.name}</p>
              <p className="text-xs text-church-500">
                Group discussion {portal.cohort.meetingDay ? `every ${portal.cohort.meetingDay}` : ''}
                {portal.cohort.meetingTime ? ` at ${portal.cohort.meetingTime}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Workbook */}
        {portal.track.workbookUrl && (
          <a href={portal.track.workbookUrl} target="_blank" rel="noopener noreferrer"
            className="card flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="text-2xl">📕</div>
            <div className="flex-1">
              <p className="font-semibold text-church-900 text-sm">Participant Workbook</p>
              <p className="text-xs text-church-500">Open the full workbook for this journey</p>
            </div>
            <span className="text-church-400">→</span>
          </a>
        )}

        {/* Weeks */}
        <div>
          <p className="text-xs uppercase text-church-400 font-semibold mb-3 px-1">Your weekly journey</p>
          <div className="space-y-2.5">
            {portal.track.modules.map(m => {
              const core = isCore(m);
              const done = core && portal.progress.some(p => p.moduleId === m.id);
              const busy = toggling === m.id;
              const isOpen = expanded === m.id;
              const data = moduleData[m.id];
              return (
                <div key={m.id}
                  className={`card transition-all ${done ? 'border-green-200 bg-green-50/50' : ''}`}>
                  <div
                    className={`flex items-center gap-4 ${m.hasContent ? 'cursor-pointer' : ''}`}
                    onClick={() => { if (m.hasContent) expandWeek(m.id); }}>
                    {core ? (
                      <button
                        onClick={ev => { ev.stopPropagation(); toggleWeek(m.id); }}
                        disabled={portal.status !== 'ACTIVE' || busy}
                        aria-label={done ? `Mark week ${m.weekNumber} as not complete` : `Mark week ${m.weekNumber} complete`}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${done ? 'bg-green-500 text-white' : 'bg-church-100 text-church-400'} ${portal.status === 'ACTIVE' ? 'hover:ring-2 hover:ring-green-200' : 'cursor-default'}`}>
                        {busy ? '…' : done ? '✓' : m.weekNumber}
                      </button>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-base flex-shrink-0">
                        {m.kind === 'INTRO' ? '📖' : '📋'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${done ? 'text-green-800' : 'text-church-900'}`}>
                        {core ? `Week ${m.weekNumber}: ${m.title}` : m.title}
                      </p>
                      {m.summary && <p className="text-xs text-church-500 mt-0.5">{m.summary}</p>}
                    </div>
                    {m.hasContent && (
                      <span className={`text-church-400 text-sm flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                    )}
                  </div>
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-church-100">
                      {moduleLoading === m.id || !data ? (
                        <p className="text-sm text-church-400 text-center py-6">Loading this week…</p>
                      ) : (
                        <>
                          <ModuleWorkbook
                            blocks={data.blocks}
                            reflections={data.reflections}
                            readOnly={portal.status !== 'ACTIVE'}
                            onSave={(promptId, response) => saveReflection(m.id, promptId, response)}
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
          {portal.status === 'ACTIVE' && (
            <p className="text-xs text-church-400 text-center mt-4">
              {anyContent
                ? 'Tap a week to open its content and write your reflections. Tap the circle to mark it complete. Your discipler can see your progress and cheer you on.'
                : 'Tap a week to mark it complete when you finish it. Your discipler can see your progress and cheer you on.'}
            </p>
          )}
        </div>

        {/* Milestone footer */}
        {portal.track.milestoneLabel && !allDone && (
          <div className="text-center text-sm text-church-500 py-4">
            🏁 This journey leads to: <span className="font-semibold text-church-700">{portal.track.milestoneLabel}</span>
          </div>
        )}
      </div>
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
