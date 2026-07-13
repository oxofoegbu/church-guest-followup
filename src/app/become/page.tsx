'use client';

// Run 24 — the public BECOME® landing page ("Living Life the Jesus Way").
// Sibling of /begin: same family, same voice, same restraint — a different
// door for a different moment. The Welcome page opens the front door to a
// stranger; this page opens the workshop door to an apprentice. Built from
// the BECOME® design brief — warm cream + deep umber + ember (used as a
// voice, not a shout), literary serif headings, generous space, no hype,
// no "next level" language, no guilt as fuel. Flow: hero (approved
// photograph, type in live HTML) -> the honest gap -> what BECOME® is ->
// the ground it covers -> the heart (tree & fruit, dark section) -> count
// the cost -> form -> email code (shared /api/enroll machinery: OTP,
// admin approval, User path) -> a warm, human confirmation.

import { useState, useEffect, useRef } from 'react';
import { EB_Garamond, Lato } from 'next/font/google';
import StandaloneNav from '@/components/site/StandaloneNav';

const garamond = EB_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], display: 'swap' });

// The palette from the design brief (§5.1) — one family with /begin,
// carrying BECOME®'s own signature: ember.
const C = {
  cream: '#FBF7EF',
  umber: '#33201A',
  ember: '#A63D1F',
  emberDeep: '#8F3418',
  ink: '#2A2622',
  gold: '#B0894F',
  clay: '#EBDCCB',
  olive: '#5C6B3C',
};

type Cohort = { id: string; name: string; meetingDay: string | null; meetingTime: string | null; startDate: string | null };

const AUDIENCES = [
  { code: 'WELCOME_GRAD', label: 'I’ve completed the Welcome Track' },
  { code: 'GLC_MEMBER', label: 'I’m a Grace Life Center member / regular' },
  { code: 'OTHER_CHURCH', label: 'I’m part of another church family' },
  { code: 'NEW_TO_FAITH', label: 'I’m fairly new to all of this' },
];

const RHYTHM = [
  { title: 'Study at your pace', line: 'A rich module in our app each week — read, reflect, and write when your day allows.' },
  { title: 'Practice one thing', line: 'One concrete, doable practice each week — not homework, but a way of training with Jesus.' },
  { title: 'Gather once', line: 'One unhurried 90-minute conversation a week. Honest, human, no performance.' },
  { title: 'Walk with someone', line: 'A discipler alongside you the whole way — someone a little farther down the road.' },
];

const STRANDS = [
  { title: 'The inner life', line: 'anger & reconciliation · desire & discipline · honest speech' },
  { title: 'The relational life', line: 'the second mile · loving enemies · forgiveness' },
  { title: 'The spiritual life', line: 'secret giving · prayer · fasting' },
  { title: 'The trusting life', line: 'treasure & trust · freedom from worry' },
  { title: 'The discerning life', line: 'judgment & boundaries · bold, asking faith' },
  { title: 'The obedient life', line: 'the narrow way · a house built on rock' },
];

const COST = [
  'About 20–30 minutes with the module, most days.',
  'One practice, lived through each week.',
  'One 90-minute gathering a week, for twelve weeks.',
  'A Before and After assessment — private, between you and Jesus.',
  'No cost in dollars. A real cost in intention.',
];

const FAQS = [
  {
    q: 'Is this for new believers?',
    a: 'Yes — hunger is the only qualification. If you’re brand-new to Jesus or to Grace Life Center, though, the Welcome Track is the best first door; BECOME® builds on that foundation. You can begin it at gracelifecenter.com/begin — and we’ll be waiting for you here after.',
  },
  {
    q: 'I’ve been a Christian for years — is this too basic for me?',
    a: 'It isn’t about information. The Sermon on the Mount has never been the problem to solve; it’s the life to live. The oldest saints among us are still becoming — that’s rather the point.',
  },
  {
    q: 'What if I miss a week?',
    a: 'You keep walking. The modules are self-paced, so you can catch up gently, and missing a gathering doesn’t disqualify you from anything. Falling behind isn’t falling away — direction matters more than pace.',
  },
  {
    q: 'Do I have to be a member?',
    a: 'No. If you’re part of another church family, you’re welcome here — this journey will send you back to them with more to give.',
  },
  {
    q: 'What’s a discipler?',
    a: 'Someone a little farther down the road who walks it with you — they read your reflections, check in, pray for you, and sit in the weekly conversation. Not a boss, not a grader. Company.',
  },
  {
    q: 'Is this a class or a group?',
    a: 'Neither, quite. It’s training: you study on your own during the week, then gather once for an honest conversation about how the practice actually went. No lectures, no performing.',
  },
  {
    q: 'What happens after the twelve weeks?',
    a: 'You keep living it — that’s the whole idea. And for those who finish sensing a call to serve or lead, the Leaders Track is the next open door, whenever you’re ready.',
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

export default function BecomePage() {
  const [churchName, setChurchName] = useState('Grace Life Center');
  const [trackId, setTrackId] = useState<string | null>(null);
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/become/options')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        if (d.churchName) setChurchName(d.churchName);
        setTrackId(d.track?.id || null);
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
    if (submitting || !trackId) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          cohortId: cohortId || null,
          firstName, lastName, email, phone,
          audience: audience || null,
          shareNote,
          website: honeypot,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || 'Hmm — something didn’t go through. Mind trying once more? Or email us at pastor@gracelifecenter.com and we’ll take care of it.');
      } else {
        setRequestId(d.requestId);
        setStep('verify');
        setResendIn(60);
        setCode('');
      }
    } catch {
      setError('Hmm — something didn’t go through. Mind trying once more? Or email us at pastor@gracelifecenter.com and we’ll take care of it.');
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
  const inputStyle = { borderColor: C.clay, color: C.ink } as React.CSSProperties;
  const label = 'block text-sm font-bold mb-1.5';

  const heroKicker = (
    <p className="text-xs sm:text-sm tracking-[0.25em] uppercase" style={{ color: C.gold }}>
      {churchName} · BECOME® — Living Life the Jesus Way
    </p>
  );
  const heroH1 = (
    <h1 className={`${garamond.className} mt-6 text-4xl sm:text-5xl leading-tight`} style={{ color: C.cream }}>
      What if your life could actually look like His?
    </h1>
  );
  const heroSub = (
    <p className="mt-6 text-base sm:text-lg leading-relaxed" style={{ color: '#F0E4D6' }}>
      Not by trying harder — by training with Jesus. BECOME® is a twelve-week journey
      through the Sermon on the Mount: His teachings, one honest practice at a time,
      until the change is on the inside.
    </p>
  );
  const heroButtons = (align: 'start' | 'center') => (
    <div className={`mt-10 flex flex-col gap-4 ${align === 'center' ? 'items-center' : 'items-center sm:items-start'}`}>
      <button
        onClick={() => scrollTo(formRef)}
        className="rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90"
        style={{ background: C.ember, color: C.cream }}
      >
        Join the next cohort
      </button>
      <button
        onClick={() => scrollTo(aboutRef)}
        className="text-sm underline underline-offset-4 opacity-80 hover:opacity-100"
        style={{ color: '#F0E4D6' }}
      >
        What is this?
      </button>
    </div>
  );

  return (
    <div className={lato.className} style={{ background: C.cream, color: C.ink, minHeight: '100vh' }}>
      <StandaloneNav serifClass={garamond.className} />
      {/* ---- A. Hero — the ache and the invitation ---- */}
      {/* Desktop / tablet: the approved photograph full-bleed, type in live
          HTML over the empty left two-thirds, with a whisper of scrim that
          disappears into the wall's own tones. */}
      <header className="relative hidden md:flex items-center overflow-hidden" style={{ background: C.umber, minHeight: '560px' }}>
        <img
          src="/become/hero-wide.webp"
          alt="A woman in a mustard sweater laughing against a warm terracotta wall."
          width={1916}
          height={821}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: '80% 40%' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(51,32,26,0.58), rgba(51,32,26,0.4) 32%, transparent 62%)' }}
        />
        <div className="relative z-10 w-full">
          <div className="mx-auto max-w-6xl px-8 lg:px-12 py-24">
            <div className="max-w-[58%] lg:max-w-2xl">
              {heroKicker}
              {heroH1}
              {heroSub}
              {heroButtons('start')}
            </div>
          </div>
        </div>
      </header>
      {/* Mobile: the left negative space collapses, so stack rather than
          overlay — a solid Deep Umber block carries the type, the image
          follows below, pre-cropped to 4:5 around the subject. */}
      <header className="md:hidden" style={{ background: C.umber }}>
        <div className="px-6 pt-24 pb-12 text-center">
          {heroKicker}
          {heroH1}
          {heroSub}
          {heroButtons('center')}
        </div>
        <img
          src="/become/hero-mobile.webp"
          alt="A woman in a mustard sweater laughing against a warm terracotta wall."
          width={656}
          height={821}
          className="w-full h-auto"
        />
      </header>

      <div className="mx-auto max-w-2xl px-6">
        {/* ---- B. The honest gap ---- */}
        <section className="py-16 sm:py-20 text-center">
          <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.ember }}>
            The gap we all know
          </h2>
          <p className="text-lg leading-relaxed">
            Most of us have admired Jesus for years. We’ve sung to Him, prayed to Him, studied
            His words. But far fewer of us have actually built our lives on His teachings — and
            we can feel the difference. The good news: Jesus never asked you to white-knuckle
            your way into holiness. He asked you to apprentice yourself to Him, and let Him
            form His life in you.
          </p>
          <p className={`${garamond.className} mt-6 text-xl italic`} style={{ color: C.emberDeep }}>
            He never asked us to try harder. He asked us to train with Him.
          </p>
        </section>

        <hr style={{ borderColor: C.clay }} />

        {/* ---- C. What BECOME® is ---- */}
        <section ref={aboutRef} className="py-16 sm:py-20 scroll-mt-6">
          <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.ember }}>
            What BECOME® is
          </h2>
          <p className="text-center leading-relaxed mb-10">
            Twelve weeks inside Jesus’ greatest teaching — the Sermon on the Mount — where He
            forms the character of heaven inside the people of earth. The rhythm is simple,
            human, and doable:
          </p>
          <ol className="space-y-4">
            {RHYTHM.map((m, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-xl border bg-white p-5"
                style={{ borderColor: C.clay }}
              >
                <span
                  className={`${garamond.className} flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg`}
                  style={{ border: `1px solid ${C.gold}`, color: C.gold }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold" style={{ color: C.emberDeep }}>{m.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: '#4b463f' }}>{m.line}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center text-sm leading-relaxed" style={{ color: '#6b6459' }}>
            New to Jesus, or new to {churchName}? The{' '}
            <a href="/begin" className="underline underline-offset-4" style={{ color: C.emberDeep }}>Welcome Track</a>{' '}
            is the best first door — BECOME® builds on it.
          </p>
        </section>

        <hr style={{ borderColor: C.clay }} />

        {/* ---- D. The ground it covers ---- */}
        <section className="py-16 sm:py-20">
          <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.ember }}>
            The ground it covers
          </h2>
          <p className="text-center leading-relaxed mb-10">
            Not a syllabus — the rooms of a house Jesus renovates, one at a time.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {STRANDS.map((s, i) => (
              <div key={i} className="rounded-xl border bg-white p-5" style={{ borderColor: C.clay }}>
                <h3 className={`${garamond.className} text-xl`} style={{ color: C.emberDeep }}>{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: '#4b463f' }}>{s.line}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---- E. What it's really about — the heart (dark, over the table) ---- */}
      <section className="relative overflow-hidden px-6 py-20 sm:py-28" style={{ background: C.umber }}>
        <img
          src="/become/texture-table.webp"
          alt=""
          aria-hidden="true"
          width={1916}
          height={821}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: '70% 50%' }}
        />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(30,17,13,0.78), rgba(30,17,13,0.55) 45%, rgba(30,17,13,0.25))' }} />
        <div className="relative mx-auto max-w-6xl lg:px-6">
          <div className="max-w-xl">
            <p className={`${garamond.className} text-2xl sm:text-[1.7rem] italic leading-relaxed`} style={{ color: C.cream }}>
              “Make the tree good,” Jesus said, “and its fruit will be good.”
            </p>
            <p className="mt-6 leading-relaxed" style={{ color: '#EFE3D3' }}>
              He isn’t managing your behavior; He’s renovating your heart. Behavior is the
              fruit — character is the tree. Every practice in these twelve weeks is a way of
              cooperating with Him while He does what only He can do.
            </p>
            <p className={`${garamond.className} mt-8 text-xl`} style={{ color: C.gold }}>
              You practice. He transforms.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-6">
        {/* ---- F. What it will ask of you ---- */}
        <section className="py-16 sm:py-20">
          <h2 className={`${garamond.className} text-3xl mb-6 text-center`} style={{ color: C.ember }}>
            What it will ask of you
          </h2>
          <ul className="mx-auto max-w-lg space-y-3 text-base leading-relaxed">
            {COST.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden="true" style={{ color: C.gold }}>•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-lg text-center leading-relaxed" style={{ color: '#4b463f' }}>
            You will fall along the way — everyone does. Falling isn’t the opposite of
            following. Just keep facing Him.
          </p>
        </section>

        <hr style={{ borderColor: C.clay }} />

        {/* ---- G. The invitation + enrollment form ---- */}
        <section ref={formRef} className="py-16 sm:py-20 scroll-mt-6">
          {step === 'done' ? (
            <div className="text-center py-8">
              <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.ember }}>
                You’re in — and we’re glad.
              </h2>
              <p className="text-lg leading-relaxed">
                A real person will reach out soon with your cohort details and how to access
                your BECOME® workbook in our app. There’s nothing to prepare and no bar to
                clear. Come hungry; Jesus does the rest.
              </p>
            </div>
          ) : step === 'verify' ? (
            <div className="mx-auto max-w-md">
              <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.ember }}>
                One small thing
              </h2>
              <p className="text-center leading-relaxed mb-8">
                We’ve sent a 6-digit code to <strong>{email}</strong> — just so we know how to
                reach you. Type it below and your place is saved.
              </p>
              <form onSubmit={verify} noValidate>
                <label htmlFor="become-code" className="sr-only">6-digit code from your email</label>
                <input
                  id="become-code"
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
                  style={{ background: C.ember, color: C.cream }}
                >
                  {submitting ? 'One moment…' : 'Save my place'}
                </button>
              </form>
              <div className="mt-5 flex items-center justify-between text-sm">
                <button onClick={() => { setStep('form'); setError(''); }} className="underline underline-offset-4" style={{ color: C.emberDeep }}>
                  Edit my details
                </button>
                <button onClick={resend} disabled={resendIn > 0} className="underline underline-offset-4 disabled:no-underline disabled:opacity-60" style={{ color: C.emberDeep }}>
                  {resendIn > 0 ? `Resend code (${resendIn}s)` : 'Resend code'}
                </button>
              </div>
            </div>
          ) : (
            <div className="md:grid md:grid-cols-[1fr,300px] md:gap-10 md:items-start">
              <div className="mx-auto max-w-md md:mx-0 md:max-w-none">
                <h2 className={`${garamond.className} text-3xl mb-4 text-center md:text-left`} style={{ color: C.ember }}>
                  If you’re hungry, that’s the qualification.
                </h2>
                <p className="text-center md:text-left leading-relaxed mb-8">
                  Tell us where to find you, and we’ll save your seat in the next cohort.
                </p>
                {!open && (
                  <p className="mb-6 rounded-lg border bg-white p-4 text-sm leading-relaxed" style={{ borderColor: C.clay }}>
                    Sign-ups are briefly paused — but your hunger isn’t on hold. Email us at{' '}
                    <a href="mailto:pastor@gracelifecenter.com" className="underline underline-offset-4" style={{ color: C.emberDeep }}>pastor@gracelifecenter.com</a>{' '}
                    and we’ll walk you into the next cohort personally.
                  </p>
                )}
                <form onSubmit={submit} noValidate>
                  {/* honeypot — visually hidden from humans, tempting to bots */}
                  <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
                    <label htmlFor="become-website">Website</label>
                    <input id="become-website" type="text" tabIndex={-1} autoComplete="off"
                      value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="become-first" className={label} style={{ color: C.emberDeep }}>First name</label>
                        <input id="become-first" required value={firstName} onChange={e => setFirstName(e.target.value)}
                          className={input} style={inputStyle} placeholder="What should we call you?" autoComplete="given-name" />
                      </div>
                      <div>
                        <label htmlFor="become-last" className={label} style={{ color: C.emberDeep }}>Last name</label>
                        <input id="become-last" required value={lastName} onChange={e => setLastName(e.target.value)}
                          className={input} style={inputStyle} autoComplete="family-name" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="become-email" className={label} style={{ color: C.emberDeep }}>Email</label>
                      <input id="become-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        className={input} style={inputStyle} placeholder="Where can we reach you?" autoComplete="email" />
                    </div>
                    <div>
                      <label htmlFor="become-phone" className={label} style={{ color: C.emberDeep }}>
                        Phone <span className="font-normal opacity-60">(optional)</span>
                      </label>
                      <input id="become-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        className={input} style={inputStyle} placeholder="Only if you’d like a personal text or call" autoComplete="tel" />
                    </div>

                    <fieldset>
                      <legend className={label} style={{ color: C.emberDeep }}>
                        Where are you on the path? <span className="font-normal opacity-60">(optional)</span>
                      </legend>
                      <div className="space-y-2">
                        {AUDIENCES.map(a => (
                          <label key={a.code}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm transition-colors"
                            style={{ borderColor: audience === a.code ? C.gold : C.clay }}
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
                      {audience === 'NEW_TO_FAITH' && (
                        <p className="mt-3 rounded-lg border bg-white p-3.5 text-sm leading-relaxed" style={{ borderColor: C.gold, color: '#4b463f' }}>
                          Then can we suggest a gentler first step? The{' '}
                          <a href="/begin" className="underline underline-offset-4 font-bold" style={{ color: C.emberDeep }}>Welcome Track</a>{' '}
                          is where this whole path begins — short, unhurried, made for you. You’re
                          still welcome to continue here; we just want you to have the best door.
                        </p>
                      )}
                    </fieldset>

                    {cohorts.length > 0 && (
                      <div>
                        <label htmlFor="become-cohort" className={label} style={{ color: C.emberDeep }}>
                          Which cohort?
                        </label>
                        <select id="become-cohort" value={cohortId} onChange={e => setCohortId(e.target.value)}
                          className={input} style={inputStyle}>
                          <option value="">Place me in the next one</option>
                          {cohorts.map(c => (
                            <option key={c.id} value={c.id}>{cohortLabel(c)}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label htmlFor="become-share" className={label} style={{ color: C.emberDeep }}>
                        Anything you’d like us to know — or pray about? <span className="font-normal opacity-60">(optional)</span>
                      </label>
                      <textarea id="become-share" rows={3} maxLength={1000}
                        value={shareNote} onChange={e => setShareNote(e.target.value)}
                        className={input} style={inputStyle} placeholder="We’d be honored to." />
                    </div>

                    {error && <p role="alert" className="text-sm" style={{ color: '#9b3535' }}>{error}</p>}

                    <button
                      type="submit"
                      disabled={submitting || !open || !trackId || !firstName.trim() || !lastName.trim() || !email.trim()}
                      className="w-full rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: C.ember, color: C.cream }}
                    >
                      {submitting ? 'One moment…' : 'Save my place'}
                    </button>
                    <p className="text-center text-xs leading-relaxed" style={{ color: '#6b6459' }}>
                      We’ll only use this to welcome you into BECOME® and walk with you. Nothing else.
                    </p>
                  </div>
                </form>
              </div>
              <div className="hidden md:block">
                <img
                  src="/become/portrait-goldenhour.webp"
                  alt="A woman smiling in warm golden evening light."
                  width={1122}
                  height={1402}
                  loading="lazy"
                  className="rounded-2xl w-full h-auto"
                />
                <p className={`${garamond.className} mt-4 text-center text-sm italic`} style={{ color: '#6b6459' }}>
                  Come as you are. Leave becoming.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ---- H. A few honest questions ---- */}
        {step !== 'done' && (
          <>
            <hr style={{ borderColor: C.clay }} />
            <section className="py-16 sm:py-20">
              <h2 className={`${garamond.className} text-3xl mb-8 text-center`} style={{ color: C.ember }}>
                A few honest questions
              </h2>
              <div className="space-y-3">
                {FAQS.map((f, i) => (
                  <details key={i} className="group rounded-xl border bg-white px-5 py-4" style={{ borderColor: C.clay }}>
                    <summary className="cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden" style={{ color: C.emberDeep }}>
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

      {/* ---- I. Footer ---- */}
      <footer className="px-6 py-14 text-center" style={{ background: C.umber }}>
        <p className={`${garamond.className} text-lg`} style={{ color: C.cream }}>
          {churchName} · Laurel, Maryland
        </p>
        <p className="mt-2 text-sm" style={{ color: '#D8C5B4' }}>
          A people learning to be with Jesus, become like Jesus, and bring heaven.
          Whatever brought you to this page, we’re glad you’re here.
        </p>
        <p className="mt-5 text-sm" style={{ color: '#D8C5B4' }}>
          New here?{' '}
          <a href="/begin" className="underline underline-offset-4" style={{ color: C.gold }}>Begin with the Welcome Track</a>
          <span className="mx-2 opacity-50">·</span>
          Sensing a call to lead?{' '}
          <a href="/leaders" className="underline underline-offset-4" style={{ color: C.gold }}>The Leaders Track</a>
        </p>
        <p className="mt-4 text-xs" style={{ color: C.gold }}>
          BE with Jesus · BECOME like Jesus · BRING heaven
        </p>
      </footer>
    </div>
  );
}
