'use client';

// Run 59 — Ask a Question: the moderation queue a leader keeps open on a
// phone/tablet during service. Polls every 4s so new questions appear without
// a manual refresh; tap to mark Answered or Dismiss. Includes a QR code for
// the public /ask page so it can be screenshotted/printed for the slide.
import { useState, useEffect, useCallback, useRef } from 'react';

type Question = {
  id: string;
  text: string;
  sermonDate: string | null;
  status: 'NEW' | 'ANSWERED' | 'DISMISSED';
  createdAt: string;
};

const DEFAULT_ASK_URL = 'https://harvest.gracelifecenter.com/ask';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`;
}

export default function SermonQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [counts, setCounts] = useState({ NEW: 0, ANSWERED: 0, DISMISSED: 0 });
  const [dateMode, setDateMode] = useState<'today' | 'all'>('today');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [askUrl, setAskUrl] = useState(DEFAULT_ASK_URL);
  const [showQr, setShowQr] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy link');
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    try {
      const qs = dateMode === 'all' ? '?date=all' : '';
      const res = await fetch(`/api/sermon-questions${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setQuestions(data.questions || []);
      setCounts(data.counts || { NEW: 0, ANSWERED: 0, DISMISSED: 0 });
    } catch {
      // fire-safe -- next poll will retry
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [dateMode]);

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  async function setStatus(id: string, status: 'ANSWERED' | 'DISMISSED' | 'NEW') {
    setBusyId(id);
    // Optimistic update so the tap feels instant.
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
    try {
      await fetch(`/api/sermon-questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } finally {
      setBusyId(null);
      load();
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(askUrl).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy link'), 1500);
    });
  }

  const newQs = questions.filter((q) => q.status === 'NEW');
  const doneQs = questions.filter((q) => q.status !== 'NEW');
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&ecc=H&color=102a43&bgcolor=ffffff&data=${encodeURIComponent(askUrl)}`;

  return (
    <div className="mx-auto max-w-[720px] px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-church-900">Ask a Question</h1>
          <p className="text-[14px] text-gray-500">Live questions from today&rsquo;s service</p>
        </div>
        <button
          onClick={() => setShowQr((v) => !v)}
          className="shrink-0 rounded-lg border border-church-200 bg-white px-3 py-2 text-[13px] font-semibold text-church-700 active:bg-church-50"
        >
          {showQr ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      {showQr && (
        <div className="mb-5 rounded-xl border border-church-200 bg-white p-4">
          <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-gray-500">
            QR code target
          </label>
          <div className="mb-3 flex gap-2">
            <input
              value={askUrl}
              onChange={(e) => setAskUrl(e.target.value)}
              className="flex-1 rounded-lg border border-church-200 px-3 py-2 text-[14px]"
            />
            <button
              onClick={copyLink}
              className="shrink-0 rounded-lg border border-church-200 px-3 py-2 text-[13px] font-semibold text-church-700 active:bg-church-50"
            >
              {copyLabel}
            </button>
          </div>
          <p className="mb-3 text-[12.5px] text-gray-500">
            Defaults to harvest.gracelifecenter.com/ask. Once ask.gracelifecenter.com is attached
            in Vercel + DNS, swap it in here and screenshot the code below for the slide.
          </p>
          <img src={qrApiUrl} alt="QR code for the Ask a Question page" width={200} height={200} className="rounded-lg border border-church-100" />
        </div>
      )}

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setDateMode('today')}
          className={`rounded-full px-4 py-1.5 text-[13.5px] font-semibold ${dateMode === 'today' ? 'bg-brand-500 text-white' : 'border border-church-200 text-church-600'}`}
        >
          Today
        </button>
        <button
          onClick={() => setDateMode('all')}
          className={`rounded-full px-4 py-1.5 text-[13.5px] font-semibold ${dateMode === 'all' ? 'bg-brand-500 text-white' : 'border border-church-200 text-church-600'}`}
        >
          All dates
        </button>
        <div className="ml-auto self-center text-[13px] text-gray-500">
          {counts.NEW} new &middot; {counts.ANSWERED} answered &middot; {counts.DISMISSED} dismissed
        </div>
      </div>

      {loading && firstLoad.current ? (
        <p className="text-[14px] text-gray-400">Loading...</p>
      ) : newQs.length === 0 && doneQs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-church-200 p-8 text-center text-[14.5px] text-gray-400">
          No questions yet. Show the QR code and they&rsquo;ll appear here live.
        </div>
      ) : (
        <>
          {newQs.length > 0 && (
            <div className="mb-6 space-y-3">
              {newQs.map((q) => (
                <div key={q.id} className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <p className="mb-2.5 whitespace-pre-wrap text-[16px] leading-snug text-church-900">{q.text}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-gray-500">{timeAgo(q.createdAt)}</span>
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === q.id}
                        onClick={() => setStatus(q.id, 'ANSWERED')}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-semibold text-white active:bg-emerald-700 disabled:opacity-50"
                      >
                        ✅ Answered
                      </button>
                      <button
                        disabled={busyId === q.id}
                        onClick={() => setStatus(q.id, 'DISMISSED')}
                        className="rounded-lg border border-church-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-church-600 active:bg-church-50 disabled:opacity-50"
                      >
                        ✖ Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {doneQs.length > 0 && (
            <details className="rounded-xl border border-church-100">
              <summary className="cursor-pointer px-4 py-3 text-[13.5px] font-semibold text-gray-500">
                {doneQs.length} answered / dismissed
              </summary>
              <div className="space-y-2 px-4 pb-4">
                {doneQs.map((q) => (
                  <div key={q.id} className="flex items-start justify-between gap-3 border-t border-church-100 pt-2.5 first:border-t-0 first:pt-0">
                    <p className={`text-[14px] leading-snug ${q.status === 'DISMISSED' ? 'text-gray-400 line-through' : 'text-church-700'}`}>
                      {q.text}
                    </p>
                    <button
                      onClick={() => setStatus(q.id, 'NEW')}
                      className="shrink-0 text-[12px] font-semibold text-brand-600 active:text-brand-700"
                    >
                      Reopen
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
