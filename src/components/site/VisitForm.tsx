'use client';

// Run 31 / Run 47 — "Plan a Visit" form. Posts to /api/visit, then confirms the
// visitor's email with a 6-digit code (OtpDialog). On verification the visit
// becomes a Guest through the existing intake pipeline (drip + new-guest alert)
// — no parallel plumbing. Phone + email are required (email carries the code).
// Honeypot writes nothing.
import { useState } from 'react';
import OtpDialog from '@/components/site/OtpDialog';

const INPUT =
  'w-full rounded-[10px] border border-site-claydk bg-white px-3.5 py-3 text-[15px] text-site-ink placeholder:text-site-soft/70 focus:border-site-brass focus:outline-none focus:ring-2 focus:ring-site-brass/30';
const LABEL = 'text-[13px] font-semibold text-site-umber';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function VisitForm() {
  const [f, setF] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    firstVisitDate: '',
    prayerRequest: '',
    website: '', // honeypot
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [verify, setVerify] = useState<{ id: string; email: string } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.website) {
      setStatus('done');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: f.firstName,
          lastName: f.lastName,
          phone: f.phone,
          email: f.email,
          firstVisitDate: f.firstVisitDate,
          prayerRequest: f.prayerRequest,
          website: '',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.error || 'Something went wrong. Please try again.');
      }
      if (d.requiresVerification && d.id) {
        setVerify({ id: d.id, email: f.email });
        setStatus('idle');
      } else {
        setStatus('done');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-[18px] border border-site-claydk bg-site-paper p-9 text-center">
        <p className="font-fraunces text-[24px] text-site-umber">We can’t wait to meet you.</p>
        <p className="mx-auto mt-3 max-w-[440px] text-[16px] text-site-soft">
          Thank you — someone from our team will reach out to say hello and answer any questions
          before you come. However you arrive, we’ll be looking for you.
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={submit} className="rounded-[18px] border border-site-claydk bg-site-paper p-9">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={LABEL} htmlFor="v-first">First name</label>
              <input id="v-first" className={INPUT} required value={f.firstName} onChange={set('firstName')} placeholder="What should we call you?" />
            </div>
            <div className="grid gap-1.5">
              <label className={LABEL} htmlFor="v-last">Last name</label>
              <input id="v-last" className={INPUT} required value={f.lastName} onChange={set('lastName')} placeholder="Your last name" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className={LABEL} htmlFor="v-phone">Phone <span className="font-normal text-site-soft">(so we can say hi)</span></label>
              <input id="v-phone" type="tel" className={INPUT} required value={f.phone} onChange={set('phone')} placeholder="(000) 000-0000" />
            </div>
            <div className="grid gap-1.5">
              <label className={LABEL} htmlFor="v-email">Email</label>
              <input id="v-email" type="email" className={INPUT} required value={f.email} onChange={set('email')} placeholder="you@email.com" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className={LABEL} htmlFor="v-date">Which Sunday are you planning to visit?</label>
            <input id="v-date" type="date" className={INPUT} required min={todayISO()} value={f.firstVisitDate} onChange={set('firstVisitDate')} />
          </div>
          <div className="grid gap-1.5">
            <label className={LABEL} htmlFor="v-note">Anything we should know? <span className="font-normal text-site-soft">(optional)</span></label>
            <textarea id="v-note" className={`${INPUT} min-h-[110px] resize-y`} value={f.prayerRequest} onChange={set('prayerRequest')} placeholder="Bringing kids, need directions, a question…" />
          </div>
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={set('website')} />
          {status === 'error' ? <p className="text-[14px] text-site-ember">{error}</p> : null}
          <button
            type="submit"
            disabled={status === 'sending'}
            className="inline-flex w-fit items-center gap-2 rounded-[40px] bg-site-ember px-6 py-[13px] text-[15px] font-semibold text-white transition-colors hover:bg-site-emberdk disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending…' : 'Tell us you’re coming'}
          </button>
        </div>
      </form>
      {verify ? (
        <OtpDialog
          id={verify.id}
          email={verify.email}
          onVerified={() => { setVerify(null); setStatus('done'); }}
          onClose={() => setVerify(null)}
        />
      ) : null}
    </>
  );
}
