'use client';

// Run 59 — Ask a Question. The page behind the QR code shown during
// service: no login, no name/email/phone -- just a question and a Send
// button. Deliberately standalone (not the (site) route group's marketing
// chrome) so it loads fast and stays distraction-free on a phone mid-sermon.
import { useState } from 'react';

const MAX_LEN = 500;

export default function AskPage() {
  const [text, setText] = useState('');
  const [website, setWebsite] = useState(''); // honeypot -- real visitors never see this field
  const [status, setStatus] = useState<'form' | 'sending' | 'sent' | 'error'>('form');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/sermon-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Something went wrong -- please try again.');
        setStatus('error');
        return;
      }
      setStatus('sent');
    } catch {
      setError('Something went wrong -- please try again.');
      setStatus('error');
    }
  }

  function askAnother() {
    setText('');
    setStatus('form');
    setError('');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-church-950 px-5 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-7 text-center">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-400">
            Grace Life Center
          </p>
          <h1 className="text-[26px] font-bold leading-tight text-white">
            Ask a question
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-church-300">
            Completely anonymous. We&rsquo;ll take some of these at the end of the message.
          </p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-2xl border border-church-700 bg-church-900 p-7 text-center">
            <p className="mb-1 text-[40px]">🙏</p>
            <p className="mb-1 text-[18px] font-semibold text-white">Sent</p>
            <p className="mb-6 text-[14.5px] text-church-300">
              Your question was received. Thanks for asking.
            </p>
            <button
              onClick={askAnother}
              className="w-full rounded-xl border border-church-600 bg-transparent px-5 py-3.5 text-[15px] font-semibold text-white active:bg-church-800"
            >
              Ask another question
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-church-700 bg-church-900 p-5">
            {/* Honeypot -- hidden from real people via CSS, not display:none (some bots skip those) */}
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              aria-hidden="true"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              placeholder="Type your question here..."
              rows={5}
              autoFocus
              className="w-full resize-none rounded-xl border border-church-600 bg-church-950 px-4 py-3.5 text-[16px] text-white placeholder-church-400 outline-none focus:border-brand-400"
            />
            <div className="mt-1.5 text-right text-[12px] text-church-400">
              {text.length}/{MAX_LEN}
            </div>
            {error && (
              <p className="mt-1 text-[13.5px] text-rose-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={!text.trim() || status === 'sending'}
              className="mt-3 w-full rounded-xl bg-brand-500 px-5 py-3.5 text-[16px] font-semibold text-white active:bg-brand-600 disabled:opacity-40"
            >
              {status === 'sending' ? 'Sending...' : 'Send question'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
