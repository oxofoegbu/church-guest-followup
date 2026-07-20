'use client';

// Run 19 — the public Welcome Track landing page ("Begin the Journey").
// A warm front door, deliberately separate from /enroll: an invitation, not
// a form. Built from the "Begin the Journey" design brief — warm cream +
// midnight navy + sparing gold, literary serif headings, generous space,
// no hype, no urgency, no churchy kitsch. Flow: gentle scroll -> short form
// -> email code (shared /api/enroll/verify + /resend machinery) -> a warm,
// human confirmation. Enrollment itself happens when an admin approves the
// request (and assigns a discipler) in the queue.

import { useState, useEffect, useRef } from 'react';
import { EB_Garamond, Lato } from 'next/font/google';
import StandaloneNav from '@/components/site/StandaloneNav';

const garamond = EB_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], display: 'swap' });

// The palette from the design brief (echoes the printed workbook)
const C = {
  cream: '#FBF7EF',
  midnight: '#16233B',
  navy: '#1F3A5F',
  ink: '#2A2622',
  gold: '#B0894F',
  sand: '#E7DECB',
  teal: '#28565A',
};

type Cohort = { id: string; name: string; meetingDay: string | null; meetingTime: string | null; startDate: string | null };

const AUDIENCES = [
  { code: 'FIRST_TIME', label: "This is my first time — I'm new here" },
  { code: 'RETURNING', label: "I'm coming back after a while" },
  { code: 'MEMBER', label: "I'm a member wanting to re-anchor" },
  { code: 'EXPLORING', label: "I'm just exploring — not sure yet" },
];

const MOVEMENTS = [
  { n: '1', title: 'Who we are', line: 'Meet our church family, and the heart behind it — a people gathered around Jesus at the center.' },
  { n: '2', title: 'Why Jesus', line: 'Who He is, what He’s like, and why we’ve built everything around Him.' },
  { n: '3', title: 'What it means to follow Him', line: 'A direction, not a finish line — what following Jesus actually looks like day to day.' },
  { n: '4', title: 'Walking it out together', line: 'How we help each other along — nobody walks this road alone.' },
  { n: '5', title: 'Your invitation', line: 'An open door, and time to consider it. No pressure — just an honest yes, whenever you’re ready.' },
];

const FAQS = [
  {
    q: 'Do I have to believe already?',
    a: 'No. Belonging comes first here — it’s the safe place where faith can grow. Bring your questions and doubts with you; they’re welcome in the room.',
  },
  {
    q: 'What will it cost?',
    a: 'Nothing. There’s no fee, no catch, and nothing to buy. The Welcome Track is simply our way of opening the door.',
  },
  {
    q: 'What if I’ve been hurt by church before?',
    a: 'We’re so sorry — and we understand if trust comes slowly. Come at your own pace. You won’t be pushed, cornered, or put on the spot. Ever.',
  },
  {
    q: 'Do I have to join anything?',
    a: 'No. The Welcome Track ends with an invitation, not an obligation. Come and see — what you do with it is entirely yours to decide.',
  },
  {
    q: 'What’s a discipler, exactly?',
    a: 'A friend a step or two ahead on the journey — not a teacher, not a boss, just company for the road. They walk with you through the Welcome Track, answer questions, and pray with you. Whether you’d like one is entirely your call, and you can say so (or change your mind) on the sign-up form below.',
  },
];

function cohortLabel(c: Cohort): string {
  const parts: string[] = [c.name];
  const meet: string[] = [];
  if (c.meetingDay) meet.push(`${c.meetingDay}s`);
  if (c.meetingTime) meet.push(`at ${c.meetingTime}`);
  if (c.startDate) {
    const d = new Date(c.startDate);
    meet.push(`· starts ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}`);
  }
  if (meet.length) parts.push(`— ${meet.join(' ')}`);
  return parts.join(' ');
}

export default function BeginPage() {
  const [churchName, setChurchName] = useState('Grace Life Center');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [open, setOpen] = useState(true);

  const [step, setStep] = useState<'form' | 'verify' | 'done'>('form');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [audience, setAudience] = useState<string | null>(null);
  const [cohortId, setCohortId] = useState<string>('');
  const [shareNote, setShareNote] = useState('');
  const [honeypot, setHoneypot] = useState('');
  // Run 60 -- optional discipler preference
  const [disciplerPreference, setDisciplerPreference] = useState<string | null>(null);
  const [requestedDisciplerName, setRequestedDisciplerName] = useState('');
  const [requestedDisciplerContact, setRequestedDisciplerContact] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/begin/options')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        if (d.churchName) setChurchName(d.churchName);
        setCohorts(d.track?.cohorts || []);
        setOpen(!!d.track);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, email, phone,
          audience: audience || null,
          cohortId: cohortId || null,
          shareNote,
          disciplerPreference,
          requestedDisciplerName: disciplerPreference === 'REQUEST_SPECIFIC' ? requestedDisciplerName : '',
          requestedDisciplerContact: disciplerPreference === 'REQUEST_SPECIFIC' ? requestedDisciplerContact : '',
          website: honeypot,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || 'Hmm — something didn’t go through. Mind trying once more?');
      } else {
        setRequestId(d.requestId);
        setStep('verify');
        setResendIn(60);
        setCode('');
      }
    } catch {
      setError('Hmm — something didn’t go through. Mind trying once more?');
    }
    setSubmitting(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !requestId) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/enroll/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, code }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error || 'That code didn’t match — mind trying again?');
      else setStep('done');
    } catch {
      setError('Hmm — something didn’t go through. Mind trying once more?');
    }
    setSubmitting(false);
  };

  const resend = async () => {
    if (resendIn > 0 || !requestId) return;
    setError('');
    const res = await fetch('/api/enroll/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error || 'We couldn’t resend just now — give it a moment and try again.');
    else setResendIn(60);
  };

  const input =
    'w-full rounded-lg border bg-white px-4 py-3 text-base outline-none transition-colors focus:border-[#B0894F]';
  const inputStyle = { borderColor: C.sand, color: C.ink } as React.CSSProperties;
  const label = 'block text-sm font-bold mb-1.5';

  return (
    <div className={lato.className} style={{ background: C.cream, color: C.ink, minHeight: '100vh' }}>
      <StandaloneNav serifClass={garamond.className} />
      {/* ---- A. Hero — the invitation ---- */}
      <header
        className="relative overflow-hidden px-6 py-24 sm:py-32 text-center"
        style={{ background: C.midnight }}
      >
        {/* the well of light — a quiet radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse 70% 55% at 50% 42%, rgba(176,137,79,0.28), rgba(176,137,79,0.07) 55%, transparent 75%)` }}
        />
        <div className="relative mx-auto max-w-2xl">
          <p className="text-xs sm:text-sm tracking-[0.25em] uppercase mb-8" style={{ color: C.gold }}>
            {churchName}
          </p>
          <h1
            className={`${garamond.className} text-4xl sm:text-5xl leading-tight`}
            style={{ color: C.cream }}
          >
            A place to begin — with Jesus, and with us.
          </h1>
          <p className="mt-6 text-base sm:text-lg leading-relaxed" style={{ color: '#D9E2EC' }}>
            Wherever your heart is facing today, you’re welcome here. The Welcome Track is a
            short, unhurried journey into who Jesus is and who you’re becoming. Come and see.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <button
              onClick={() => scrollTo(formRef)}
              className="rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90"
              style={{ background: C.gold, color: C.midnight }}
            >
              Save my place
            </button>
            <button
              onClick={() => scrollTo(aboutRef)}
              className="text-sm underline underline-offset-4 opacity-80 hover:opacity-100"
              style={{ color: '#D9E2EC' }}
            >
              What is this?
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6">
        {/* ---- B. You're welcome here ---- */}
        <section className="py-16 sm:py-20 text-center">
          <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.navy }}>
            You’re welcome here
          </h2>
          <p className="text-lg leading-relaxed">
            You don’t have to believe first. You don’t have to have your life sorted, your
            questions answered, or the right words. Belonging comes first here — it’s the safe
            place where faith can grow. Bring your doubts, your story, and your real self.
            That’s exactly who we’re expecting.
          </p>
        </section>

        <hr style={{ borderColor: C.sand }} />

        {/* ---- C. What the Welcome Track is ---- */}
        <section ref={aboutRef} className="py-16 sm:py-20 scroll-mt-6">
          <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.navy }}>
            What the Welcome Track is
          </h2>
          <p className="text-center leading-relaxed mb-10">
            Five unhurried conversations, at your pace. No pressure, no performance —
            just an honest look, and an open door.
          </p>
          <ol className="space-y-4">
            {MOVEMENTS.map(m => (
              <li
                key={m.n}
                className="flex gap-4 rounded-xl border bg-white p-5"
                style={{ borderColor: C.sand }}
              >
                <span
                  className={`${garamond.className} flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg`}
                  style={{ border: `1px solid ${C.gold}`, color: C.gold }}
                  aria-hidden="true"
                >
                  {m.n}
                </span>
                <div>
                  <h3 className="font-bold" style={{ color: C.navy }}>{m.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: '#4b463f' }}>{m.line}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- D. What it's really about (the heart) ---- */}
      </div>

      {/* ---- The Well — a wordless breather (Run 60) ---- */}
      <div style={{ height: 'min(56vw, 440px)', minHeight: 260, overflow: 'hidden' }}>
        <img
          src="/begin/well-breather.webp"
          srcSet="/begin/well-breather.webp 1672w, /begin/well-breather-800.webp 800w"
          sizes="100vw"
          alt=""
          aria-hidden="true"
          width={1672}
          height={941}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 58%', display: 'block' }}
        />
      </div>

      <section className="px-6 py-16 sm:py-20" style={{ background: C.midnight }}>
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${garamond.className} text-2xl sm:text-[1.7rem] italic leading-relaxed`} style={{ color: C.cream }}>
            We’ve come to believe that following Jesus isn’t about trying harder to be good.
            It’s about learning to be <span style={{ color: C.gold }}>with</span> Him — and letting Him
            slowly form His own life in us, from the inside.
          </p>
          <p className="mt-6 leading-relaxed" style={{ color: '#D9E2EC' }}>
            Not to escape the world someday, but to carry a little of heaven into it now — our
            homes, our work, our streets. We’re a well, not a fence: a people gathered around
            Jesus at the center, not guards at a gate. What matters isn’t where you’re standing,
            but which way your heart is facing. That’s the journey. We’d love to walk it with you.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-2xl px-6">

        {/* ---- E. What to expect ---- */}
        <section className="py-16 sm:py-20">
          <h2 className={`${garamond.className} text-3xl mb-6 text-center`} style={{ color: C.navy }}>
            What to expect
          </h2>
          <ul className="mx-auto max-w-lg space-y-3 text-base leading-relaxed">
            {[
              'It’s unhurried — five short modules, taken at a human pace.',
              'It’s a real conversation, not a lecture. Questions and doubts are welcome.',
              'There’s no cost and no catch.',
              'There’s no pressure to join anything. Just come and see.',
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden="true" style={{ color: C.gold }}>•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <hr style={{ borderColor: C.sand }} />

        {/* ---- F. The invitation + form ---- */}
        <section ref={formRef} className="py-16 sm:py-20 scroll-mt-6">
          {step === 'done' ? (
            <div className="text-center py-8">
              <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.navy }}>
                Thank you — we’re so glad you’re coming.
              </h2>
              <p className="text-lg leading-relaxed">
                A real person from {churchName} will reach out to you soon with the details.
                There’s nothing you need to prepare and nothing you need to be.
                Just come as you are. We’ll be looking for you.
              </p>
            </div>
          ) : step === 'verify' ? (
            <div className="mx-auto max-w-md">
              <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.navy }}>
                One small thing
              </h2>
              <p className="text-center leading-relaxed mb-8">
                We’ve sent a 6-digit code to <strong>{email}</strong> — just so we know how to
                reach you. Type it below and your place is saved.
              </p>
              <form onSubmit={verify} noValidate>
                <label htmlFor="begin-code" className="sr-only">6-digit code from your email</label>
                <input
                  id="begin-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  className={`${input} text-center text-2xl tracking-[0.5em]`}
                  style={inputStyle}
                  placeholder="••••••"
                />
                {error && <p role="alert" className="mt-3 text-sm" style={{ color: '#9b3535' }}>{error}</p>}
                <button
                  type="submit"
                  disabled={submitting || code.length !== 6}
                  className="mt-5 w-full rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: C.navy, color: C.cream }}
                >
                  {submitting ? 'One moment…' : 'Save my place'}
                </button>
              </form>
              <div className="mt-5 flex items-center justify-between text-sm">
                <button onClick={() => { setStep('form'); setError(''); }} className="underline underline-offset-4" style={{ color: C.navy }}>
                  Edit my details
                </button>
                <button onClick={resend} disabled={resendIn > 0} className="underline underline-offset-4 disabled:no-underline disabled:opacity-60" style={{ color: C.navy }}>
                  {resendIn > 0 ? `Resend code (${resendIn}s)` : 'Resend code'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-md">
              <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.navy }}>
                If your heart is even a little bit open, that’s enough to begin.
              </h2>
              <p className="text-center leading-relaxed mb-8">
                Tell us where to find you, and we’ll take it from there.
              </p>
              {!open && (
                <p className="mb-6 rounded-lg border bg-white p-4 text-sm leading-relaxed" style={{ borderColor: C.sand }}>
                  Sign-ups are briefly paused — but you’re still very welcome. Come say hello on a
                  Sunday, or reach out and we’ll help you begin.
                </p>
              )}
              <form onSubmit={submit} noValidate>
                {/* honeypot — visually hidden from humans, tempting to bots */}
                <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
                  <label htmlFor="begin-website">Website</label>
                  <input id="begin-website" type="text" tabIndex={-1} autoComplete="off"
                    value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="begin-first" className={label} style={{ color: C.navy }}>First name</label>
                      <input id="begin-first" required value={firstName} onChange={e => setFirstName(e.target.value)}
                        className={input} style={inputStyle} placeholder="What should we call you?" autoComplete="given-name" />
                    </div>
                    <div>
                      <label htmlFor="begin-last" className={label} style={{ color: C.navy }}>
                        Last name <span className="font-normal opacity-60">(optional)</span>
                      </label>
                      <input id="begin-last" value={lastName} onChange={e => setLastName(e.target.value)}
                        className={input} style={inputStyle} autoComplete="family-name" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="begin-email" className={label} style={{ color: C.navy }}>Email</label>
                    <input id="begin-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className={input} style={inputStyle} placeholder="Where can we reach you?" autoComplete="email" />
                  </div>
                  <div>
                    <label htmlFor="begin-phone" className={label} style={{ color: C.navy }}>
                      Phone <span className="font-normal opacity-60">(optional)</span>
                    </label>
                    <input id="begin-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className={input} style={inputStyle} placeholder="Only if you’d like a personal text or call" autoComplete="tel" />
                  </div>

                  <fieldset>
                    <legend className={label} style={{ color: C.navy }}>
                      Which best describes you? <span className="font-normal opacity-60">(optional)</span>
                    </legend>
                    <div className="space-y-2">
                      {AUDIENCES.map(a => (
                        <label key={a.code}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm transition-colors"
                          style={{ borderColor: audience === a.code ? C.gold : C.sand }}
                        >
                          <input type="radio" name="audience" value={a.code}
                            checked={audience === a.code}
                            onChange={() => setAudience(audience === a.code ? null : a.code)}
                            onClick={() => { if (audience === a.code) setAudience(null); }}
                            className="accent-[#B0894F]" />
                          <span>{a.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {cohorts.length > 0 && (
                    <div>
                      <label htmlFor="begin-cohort" className={label} style={{ color: C.navy }}>
                        When would you like to begin?
                      </label>
                      <select id="begin-cohort" value={cohortId} onChange={e => setCohortId(e.target.value)}
                        className={input} style={inputStyle}>
                        <option value="">Just tell me when the next one starts</option>
                        {cohorts.map(c => (
                          <option key={c.id} value={c.id}>{cohortLabel(c)}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="begin-share" className={label} style={{ color: C.navy }}>
                      Anything you’d like us to know — or pray about? <span className="font-normal opacity-60">(optional)</span>
                    </label>
                    <textarea id="begin-share" rows={3} maxLength={1000}
                      value={shareNote} onChange={e => setShareNote(e.target.value)}
                      className={input} style={inputStyle} placeholder="We’d be honored to." />
                  </div>

                  {/* ---- Discipler preference (Run 60) ---- */}
                  <div className="pt-1 mt-1 border-t" style={{ borderColor: C.sand }}>
                    <div className="rounded-lg border px-4 py-3.5 mb-3 mt-5" style={{ borderColor: C.sand, background: '#FFFDF8' }}>
                      <p className={`${garamond.className} text-lg mb-1`} style={{ color: C.navy }}>Would you like a discipler?</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#4b463f' }}>
                        A discipler is a friend a step or two ahead on the journey — someone who walks with
                        you through the Welcome Track, answers questions, and prays with you. It’s not a
                        teacher or a boss; it’s company for the road. Totally your call.
                      </p>
                    </div>
                    <fieldset>
                      <legend className="sr-only">Would you like a discipler?</legend>
                      <div className="space-y-2">
                        {[
                          { code: 'ASSIGN', title: 'Yes — please pair me with someone', sub: 'We’ll thoughtfully match you with one of our disciplers.' },
                          { code: 'NONE', title: 'Not right now', sub: 'You can always ask for one later.' },
                          { code: 'REQUEST_SPECIFIC', title: 'I’d love to request someone specific', sub: 'Tell us who — we’ll do our best to make it happen.' },
                        ].map(opt => (
                          <label key={opt.code}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm transition-colors"
                            style={{ borderColor: disciplerPreference === opt.code ? C.gold : C.sand }}
                          >
                            <input type="radio" name="disciplerPreference" value={opt.code}
                              checked={disciplerPreference === opt.code}
                              onChange={() => setDisciplerPreference(disciplerPreference === opt.code ? null : opt.code)}
                              onClick={() => { if (disciplerPreference === opt.code) setDisciplerPreference(null); }}
                              className="mt-0.5 accent-[#B0894F]" />
                            <span>
                              <span className="block font-bold" style={{ color: C.ink }}>{opt.title}</span>
                              <span className="block text-xs opacity-70 mt-0.5">{opt.sub}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    {disciplerPreference === 'REQUEST_SPECIFIC' && (
                      <div className="mt-2 ml-1 rounded-lg border border-dashed px-4 py-3.5" style={{ borderColor: C.gold, background: '#FFFDF8' }}>
                        <label htmlFor="begin-discipler-name" className={label} style={{ color: C.navy }}>
                          Who would you like?
                        </label>
                        <input id="begin-discipler-name" required={disciplerPreference === 'REQUEST_SPECIFIC'}
                          value={requestedDisciplerName} onChange={e => setRequestedDisciplerName(e.target.value)}
                          maxLength={120} className={input} style={inputStyle} placeholder="Their name" />
                        <label htmlFor="begin-discipler-contact" className={`${label} mt-3`} style={{ color: C.navy }}>
                          How can we reach them? <span className="font-normal opacity-60">(optional)</span>
                        </label>
                        <input id="begin-discipler-contact"
                          value={requestedDisciplerContact} onChange={e => setRequestedDisciplerContact(e.target.value)}
                          maxLength={200} className={input} style={inputStyle} placeholder="Email or phone, if you have it" />
                        <p className="mt-2.5 text-xs leading-relaxed opacity-70">
                          A request, not a promise — we’ll check in with them and do our best. If it can’t
                          be them this time, we’ll find you someone wonderful.
                        </p>
                      </div>
                    )}
                  </div>

                  {error && <p role="alert" className="text-sm" style={{ color: '#9b3535' }}>{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting || !open || !firstName.trim() || !email.trim() || (disciplerPreference === 'REQUEST_SPECIFIC' && !requestedDisciplerName.trim())}
                    className="w-full rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: C.navy, color: C.cream }}
                  >
                    {submitting ? 'One moment…' : 'Save my place'}
                  </button>
                  <p className="text-center text-xs leading-relaxed" style={{ color: '#6b6459' }}>
                    We’ll only use this to welcome you and help you take your next step. Nothing else.
                  </p>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* ---- G. A few honest questions ---- */}
        {step !== 'done' && (
          <>
            <hr style={{ borderColor: C.sand }} />
            <section className="py-16 sm:py-20">
              <h2 className={`${garamond.className} text-3xl mb-8 text-center`} style={{ color: C.navy }}>
                A few honest questions
              </h2>
              <div className="space-y-3">
                {FAQS.map((f, i) => (
                  <details key={i} className="group rounded-xl border bg-white px-5 py-4" style={{ borderColor: C.sand }}>
                    <summary className="cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden" style={{ color: C.navy }}>
                      {f.q}
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: '#4b463f' }}>{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* ---- H. Footer ---- */}
      <footer className="px-6 py-14 text-center" style={{ background: C.midnight }}>
        <p className={`${garamond.className} text-lg`} style={{ color: C.cream }}>
          {churchName} · Laurel, Maryland
        </p>
        <p className="mt-2 text-sm" style={{ color: '#9fb3c8' }}>
          A people learning to be with Jesus. However you came to this page, we’re glad you’re here.
        </p>
        <p className="mt-4 text-xs" style={{ color: C.gold }}>
          BE with Jesus · BECOME like Jesus · BRING heaven
        </p>
      </footer>
    </div>
  );
}
