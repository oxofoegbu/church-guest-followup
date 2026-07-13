'use client';

// Run 27 — the public Disciplers Track landing page (/discipler).
// The fourth sibling of /begin, /become, and (someday) a Leaders page: same
// family, same voice, same restraint — the quietest and most consequential
// doorway on the path. The track is INVITE-ONLY (deliberately not in
// SELF_ENROLL_TRACK_SLUGS), so this page has two doors:
//   Door 1 "I was invited — I accept": no email code (the invitation was
//     personal; the approval queue verifies the named inviter with a human).
//     Lands in /dashboard/tracks/requests as a normal PENDING request,
//     silently targeting the next upcoming cohort when one exists.
//   Door 2 "I sense this is for me": uninvited interest — the email code
//     step applies, and the row is marked intent INTEREST (a conversation
//     for the discipleship team, never an enrollment).
// Palette from the Disciplers design brief §5.1 — the family cream + gold
// + serif warmth carrying the track's own signature: evergreen. No hype,
// no hero-making, no exclusivity glamour, no recruitment desperation.

import { useState, useEffect, useRef } from 'react';
import { EB_Garamond, Lato } from 'next/font/google';

const garamond = EB_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], display: 'swap' });

// §5.1 — evergreen is a voice, not a shout; gold is light, not text.
const C = {
  cream: '#FBF7EF',
  forest: '#1F2A1D',      // deep anchor — dark hero/section backgrounds
  evergreen: '#3E5A34',   // primary ink / the Disciplers signature
  evergreenDeep: '#324A2A',
  ink: '#2A2622',
  gold: '#B0894F',
  clay: '#EBDCCB',
};

type Cohort = { id: string; name: string; meetingDay: string | null; meetingTime: string | null; startDate: string | null };

const AUDIENCES = [
  { code: 'BECOME_DONE', label: 'I’ve completed Become®' },
  { code: 'BECOME_NOW', label: 'I’m completing Become® now' },
  { code: 'PATH_OTHER', label: 'Other' },
];

const TEN_WEEKS =
  'the gospel of the Kingdom · the call to make disciples · grace-based discipling · friendship and partnership · the Holy Spirit and prayer · knowing your disciple · the art of the one-on-one · walking the GLC tracks · challenges, boundaries, and care · multiplication and commissioning';

const SHAPE = [
  { title: 'Study at your pace', line: `A short module each week in our Harvest app: ${TEN_WEEKS}.` },
  { title: 'Gather weekly', line: 'One honest conversation a week with your fellow trainees.' },
  { title: 'A private readiness assessment', line: 'Before and after — just for you. Not a test; a mirror.' },
  { title: 'Commissioning', line: 'Prayed over, sent, and entrusted with one person to walk with — a coordinator behind you, pastors above you, and a room of fellow disciplers every quarter. Nobody shepherds alone.' },
];

const IS = ['a guide', 'an encourager', 'a friend', 'a prayer-carrier', 'a question-asker', 'a companion who walks alongside their disciple’s journey in the app'];
const IS_NOT = ['a counselor', 'a life coach', 'a theologian', 'a savior'];

const FAQS = [
  {
    q: 'I don’t feel qualified — is that a problem?',
    a: 'It’s the norm. The Twelve were ordinary, unschooled men, noticed only for having been with Jesus. If you can pray, read a verse, and share your story, you can walk with someone.',
  },
  {
    q: 'How much time does this really take?',
    a: 'During training: a module at your pace and one gathering, weekly, for ten weeks. Afterward: about an hour a week with your disciple, and prayer in between.',
  },
  {
    q: 'What if my disciple has a crisis?',
    a: 'You hand it up, not carry it alone. Hard things go to pastors — that’s not failure, that’s the design.',
  },
  {
    q: 'Do I pick who I disciple?',
    a: 'Matching is prayerful and thoughtful — you’ll meet first, and nobody is pressured on either side.',
  },
  {
    q: 'What if it’s not working?',
    a: 'Then we say so honestly and re-match. Reassignment is faithfulness, not failure.',
  },
  {
    q: 'I haven’t done Become® yet.',
    a: 'Then that’s your beautiful next step — start there, and this page will still be here. Brand new to Grace Life? Begin with the Welcome Track at /begin.',
  },
  {
    q: 'Is this the same as the Leaders Track?',
    a: 'No — the Leaders Track prepares people to lead ministries; the Disciplers Track prepares you to walk with one person. Many disciplers later sense that call too.',
  },
];

const GENTLE_ERROR =
  'Hmm — something didn’t go through. Mind trying once more? Or email us at pastor@gracelifecenter.com and we’ll take care of it.';

function cohortLabel(c: Cohort): string {
  const meet: string[] = [];
  if (c.startDate) {
    const d = new Date(c.startDate);
    meet.push(`starting ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}`);
  }
  if (c.meetingDay) meet.push(`${c.meetingDay}s${c.meetingTime ? ` at ${c.meetingTime}` : ''}`);
  return meet.length ? `${c.name} — ${meet.join(', ')}` : c.name;
}

export default function DisciplerPage() {
  const [churchName, setChurchName] = useState('Grace Life Center');
  const [trackId, setTrackId] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [open, setOpen] = useState(true);

  const [door, setDoor] = useState<'accept' | 'interest'>('accept');
  const [step, setStep] = useState<'form' | 'verify' | 'done'>('form');
  const [doneKind, setDoneKind] = useState<'accept' | 'interest'>('accept');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [invitedBy, setInvitedBy] = useState('');
  const [walkedWith, setWalkedWith] = useState('');
  const [audience, setAudience] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/discipler/options')
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

  const goToForm = (which: 'accept' | 'interest') => {
    setDoor(which);
    setError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Door 1 silently targets the next upcoming cohort when one exists (the
  // invite-only cohort is read at runtime — never hardcoded); with none yet,
  // the request lands in the queue and the team assigns one at approval.
  const nextCohort = cohorts.length > 0 ? cohorts[0] : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !trackId) return;
    const isInterest = door === 'interest';
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          cohortId: isInterest ? null : nextCohort?.id || null,
          firstName, lastName, email, phone,
          invitedBy: isInterest ? walkedWith : invitedBy,
          ...(isInterest ? { intent: 'INTEREST' } : {}),
          audience: audience || null,
          shareNote,
          website: honeypot,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || GENTLE_ERROR);
      } else if (d.requiresVerification) {
        // Door 2 — the email code step
        setRequestId(d.requestId);
        setStep('verify');
        setResendIn(60);
        setCode('');
      } else {
        // Door 1 — received directly
        setDoneKind('accept');
        setStep('done');
      }
    } catch {
      setError(GENTLE_ERROR);
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
      else { setDoneKind('interest'); setStep('done'); }
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
  const isInterest = door === 'interest';

  const heroKicker = (
    <p className="text-xs sm:text-sm tracking-[0.25em] uppercase" style={{ color: C.gold }}>
      {churchName} · The Disciplers Track
    </p>
  );
  const heroH1 = (
    <h1 className={`${garamond.className} mt-6 text-4xl sm:text-5xl leading-tight`} style={{ color: C.cream }}>
      Someone walked with you. Now walk with someone.
    </h1>
  );
  const heroSub = (
    <p className="mt-6 text-base sm:text-lg leading-relaxed" style={{ color: '#EDE7DA' }}>
      You’ve been invited to train as a discipler — a friend with a vision, who keeps
      company with one person while Jesus does what only He can do. Ten weeks of
      preparation. One life entrusted. Never alone.
    </p>
  );
  const heroButtons = (align: 'start' | 'center') => (
    <div className={`mt-10 flex flex-col gap-4 ${align === 'center' ? 'items-center' : 'items-center sm:items-start'}`}>
      <button
        onClick={() => goToForm('accept')}
        className="rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90"
        style={{ background: C.evergreen, color: C.cream }}
      >
        Accept the invitation
      </button>
      <button
        onClick={() => goToForm('interest')}
        className="text-sm underline underline-offset-4 opacity-80 hover:opacity-100"
        style={{ color: '#EDE7DA' }}
      >
        I wasn’t invited — but I sense this is for me
      </button>
    </div>
  );

  return (
    <div className={lato.className} style={{ background: C.cream, color: C.ink, minHeight: '100vh' }}>
      {/* ---- A. Hero — the honor and the question ---- */}
      <header className="relative hidden md:flex items-center overflow-hidden" style={{ background: C.forest, minHeight: '560px' }}>
        <img
          src="/discipler/hero-wide.webp"
          alt="Two women walking a tree-lined road at sunset, deep in conversation."
          width={1916}
          height={821}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: '75% 45%' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(31,42,29,0.62), rgba(31,42,29,0.42) 32%, transparent 62%)' }}
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
      <header className="md:hidden" style={{ background: C.forest }}>
        <div className="px-6 pt-16 pb-12 text-center">
          {heroKicker}
          {heroH1}
          {heroSub}
          {heroButtons('center')}
        </div>
        <img
          src="/discipler/hero-mobile.webp"
          alt="Two women walking a tree-lined road at sunset, deep in conversation."
          width={657}
          height={821}
          className="w-full h-auto"
        />
      </header>

      <div className="mx-auto max-w-2xl px-6">
        {/* ---- B. The turn — you were walked with ---- */}
        <section className="py-16 sm:py-20">
          <div className="sm:grid sm:grid-cols-[1fr,220px] sm:gap-8 sm:items-start">
            <div>
              <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.evergreen }}>
                You were walked with.
              </h2>
              <p className="text-lg leading-relaxed">
                Somebody prayed for you by name. Met you weekly. Heard your worst week without
                flinching, and texted you a verse on an ordinary Tuesday. That’s a discipler —
                and someone believes you’re ready to be that for another person.
              </p>
              <p className="mt-5 leading-relaxed">
                You won’t feel qualified. The first disciples didn’t either — people could only
                tell that they had been with Jesus. That’s still the whole qualification.
              </p>
            </div>
            <img
              src="/discipler/hand-shoulder.webp"
              alt="An older man with his hand on a younger man’s shoulder, walking a dirt path at dusk."
              width={900}
              height={900}
              loading="lazy"
              className="mt-8 sm:mt-2 rounded-2xl w-full h-auto"
            />
          </div>
          <p className={`${garamond.className} mt-10 text-center text-lg italic leading-relaxed`} style={{ color: C.evergreenDeep }}>
            “And the things that you have heard from me among many witnesses, commit these to
            faithful men who will be able to teach others also.”
          </p>
          <p className="mt-2 text-center text-sm" style={{ color: C.gold }}>2 Timothy 2:2 (NKJV)</p>
        </section>
      </div>

      {/* ---- C. The gospel disciplers carry (the heart — dark, the path through the trees) ---- */}
      <section className="relative overflow-hidden px-6 py-20 sm:py-28" style={{ background: C.forest }}>
        <img
          src="/discipler/forest-path.webp"
          alt=""
          aria-hidden="true"
          width={1916}
          height={821}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: '70% 50%' }}
        />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(20,28,19,0.82), rgba(20,28,19,0.55) 45%, rgba(20,28,19,0.2))' }} />
        <div className="relative mx-auto max-w-6xl lg:px-6">
          <div className="max-w-xl">
            <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.cream }}>
              The gospel disciplers carry
            </h2>
            <p className="leading-relaxed" style={{ color: '#EDE7DA' }}>
              The good news is bigger than a ticket out of here. In Jesus, God has made His own
              presence and power available to ordinary people — now, on His earth. Being saved
              isn’t clearing a bar before you die; it’s becoming like Jesus while you live, by
              being with Him.
            </p>
            <p className="mt-5 leading-relaxed" style={{ color: '#EDE7DA' }}>
              Nobody learns that alone. That’s why there are disciplers: heaven arrives one
              accompanied life at a time, until the whole earth is filled with the glory of God.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-6">
        {/* ---- D. What the Disciplers Track is ---- */}
        <section className="py-16 sm:py-20">
          <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.evergreen }}>
            Ten weeks, plus orientation — then the real thing.
          </h2>
          <ol className="mt-8 space-y-4">
            {SHAPE.map((m, i) => (
              <li key={i} className="flex gap-4 rounded-xl border bg-white p-5" style={{ borderColor: C.clay }}>
                <span
                  className={`${garamond.className} flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg`}
                  style={{ border: `1px solid ${C.gold}`, color: C.gold }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold" style={{ color: C.evergreenDeep }}>{m.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: '#4b463f' }}>{m.line}</p>
                </div>
              </li>
            ))}
          </ol>
          <img
            src="/discipler/gathering.webp"
            alt="Six adults in a warm lamp-lit living room with open Bibles, leaning in to listen."
            width={1200}
            height={675}
            loading="lazy"
            className="mt-8 rounded-2xl w-full h-auto"
          />
        </section>

        <hr style={{ borderColor: C.clay }} />

        {/* ---- E. What a discipler is — and is not ---- */}
        <section className="py-16 sm:py-20">
          <h2 className={`${garamond.className} text-3xl mb-8 text-center`} style={{ color: C.evergreen }}>
            What a discipler is — and is not
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-white p-6" style={{ borderColor: C.clay }}>
              <h3 className={`${garamond.className} text-xl mb-3`} style={{ color: C.evergreenDeep }}>A discipler is</h3>
              <ul className="space-y-2 text-sm leading-relaxed" style={{ color: '#4b463f' }}>
                {IS.map((t, i) => (
                  <li key={i} className="flex gap-2.5"><span aria-hidden="true" style={{ color: C.gold }}>·</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-white p-6" style={{ borderColor: C.clay }}>
              <h3 className={`${garamond.className} text-xl mb-3`} style={{ color: C.evergreenDeep }}>A discipler is not</h3>
              <ul className="space-y-2 text-sm leading-relaxed" style={{ color: '#4b463f' }}>
                {IS_NOT.map((t, i) => (
                  <li key={i} className="flex gap-2.5"><span aria-hidden="true" style={{ color: C.gold }}>·</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
          </div>
          {/* Mobile: the boundaries line as text, then the tighter crop —
              an overlay would shrink below readability at phone widths */}
          <div className="sm:hidden">
            <p className="mx-auto mt-8 max-w-lg text-center leading-relaxed" style={{ color: '#4b463f' }}>
              Boundaries are part of the honor. Hard things go to pastors — a discipler never
              carries a crisis alone.
            </p>
            <img
              src="/discipler/table-two-mobile.webp"
              alt="Two men in honest conversation at a wooden table — an open book between them, window light on the wall."
              width={1232}
              height={821}
              loading="lazy"
              className="mt-8 rounded-2xl w-full h-auto"
            />
          </div>
          {/* sm+: the line lives on the image's empty wall, hero-style —
              live HTML over an evergreen scrim (AA-checked against the
              brightest sunlit patch), never baked into the image */}
          <div className="relative mt-10 hidden sm:block overflow-hidden rounded-2xl">
            <img
              src="/discipler/table-two.webp"
              alt="Two men in honest conversation at a wooden table — an open book between them, window light on the wall."
              width={1916}
              height={821}
              loading="lazy"
              className="w-full h-auto"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(to right, rgba(31,42,29,0.82), rgba(31,42,29,0.72) 42%, transparent 66%)' }}
            />
            <div className="absolute inset-0 flex items-center">
              <p
                className={`${garamond.className} max-w-[46%] pl-8 md:pl-10 text-lg md:text-xl italic leading-relaxed`}
                style={{ color: C.cream, textShadow: '0 1px 10px rgba(20,28,19,0.55)' }}
              >
                Boundaries are part of the honor. Hard things go to pastors — a discipler
                never carries a crisis alone.
              </p>
            </div>
          </div>
        </section>

        <hr style={{ borderColor: C.clay }} />

        {/* ---- F. What it will ask of you (count the cost, warmly) ---- */}
        <section className="py-16 sm:py-20">
          <div className="sm:grid sm:grid-cols-[1fr,240px] sm:gap-8 sm:items-center">
            <div>
              <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.evergreen }}>
                Count the cost — we have.
              </h2>
              <p className="leading-relaxed">
                Ten weeks of training: a module and one gathering each week. Then a season of
                walking with one person — a weekly meeting, prayer in between, presence.
                Quarterly Discipler Gatherings. Confidentiality held like treasure. No cost in
                dollars; a real cost in self.
              </p>
              <p className={`${garamond.className} mt-6 text-lg italic leading-relaxed`} style={{ color: C.evergreenDeep }}>
                You will feel over your head sometimes — that is the correct depth. God’s
                capability, not yours, carries the rest.
              </p>
            </div>
            <img
              src="/discipler/two-cups.webp"
              alt="A small round table set for two — an open Bible, a journal, and two steaming cups in morning light."
              width={1100}
              height={733}
              loading="lazy"
              className="mt-8 sm:mt-0 rounded-2xl w-full h-auto"
            />
          </div>
        </section>

        <hr style={{ borderColor: C.clay }} />

        {/* ---- G. The response — two doors, one form ---- */}
        <section ref={formRef} className="py-16 sm:py-20 scroll-mt-6">
          {step === 'done' ? (
            <div className="text-center py-8">
              {doneKind === 'accept' ? (
                <>
                  <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.evergreen }}>
                    Received — and we’re honored.
                  </h2>
                  <p className="text-lg leading-relaxed">
                    A real person will confirm your place in the next Disciplers cohort and show
                    you how to access your workbook in our app. Between now and then, there’s one
                    assignment: pray for the person God may already be preparing for you to walk
                    with.
                  </p>
                </>
              ) : (
                <>
                  <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.evergreen }}>
                    Thank you for telling us.
                  </h2>
                  <p className="text-lg leading-relaxed">
                    Someone from the discipleship team will reach out for an honest, no-pressure
                    conversation about where you are on the path and what’s next. Sensing the
                    pull is worth taking seriously — that’s why we want to talk, not just enroll.
                  </p>
                </>
              )}
            </div>
          ) : step === 'verify' ? (
            <div className="mx-auto max-w-md">
              <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.evergreen }}>
                One small thing
              </h2>
              <p className="text-center leading-relaxed mb-8">
                We’ve sent a 6-digit code to <strong>{email}</strong> — just so we’re sure this
                email is really yours. Type it below and the conversation is on its way.
              </p>
              <form onSubmit={verify} noValidate>
                <label htmlFor="discipler-code" className="sr-only">6-digit code from your email</label>
                <input
                  id="discipler-code"
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
                  style={{ background: C.evergreen, color: C.cream }}
                >
                  {submitting ? 'One moment…' : 'Start the conversation'}
                </button>
              </form>
              <div className="mt-5 flex items-center justify-between text-sm">
                <button onClick={() => { setStep('form'); setError(''); }} className="underline underline-offset-4" style={{ color: C.evergreenDeep }}>
                  Edit my details
                </button>
                <button onClick={resend} disabled={resendIn > 0} className="underline underline-offset-4 disabled:no-underline disabled:opacity-60" style={{ color: C.evergreenDeep }}>
                  {resendIn > 0 ? `Resend code (${resendIn}s)` : 'Resend code'}
                </button>
              </div>
            </div>
          ) : (
            <div className="md:grid md:grid-cols-[1fr,300px] md:gap-10 md:items-start">
              <div className="mx-auto max-w-md md:mx-0 md:max-w-none">
                <h2 className={`${garamond.className} text-3xl mb-4 text-center md:text-left`} style={{ color: C.evergreen }}>
                  {isInterest ? 'Sensing the pull? Tell us.' : 'If you were invited, someone already sees it in you.'}
                </h2>
                <p className="text-center md:text-left leading-relaxed mb-6">
                  {isInterest
                    ? 'You weren’t tapped on the shoulder — yet the pull is real. That’s worth an honest conversation, not a form letter. Tell us where to find you, and a real person will reach out.'
                    : 'Tell us who tapped your shoulder, and we’ll save your place.'}
                </p>

                {/* the two doors */}
                <div className="mb-8 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="How did you arrive at this page?">
                  <button
                    type="button"
                    onClick={() => { setDoor('accept'); setError(''); }}
                    className="rounded-lg border px-4 py-3 text-sm font-bold transition-colors"
                    style={!isInterest
                      ? { background: C.evergreen, borderColor: C.evergreen, color: C.cream }
                      : { background: '#fff', borderColor: C.clay, color: C.evergreenDeep }}
                    aria-pressed={!isInterest}
                  >
                    I was invited — I accept
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDoor('interest'); setError(''); }}
                    className="rounded-lg border px-4 py-3 text-sm font-bold transition-colors"
                    style={isInterest
                      ? { background: C.evergreen, borderColor: C.evergreen, color: C.cream }
                      : { background: '#fff', borderColor: C.clay, color: C.evergreenDeep }}
                    aria-pressed={isInterest}
                  >
                    I sense this is for me
                  </button>
                </div>

                {!open && (
                  <p className="mb-6 rounded-lg border bg-white p-4 text-sm leading-relaxed" style={{ borderColor: C.clay }}>
                    Responses are briefly paused — but nothing is lost. Email us at{' '}
                    <a href="mailto:pastor@gracelifecenter.com" className="underline underline-offset-4" style={{ color: C.evergreenDeep }}>pastor@gracelifecenter.com</a>{' '}
                    and we’ll walk with you personally.
                  </p>
                )}

                <form onSubmit={submit} noValidate>
                  {/* honeypot — visually hidden from humans, tempting to bots */}
                  <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
                    <label htmlFor="discipler-website">Website</label>
                    <input id="discipler-website" type="text" tabIndex={-1} autoComplete="off"
                      value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="discipler-first" className={label} style={{ color: C.evergreenDeep }}>First name</label>
                        <input id="discipler-first" required value={firstName} onChange={e => setFirstName(e.target.value)}
                          className={input} style={inputStyle} placeholder="What should we call you?" autoComplete="given-name" />
                      </div>
                      <div>
                        <label htmlFor="discipler-last" className={label} style={{ color: C.evergreenDeep }}>Last name</label>
                        <input id="discipler-last" required value={lastName} onChange={e => setLastName(e.target.value)}
                          className={input} style={inputStyle} autoComplete="family-name" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="discipler-email" className={label} style={{ color: C.evergreenDeep }}>Email</label>
                      <input id="discipler-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        className={input} style={inputStyle} placeholder="Where can we reach you?" autoComplete="email" />
                    </div>
                    <div>
                      <label htmlFor="discipler-phone" className={label} style={{ color: C.evergreenDeep }}>
                        Phone <span className="font-normal opacity-60">(optional)</span>
                      </label>
                      <input id="discipler-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        className={input} style={inputStyle} placeholder="Only if you’d like a personal text or call" autoComplete="tel" />
                    </div>

                    {isInterest ? (
                      <div>
                        <label htmlFor="discipler-walked" className={label} style={{ color: C.evergreenDeep }}>
                          Who has walked with you at {churchName}? <span className="font-normal opacity-60">(optional)</span>
                        </label>
                        <input id="discipler-walked" value={walkedWith} onChange={e => setWalkedWith(e.target.value)}
                          maxLength={200} className={input} style={inputStyle} placeholder="A discipler, a pastor, a friend on the path" />
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="discipler-inviter" className={label} style={{ color: C.evergreenDeep }}>Who invited you?</label>
                        <input id="discipler-inviter" required value={invitedBy} onChange={e => setInvitedBy(e.target.value)}
                          maxLength={200} className={input} style={inputStyle}
                          placeholder="A pastor, your discipler, a cohort leader — whoever tapped your shoulder" />
                      </div>
                    )}

                    <fieldset>
                      <legend className={label} style={{ color: C.evergreenDeep }}>
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
                      {audience === 'PATH_OTHER' && (
                        <p className="mt-3 rounded-lg border bg-white p-3.5 text-sm leading-relaxed" style={{ borderColor: C.gold, color: '#4b463f' }}>
                          No problem — the team will talk through timing with you. If you’re
                          earlier on the path, <a href="/become" className="underline underline-offset-4 font-bold" style={{ color: C.evergreenDeep }}>Become®</a>{' '}
                          is the door before this one, and the{' '}
                          <a href="/begin" className="underline underline-offset-4 font-bold" style={{ color: C.evergreenDeep }}>Welcome Track</a>{' '}
                          is where everything begins.
                        </p>
                      )}
                    </fieldset>

                    <div>
                      <label htmlFor="discipler-share" className={label} style={{ color: C.evergreenDeep }}>
                        Anything you’d like us to know — or pray about? <span className="font-normal opacity-60">(optional)</span>
                      </label>
                      <textarea id="discipler-share" rows={3} maxLength={1000}
                        value={shareNote} onChange={e => setShareNote(e.target.value)}
                        className={input} style={inputStyle} placeholder="We’d be honored to." />
                    </div>

                    {!isInterest && nextCohort && (
                      <p className="text-sm leading-relaxed" style={{ color: '#6b6459' }}>
                        Your place will be saved in <span className="font-bold" style={{ color: C.evergreenDeep }}>{cohortLabel(nextCohort)}</span>.
                      </p>
                    )}

                    {error && <p role="alert" className="text-sm" style={{ color: '#9b3535' }}>{error}</p>}

                    <button
                      type="submit"
                      disabled={
                        submitting || !open || !trackId ||
                        !firstName.trim() || !lastName.trim() || !email.trim() ||
                        (!isInterest && !invitedBy.trim())
                      }
                      className="w-full rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: C.evergreen, color: C.cream }}
                    >
                      {submitting ? 'One moment…' : isInterest ? 'Start the conversation' : 'Accept the invitation'}
                    </button>
                    <p className="text-center text-xs leading-relaxed" style={{ color: '#6b6459' }}>
                      We’ll only use this to walk with you into the Disciplers Track. Nothing else.
                    </p>
                  </div>
                </form>
              </div>
              <div className="hidden md:block">
                <img
                  src="/discipler/portrait-considering.webp"
                  alt="A man at a kitchen table in morning light, hands around a mug, a worn Bible and journal before him."
                  width={900}
                  height={1125}
                  loading="lazy"
                  className="rounded-2xl w-full h-auto"
                />
                <p className={`${garamond.className} mt-4 text-center text-sm italic`} style={{ color: '#6b6459' }}>
                  Take your time. The invitation isn’t going anywhere.
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
              <h2 className={`${garamond.className} text-3xl mb-8 text-center`} style={{ color: C.evergreen }}>
                A few honest questions
              </h2>
              <div className="space-y-3">
                {FAQS.map((f, i) => (
                  <details key={i} className="group rounded-xl border bg-white px-5 py-4" style={{ borderColor: C.clay }}>
                    <summary className="cursor-pointer list-none font-bold [&::-webkit-details-marker]:hidden" style={{ color: C.evergreenDeep }}>
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

      {/* ---- I. Footer — who and where we are ---- */}
      <footer className="px-6 py-14 text-center" style={{ background: C.forest }}>
        <p className={`${garamond.className} text-lg`} style={{ color: C.cream }}>
          {churchName} · Laurel, Maryland
        </p>
        <p className="mt-2 text-sm" style={{ color: '#CFC8B8' }}>
          A people learning to be with Jesus, become like Jesus, and bring heaven.
          Whatever brought you to this page, we’re glad you’re here.
        </p>
        <p className="mt-5 text-sm" style={{ color: '#CFC8B8' }}>
          New here?{' '}
          <a href="/begin" className="underline underline-offset-4" style={{ color: C.gold }}>Begin with the Welcome Track</a>
          <span className="mx-2 opacity-50">·</span>
          Ready to train with Jesus?{' '}
          <a href="/become" className="underline underline-offset-4" style={{ color: C.gold }}>BECOME®</a>
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
