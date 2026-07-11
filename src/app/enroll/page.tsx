'use client';

// Run 13/14 — public self-enrollment page for Become & Leaders Track.
// Shareable link: /enroll (no sign-in required). Flow: details -> 6-digit
// email verification code -> request becomes PENDING for admin review.

import { useState, useEffect } from 'react';

type Cohort = { id: string; name: string; meetingDay: string | null; meetingTime: string | null; startDate: string | null };
type Track = { id: string; slug: string; name: string; description: string | null; milestoneLabel: string | null; cohorts: Cohort[] };

const TRACK_ICONS: Record<string, string> = {
  'become': '🌱',
  'leaders-track': '🔥',
};

function cohortLabel(c: Cohort): string {
  const parts: string[] = [];
  if (c.meetingDay) parts.push(`${c.meetingDay}s`);
  if (c.meetingTime) parts.push(`at ${c.meetingTime}`);
  if (c.startDate) {
    const d = new Date(c.startDate);
    parts.push(`· starts ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
  }
  return parts.join(' ');
}

export default function EnrollPage() {
  const [churchName, setChurchName] = useState('Grace Life Center');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<'form' | 'verify' | 'done'>('form');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const [trackId, setTrackId] = useState<string | null>(null);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/enroll/options')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setChurchName(d.churchName); setTracks(d.tracks || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const selectedTrack = tracks.find(t => t.id === trackId) || null;

  const pickTrack = (id: string) => {
    setTrackId(id);
    setCohortId(null);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!trackId) { setError('Please choose a track.'); return; }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Please fill in your first name, last name, and email.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId,
        cohortId: cohortId || null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.requiresVerification) {
      setRequestId(d.requestId);
      setCode('');
      setStep('verify');
      setResendIn(60);
    } else {
      setError(d.error || 'Something went wrong — please try again.');
    }
    setSubmitting(false);
  };

  const handleVerify = async () => {
    if (!requestId) return;
    setError('');
    if (!/^[0-9]{6}$/.test(code.trim())) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/enroll/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, code: code.trim() }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setStep('done');
    } else {
      setError(d.error || 'Verification failed — please try again.');
    }
    setSubmitting(false);
  };

  const handleResend = async () => {
    if (!requestId || resendIn > 0 || submitting) return;
    setError('');
    setSubmitting(true);
    const res = await fetch('/api/enroll/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setResendIn(60);
      setCode('');
    } else {
      setError(d.error || 'Could not resend the code — please try again.');
    }
    setSubmitting(false);
  };

  const header = (
    <div className="bg-church-900 text-white px-6 py-8">
      <div className="max-w-xl mx-auto">
        <p className="text-church-300 text-sm mb-1">✝️ {churchName}</p>
        <h1 className="text-2xl font-bold font-serif">Join a Track</h1>
        {step === 'form' && (
          <p className="text-church-200 text-sm mt-2">
            Formation journeys — building a certain kind of person through consistent following of Jesus.
          </p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <p className="text-church-400">Loading…</p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-warm-50">
        {header}
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-lg font-bold text-church-900 mb-2">Your request has been received!</h2>
            <p className="text-sm text-church-600 max-w-sm mx-auto">
              Your email is verified and a leader will review your request shortly. Once you are
              approved, we will send an email to{' '}
              <span className="font-semibold">{email.trim()}</span> with everything you need to begin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-warm-50">
        {header}
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
          <div className="card py-8 px-6 text-center">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="text-lg font-bold text-church-900 mb-2">Check your email</h2>
            <p className="text-sm text-church-600 max-w-sm mx-auto mb-5">
              We sent a 6-digit code to <span className="font-semibold">{email.trim()}</span>.
              Enter it below to confirm your email address.
            </p>
            <input
              className="input-field w-48 mx-auto text-center text-2xl tracking-[0.4em] font-bold"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="······"
              value={code}
              onChange={ev => setCode(ev.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={ev => { if (ev.key === 'Enter') handleVerify(); }}
            />
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-4 text-left">
                {error}
              </div>
            )}
            <button onClick={handleVerify} disabled={submitting || code.length !== 6}
              className="btn-primary w-full mt-5">
              {submitting ? 'Checking…' : 'Verify & Submit Request'}
            </button>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm">
              <button onClick={handleResend} disabled={resendIn > 0 || submitting}
                className={resendIn > 0 ? 'text-church-300' : 'text-brand-600 hover:underline'}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
              <span className="text-church-200">|</span>
              <button onClick={() => { setStep('form'); setError(''); }}
                className="text-brand-600 hover:underline">
                Edit my details
              </button>
            </div>
            <p className="text-xs text-church-400 mt-4">
              The code expires in 10 minutes. Check your spam folder if you cannot find it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {header}

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* 1. Track */}
        <div>
          <p className="text-xs uppercase text-church-400 font-semibold mb-3 px-1">1. Choose your track</p>
          <div className="space-y-2.5">
            {tracks.map(t => (
              <button key={t.id} onClick={() => pickTrack(t.id)}
                className={`card w-full text-left flex items-start gap-4 transition-all hover:shadow-md ${trackId === t.id ? 'border-brand-400 ring-2 ring-brand-200' : ''}`}>
                <div className="text-2xl">{TRACK_ICONS[t.slug] || '📖'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-church-900">{t.name}</p>
                  {t.description && <p className="text-xs text-church-500 mt-0.5">{t.description}</p>}
                  {t.milestoneLabel && (
                    <p className="text-xs text-brand-600 mt-1">🏁 Leads to: {t.milestoneLabel}</p>
                  )}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 ${trackId === t.id ? 'bg-brand-500 border-brand-500' : 'border-church-300'}`} />
              </button>
            ))}
            {tracks.length === 0 && (
              <div className="card text-center py-8 text-sm text-church-500">
                Self-enrollment is not open right now — please speak with a leader at church.
              </div>
            )}
          </div>
        </div>

        {/* 2. Cohort */}
        {selectedTrack && selectedTrack.cohorts.length > 0 && (
          <div>
            <p className="text-xs uppercase text-church-400 font-semibold mb-3 px-1">2. Choose a group (optional)</p>
            <div className="space-y-2">
              {selectedTrack.cohorts.map(c => (
                <button key={c.id} onClick={() => setCohortId(cohortId === c.id ? null : c.id)}
                  className={`card w-full text-left flex items-center gap-3 py-3 transition-all hover:shadow-sm ${cohortId === c.id ? 'border-brand-400 ring-2 ring-brand-200' : ''}`}>
                  <div className="text-xl">🧑‍🤝‍🧑</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-church-900 text-sm">{c.name}</p>
                    {cohortLabel(c) && <p className="text-xs text-church-500 mt-0.5">{cohortLabel(c)}</p>}
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${cohortId === c.id ? 'bg-brand-500 border-brand-500' : 'border-church-300'}`} />
                </button>
              ))}
              <p className="text-xs text-church-400 px-1">
                Not sure which group? Leave this blank — a leader will place you.
              </p>
            </div>
          </div>
        )}

        {/* 3. Details */}
        {selectedTrack && (
          <div>
            <p className="text-xs uppercase text-church-400 font-semibold mb-3 px-1">
              {selectedTrack.cohorts.length > 0 ? '3' : '2'}. Your details
            </p>
            <div className="card space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className="input-field" placeholder="First name *" value={firstName}
                  onChange={ev => setFirstName(ev.target.value)} />
                <input className="input-field" placeholder="Last name *" value={lastName}
                  onChange={ev => setLastName(ev.target.value)} />
              </div>
              <input className="input-field w-full" type="email" placeholder="Email *" value={email}
                onChange={ev => setEmail(ev.target.value)} />
              <input className="input-field w-full" type="tel" placeholder="Phone (for WhatsApp updates)" value={phone}
                onChange={ev => setPhone(ev.target.value)} />
              <p className="text-xs text-church-400">
                Already part of {churchName}? Use the same email you use with us and we will connect your enrollment to your account.
              </p>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Sending…' : 'Request Enrollment'}
              </button>
              <p className="text-xs text-church-400 text-center">
                We will email you a 6-digit code to confirm your address — then a leader reviews your request.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
