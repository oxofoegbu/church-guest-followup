'use client';

import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';

interface DripStep {
  id: string;
  templateName: string;
  dayOffset: number;
  channel: 'EMAIL' | 'WHATSAPP';
  scheduledFor: string;
  sentAt: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  errorMessage: string | null;
}

interface DripState {
  enabled: boolean;
  pausedAt: string | null;
  steps: DripStep[];
}

interface Props {
  guestId: string;
  canEdit: boolean;
  refreshToken?: number;
  onRescheduleOpen?: (stepId: string, currentScheduledFor: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-church-100 text-church-600',
  SENT: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  SKIPPED: 'bg-amber-100 text-amber-700',
};

export default function GuestDripPanel({ guestId, canEdit, refreshToken = 0, onRescheduleOpen }: Props) {
  const [state, setState] = useState<DripState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchState = async () => {
    const res = await fetch(`/api/guests/${guestId}/drip`);
    if (res.ok) {
      const data = await res.json();
      setState(data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchState(); }, [guestId, refreshToken]);

  const act = async (path: string) => {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/guests/${guestId}/drip/${path}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Action failed');
    }
    await fetchState();
    setBusy(false);
  };

  const skipStep = async (stepId: string) => {
    if (!confirm('Skip this drip step? It will not be sent.')) return;
    setBusy(true);
    const res = await fetch(`/api/guests/${guestId}/drip/steps/${stepId}/skip`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Skip failed');
    }
    await fetchState();
    setBusy(false);
    setOpenMenu(null);
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="section-header mb-2">💧 Drip Campaign</h2>
        <p className="text-sm text-church-400">Loading...</p>
      </div>
    );
  }

  if (!state) return null;

  const paused = !!state.pausedAt;
  const statusBadge = !state.enabled
    ? <span className="badge bg-stone-100 text-stone-600">DISABLED</span>
    : paused
      ? <span className="badge bg-amber-100 text-amber-700">PAUSED</span>
      : <span className="badge bg-emerald-100 text-emerald-700">ENABLED</span>;

  const isEmpty = state.steps.length === 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="section-header">💧 Drip Campaign</h2>
          {statusBadge}
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            {state.enabled ? (
              <>
                {paused ? (
                  <button disabled={busy} onClick={() => act('resume')} className="btn-secondary btn-sm">▶ Resume</button>
                ) : (
                  <button disabled={busy} onClick={() => act('pause')} className="btn-secondary btn-sm">⏸ Pause</button>
                )}
                <button disabled={busy} onClick={() => act('disable')} className="btn-secondary btn-sm text-red-600">Disable</button>
              </>
            ) : (
              <button disabled={busy} onClick={() => act('enable')} className="btn-primary btn-sm">Enable drip campaign</button>
            )}
          </div>
        )}
      </div>

      {!state.enabled && isEmpty && canEdit && (
        <div className="text-center py-6">
          <p className="text-sm text-church-500 mb-3">No drip campaign scheduled for this guest yet.</p>
        </div>
      )}

      {state.enabled && isEmpty && (
        <p className="text-sm text-church-400 italic">
          No drip steps scheduled. This guest&apos;s first visit date may be too far in the past, so all scheduled steps are already missed. Disable + re-enable after a template change to re-evaluate.
        </p>
      )}

      {!isEmpty && (
        <div className="space-y-2">
          {state.steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-church-50">
              <div className="text-xs font-semibold text-church-500 w-14 shrink-0 mt-1">Day {step.dayOffset}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{step.templateName}</span>
                  <span className="badge text-[10px] bg-church-100 text-church-600">
                    {step.channel === 'EMAIL' ? '📧 EMAIL' : '💬 WHATSAPP'}
                  </span>
                  <span className={`badge text-[10px] ${STATUS_STYLES[step.status] || 'bg-church-100 text-church-600'}`}>{step.status}</span>
                </div>
                <div className="text-xs text-church-500 mt-1">
                  {step.status === 'SENT' && step.sentAt
                    ? `Sent ${formatDateTime(step.sentAt)}`
                    : `Scheduled ${formatDateTime(step.scheduledFor)}`}
                </div>
                {step.errorMessage && (
                  <div className="text-xs text-red-600 mt-1 italic">{step.errorMessage}</div>
                )}
              </div>
              {canEdit && step.status === 'PENDING' && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === step.id ? null : step.id)}
                    className="text-church-400 hover:text-church-700 px-2 py-1 text-lg leading-none"
                    aria-label="Step actions">
                    ⋮
                  </button>
                  {openMenu === step.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-8 z-20 bg-white border border-church-200 rounded-lg shadow-lg min-w-[140px] py-1">
                        <button
                          onClick={() => { setOpenMenu(null); onRescheduleOpen?.(step.id, step.scheduledFor); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-church-50">
                          Reschedule...
                        </button>
                        <button
                          onClick={() => skipStep(step.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-church-50 text-amber-700">
                          Skip
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
