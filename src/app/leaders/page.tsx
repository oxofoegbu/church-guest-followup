'use client';

// Run 29 — the public Leaders Track landing page ("Leadership begins with a
// call, not a position"). The fourth sibling of /begin, /become, and
// /discipler: same family, deepest register. The Welcome page opens the
// front door to a stranger; BECOME® opens the workshop door to an
// apprentice; the Disciplers page opens the companion's door; this page
// opens the door to the commissioning room — soberly, warmly, with clear
// eyes. Built from the Leaders Track design brief — warm cream + midnight
// navy + brass gold, the gold contour motif on the dark sections, literary
// serif headings, generous space. No hype, no greatness-language, no
// exclamation points, the towel not the throne, the cost counted out loud.
//
// It is an application, not a checkout. The form POSTs to the shared
// /api/enroll machinery (Leaders is in SELF_ENROLL_TRACK_SLUGS): a 6-digit
// email code (shared verify/resend), then a PENDING request in the admin
// queue. Approval creates the User + enrollment + welcome email; the
// assigned discipler is the Leadership Mentor. Nothing here is parallel
// plumbing.

import { useState, useEffect, useRef } from 'react';
import { EB_Garamond, Lato } from 'next/font/google';

const garamond = EB_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], display: 'swap' });

// The palette from the design brief (§5.1) — one family with the siblings,
// carrying the Leaders Track's own signature: midnight navy and brass, the
// night watch and the anointing light.
const C = {
  cream: '#FBF7EF',
  midnight: '#16233B',
  navy: '#1F3A5F',
  ink: '#2A2622',
  gold: '#B0894F',
  amber: '#8A5A22',
  sand: '#E7DECB',
};

type Cohort = { id: string; name: string; meetingDay: string | null; meetingTime: string | null; startDate: string | null };

// "Where are you on the path?" — the Leaders Track's own code set (§6).
// Shares EnrollmentRequest.audience with the other pages; the codes are
// namespaced (LEAD_) so each resolves to exactly one label in the queue.
const AUDIENCES = [
  { code: 'LEAD_BECOME_DONE', label: 'I’ve completed BECOME®' },
  { code: 'LEAD_BECOME_NOW', label: 'I’m currently in BECOME®' },
  { code: 'LEAD_BECOME_NOT_YET', label: 'I haven’t taken BECOME® yet' },
];

// Section C — the weekly rhythm, one clean row.
const RHYTHM = [
  { title: 'Study', line: 'A rich, self-paced module in our app each week — read, reflect, and write when your day allows.' },
  { title: 'Gather', line: 'One 90-minute conversation a week with the others being formed alongside you.' },
  { title: 'Meet your mentor', line: 'A weekly meeting with your assigned Leadership Mentor — every week, without exception.' },
  { title: 'Practice', line: 'A real activation each week — a leadership testimony, hidden service, feet washing, a personal retreat.' },
];

// Section D — F.L.O.P.A., five quiet marks, one honest sentence each.
const FLOPA = [
  { letter: 'F', name: 'Faithfulness', line: 'Trustworthy in the small and unseen, long before anyone is watching.' },
  { letter: 'L', name: 'Love', line: 'The kind that lays itself down — the first mark of anyone who leads like Jesus.' },
  { letter: 'O', name: 'Obedience', line: 'A life that says yes to God even when it costs, and especially when no one would know.' },
  { letter: 'P', name: 'Prayerfulness', line: 'Leadership drawn from the secret place, not from talent or nerve.' },
  { letter: 'A', name: 'Authority', line: 'Spiritual weight that kneels — praying for the sick, carrying others, never lording it over anyone.' },
];

// Section E — count the cost, plain rows, no softening.
const COST = [
  { t: 'Eleven weeks', d: 'of weekly study, a weekly gathering, and a real practice to live out — for the whole eleven weeks.' },
  { t: 'A weekly meeting with your mentor', d: 'This one is non-negotiable. It is your responsibility to schedule and keep, and if the meetings don’t happen, the track isn’t happening.', hard: true },
  { t: 'Practices that cost pride', d: 'A personal retreat, hidden service, feet washing, and more — most of it will cost your pride more than your time.' },
  { t: 'The Leadership Covenant and Code of Conduct', d: 'Signed at the end, at commissioning, with eyes fully open — after the formation, never as a checkbox at the door.' },
];

const FAQS = [
  {
    q: 'What if I don’t feel ready?',
    a: 'Then you’re in good company. Moses asked “Who am I?” at the burning bush, and God never answered the question — He said, “I will be with you.” Mary was a teenager at home; Peter was mid-shift. Feeling unqualified is where most true calls begin. It is not a disqualification. It may be the best sign you’re ready to be formed.',
  },
  {
    q: 'Do I need to have completed BECOME® first?',
    a: 'Ordinarily, yes — the path runs Guest → Follower → Disciple → Leader, one step at a time, and BECOME® is the ground the Leaders Track builds on. But a pastor’s recommendation can carry an exception. If you haven’t walked BECOME® yet, tell us on the form; we’ll help you find the right next step rather than simply turning you away.',
  },
  {
    q: 'What exactly does the mentor meeting involve?',
    a: 'Each week you meet with an assigned Leadership Mentor — a leader a little farther down the road who reads your reflections, prays with you, talks through what you’re living out, and holds you gently accountable. Their end-of-track report helps discern your readiness to be commissioned. Accountability here isn’t punishment; it’s the secret ingredient of transformation.',
  },
  {
    q: 'What happens at commissioning?',
    a: 'Week eleven is a Commissioning and Anointing Service — not a graduation. You sign the Leadership Covenant, hear the Declaration of Sending, are prayed over and anointed, and are given real responsibility in the house. As we say: this is not graduation, it’s activation.',
  },
  {
    q: 'What happens after — where do commissioned leaders serve?',
    a: 'Into real service in the life of the church — shepherding, leading, praying for others, carrying spiritual weight in a Spirit-filled community of servants who together yield to the Lordship of Jesus. Not a title on a card. A towel in your hand.',
  },
  {
    q: 'What if I start and realize it’s not my season?',
    a: 'Then you may step back, honestly and without shame. Discerning that the timing isn’t right is itself a faithful act, and nothing you learn while walking with Jesus is ever wasted. The door stays open for when your season comes.',
  },
];

function cohortLabel(c: Cohort): string {
  const parts: string[] = [c.name];
  const meet: string[] = [];
  if (c.meetingDay) meet.push(`${c.meetingDay}s`);
  if (c.meetingTime) meet.push(`at ${c.meetingTime}`);
  if (c.startDate) {
    const d = new Date(c.startDate);
    meet.push(`· begins ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}`);
  }
  if (meet.length) parts.push(`— ${meet.join(' ')}`);
  return parts.join(' ');
}

export default function LeadersPage() {
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
  const [reference, setReference] = useState('');
  const [calling, setCalling] = useState('');
  const [cohortId, setCohortId] = useState<string>('');
  const [shareNote, setShareNote] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const costRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/leaders/options')
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
          invitedBy: reference,   // the reference leader — reuses the invitedBy column
          callingNote: calling,   // Run 29 — the heart of the application
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
  const inputStyle = { borderColor: C.sand, color: C.ink } as React.CSSProperties;
  const label = 'block text-sm font-bold mb-1.5';

  // The gold contour texture as a CSS background for the dark sections. It
  // has clean center space and gold lines only at the corners, so text sits
  // safely over the middle (§5.3.1).
  const contourBg: React.CSSProperties = {
    background: `${C.midnight} url('/leaders/texture-contours.webp') center/cover no-repeat`,
  };

  // Hero type fragments — shared by the desktop overlay and the mobile stack.
  const heroKicker = (
    <p className="text-xs sm:text-sm tracking-[0.25em] uppercase mb-6" style={{ color: C.gold }}>
      {churchName} · The Leaders Track
    </p>
  );
  const heroH1 = (
    <h1 className={`${garamond.className} text-4xl sm:text-5xl leading-tight`} style={{ color: C.cream }}>
      Leadership begins with a call, not a position.
    </h1>
  );
  const heroSub = (
    <p className="mt-6 text-base sm:text-lg leading-relaxed" style={{ color: '#D9E2EC' }}>
      If God has been stirring you to shepherd, serve, and raise others, the Leaders Track is an
      eleven-week formation journey that ends on your knees, being commissioned and sent. It will
      cost you something. It was always meant to.
    </p>
  );
  const heroButtons = (align: 'start' | 'center') => (
    <div className={`mt-10 flex flex-col gap-4 ${align === 'center' ? 'items-center' : 'items-start'}`}>
      <button
        onClick={() => scrollTo(formRef)}
        className="rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90"
        style={{ background: C.gold, color: C.midnight }}
      >
        Apply for the Leaders Track
      </button>
      <button
        onClick={() => scrollTo(costRef)}
        className="text-sm underline underline-offset-4 opacity-80 hover:opacity-100"
        style={{ color: '#D9E2EC' }}
      >
        What it asks of you
      </button>
    </div>
  );

  return (
    <div className={lato.className} style={{ background: C.cream, color: C.ink, minHeight: '100vh' }}>
      {/* ---- A. Hero — the call ---- */}
      {/* Desktop / tablet: the approved photograph full-bleed, type in live
          HTML over the dark left two-thirds. The left region is near-black,
          so cream reads at ~12:1 with no scrim; a whisper of navy gradient
          is insurance for the gold kicker at tight breakpoints (AA-verified). */}
      <header className="relative hidden md:flex items-center overflow-hidden" style={{ background: C.midnight, minHeight: '560px' }}>
        <img
          src="/leaders/hero-wide.webp"
          alt="A man in quiet prayer, lit by warm light against a deep blue darkness."
          width={1915}
          height={821}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: '78% 45%' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(22,35,59,0.35), rgba(22,35,59,0.15) 34%, transparent 60%)' }}
        />
        <div className="relative z-10 w-full">
          <div className="mx-auto max-w-6xl px-8 lg:px-12 py-24">
            <div className="max-w-[56%] lg:max-w-xl">
              {heroKicker}
              {heroH1}
              {heroSub}
              {heroButtons('start')}
            </div>
          </div>
        </div>
      </header>
      {/* Mobile: the left darkness collapses, so stack rather than overlay —
          a solid Midnight Navy block carries the type, the image follows
          below, pre-cropped to 4:5 around the praying man. */}
      <header className="md:hidden" style={{ background: C.midnight }}>
        <div className="px-6 pt-16 pb-12 text-center">
          {heroKicker}
          {heroH1}
          {heroSub}
          {heroButtons('center')}
        </div>
        <img
          src="/leaders/hero-mobile.webp"
          alt="A man in quiet prayer, lit by warm light against a deep blue darkness."
          width={656}
          height={821}
          className="w-full h-auto"
        />
      </header>

      {/* ---- B. Is this you? (the marks of a call) — split with the portrait ---- */}
      <section className="relative overflow-hidden" style={{ background: C.midnight }}>
        {/* Desktop: portrait right on its own clean navy, HTML text left. */}
        <div className="hidden md:grid md:grid-cols-2 md:items-stretch">
          <div className="flex items-center px-8 lg:px-12 py-20">
            <div className="max-w-md">
              <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.cream }}>
                Is this you?
              </h2>
              <ul className="space-y-4 text-base leading-relaxed" style={{ color: '#D9E2EC' }}>
                <li className="flex gap-3"><span aria-hidden="true" style={{ color: C.gold }}>—</span><span>A stirring that won’t leave, however quietly it began.</span></li>
                <li className="flex gap-3"><span aria-hidden="true" style={{ color: C.gold }}>—</span><span>A leader has named something in you — “I see it.”</span></li>
                <li className="flex gap-3"><span aria-hidden="true" style={{ color: C.gold }}>—</span><span>People already come to you, and you’re not quite sure why.</span></li>
                <li className="flex gap-3"><span aria-hidden="true" style={{ color: C.gold }}>—</span><span>A hunger to see others find and follow Jesus.</span></li>
              </ul>
              <p className={`${garamond.className} mt-6 text-lg italic leading-relaxed`} style={{ color: C.gold }}>
                If that’s you — even if you feel unqualified — keep reading. Feeling unqualified is
                where most calls begin.
              </p>
            </div>
          </div>
          <img
            src="/leaders/portrait-square.webp"
            alt="A woman in a light-blue shirt smiling warmly against a deep navy background with gold contour lines."
            width={1254}
            height={1254}
            loading="lazy"
            className="h-full w-full object-cover"
            style={{ objectPosition: '65% 50%' }}
          />
        </div>
        {/* Mobile: text over the contour center, portrait below. */}
        <div className="md:hidden">
          <div className="px-6 py-16" style={contourBg}>
            <h2 className={`${garamond.className} text-3xl mb-6 text-center`} style={{ color: C.cream }}>
              Is this you?
            </h2>
            <ul className="mx-auto max-w-md space-y-3 text-base leading-relaxed" style={{ color: '#D9E2EC' }}>
              <li className="flex gap-3"><span aria-hidden="true" style={{ color: C.gold }}>—</span><span>A stirring that won’t leave, however quietly it began.</span></li>
              <li className="flex gap-3"><span aria-hidden="true" style={{ color: C.gold }}>—</span><span>A leader has named something in you — “I see it.”</span></li>
              <li className="flex gap-3"><span aria-hidden="true" style={{ color: C.gold }}>—</span><span>People already come to you, and you’re not quite sure why.</span></li>
              <li className="flex gap-3"><span aria-hidden="true" style={{ color: C.gold }}>—</span><span>A hunger to see others find and follow Jesus.</span></li>
            </ul>
            <p className={`${garamond.className} mt-6 text-lg italic leading-relaxed text-center`} style={{ color: C.gold }}>
              If that’s you — even if you feel unqualified — keep reading. Feeling unqualified is
              where most calls begin.
            </p>
          </div>
          <img
            src="/leaders/portrait-square.webp"
            alt="A woman in a light-blue shirt smiling warmly against a deep navy background with gold contour lines."
            width={1254}
            height={1254}
            loading="lazy"
            className="w-full h-auto"
          />
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-6">
        {/* ---- C. What the Leaders Track is ---- */}
        <section className="py-16 sm:py-20">
          <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.navy }}>
            What the Leaders Track is
          </h2>
          <p className="text-center leading-relaxed mb-10">
            Eleven weeks, and a commissioning. The weekly rhythm is simple, and it is real:
          </p>
          <ol className="space-y-4">
            {RHYTHM.map((m, i) => (
              <li key={i} className="flex gap-4 rounded-xl border bg-white p-5" style={{ borderColor: C.sand }}>
                <span
                  className={`${garamond.className} flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-lg`}
                  style={{ border: `1px solid ${C.gold}`, color: C.gold }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold" style={{ color: C.navy }}>{m.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: '#4b463f' }}>{m.line}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center leading-relaxed" style={{ color: '#4b463f' }}>
            Where it leads: commissioning into real service in the house — not a certificate, but
            a sending.
          </p>
        </section>
      </div>

      {/* ---- D. What it forms — F.L.O.P.A. (the heart, dark, over the contours) ---- */}
      <section className="px-6 py-20 sm:py-28" style={contourBg}>
        <div className="mx-auto max-w-2xl">
          <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.cream }}>
            What it forms
          </h2>
          <p className="text-center leading-relaxed mb-12" style={{ color: '#D9E2EC' }}>
            Eleven weeks, one aim: to make you a leader Jesus can trust, Heaven can deploy, and
            people can safely follow. These five marks are the character of every leader in our
            family — Faithfulness, Love, Obedience, Prayerfulness, and Authority.
          </p>
          <div className="space-y-6">
            {FLOPA.map(f => (
              <div key={f.letter} className="flex gap-5">
                <span
                  className={`${garamond.className} flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl`}
                  style={{ border: `1px solid ${C.gold}`, color: C.gold }}
                  aria-hidden="true"
                >
                  {f.letter}
                </span>
                <div className="pt-1">
                  <h3 className={`${garamond.className} text-xl`} style={{ color: C.cream }}>{f.name}</h3>
                  <p className="mt-1 leading-relaxed" style={{ color: '#C7D2DE' }}>{f.line}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-14 max-w-xl text-center">
            <p className={`${garamond.className} text-2xl italic leading-relaxed`} style={{ color: C.cream }}>
              We lead the way Jesus led — with a towel, not a throne.
            </p>
            <p className="mt-5 leading-relaxed" style={{ color: '#D9E2EC' }}>
              Before God trusts you with a platform, He shapes you in the pasture. Authority in
              this house means kneeling to wash feet, praying for the sick, and carrying real
              spiritual weight — never status. In the Kingdom, the way up is down.
            </p>
            <p className={`${garamond.className} mt-6 text-lg`} style={{ color: C.gold }}>
              The towel in your hand is more powerful than the title on your card.
            </p>
          </div>
        </div>
      </section>

      {/* ---- E. What it will ask of you (count the cost) — with the mentorship photo ---- */}
      <section ref={costRef} className="scroll-mt-6" style={{ background: C.cream }}>
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.navy }}>
            What it will ask of you
          </h2>
          <p className="mx-auto max-w-2xl text-center leading-relaxed mb-10">
            Jesus counted the cost out loud, and so will we. None of it earns God’s love. All of
            it positions you to be formed into a leader He can trust.
          </p>
          {/* The mentorship image sits with the cost — so the non-negotiable
              weekly mentor meeting has a face and a warmth (§5.3.1). */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
            <figure className="overflow-hidden rounded-2xl">
              <img
                src="/leaders/mentorship.webp"
                alt="Two men in honest conversation at a table with an open Bible between them."
                width={1536}
                height={1024}
                loading="lazy"
                className="w-full h-auto"
              />
              <figcaption className="mt-3 text-center text-sm italic leading-relaxed" style={{ color: '#6b6459' }}>
                The weekly mentor meeting — the requirement with a face.
              </figcaption>
            </figure>
            <ul className="space-y-4">
              {COST.map((c, i) => (
                <li
                  key={i}
                  className="rounded-xl border bg-white p-5"
                  style={{ borderColor: c.hard ? C.gold : C.sand, borderWidth: c.hard ? 2 : 1 }}
                >
                  <h3 className="font-bold" style={{ color: c.hard ? C.amber : C.navy }}>{c.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: '#4b463f' }}>{c.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---- F. The story you're joining (dark, over the contours) ---- */}
      <section className="px-6 py-16 sm:py-20" style={contourBg}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.cream }}>
            The story you’re joining
          </h2>
          <p className="leading-relaxed" style={{ color: '#D9E2EC' }}>
            From Azusa Street, to a small prayer group at the University of Ife, to a student
            meeting on February 18, 1980, where God spoke a word that birthed our movement:
            <span className={`${garamond.className} italic`} style={{ color: C.cream }}> “Start preparing
            people for the Great Harvest.”</span> More than forty years later, that preparation
            continues — and this track is where it happens. You are not joining a program. You are
            answering a call that has been sounding for a generation.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-6">
        {/* ---- G. The application form ---- */}
        <section ref={formRef} className="py-16 sm:py-20 scroll-mt-6">
          {step === 'done' ? (
            <div className="text-center py-8">
              <h2 className={`${garamond.className} text-3xl mb-6`} style={{ color: C.navy }}>
                Thank you. Your application is in caring hands.
              </h2>
              <p className="mx-auto max-w-lg text-lg leading-relaxed">
                A pastor will review it and reach out personally within a few days — usually with a
                conversation, not just a confirmation. If this is your season, we’ll walk you into
                the next cohort and pair you with your Leadership Mentor. And if it’s not quite your
                season yet, we’ll tell you the truth in love and show you the next step. Either way,
                you’ve been heard, and we’re grateful for your yes.
              </p>
            </div>
          ) : step === 'verify' ? (
            <div className="mx-auto max-w-md">
              <h2 className={`${garamond.className} text-3xl mb-4 text-center`} style={{ color: C.navy }}>
                One small thing
              </h2>
              <p className="text-center leading-relaxed mb-8">
                We’ve sent a 6-digit code to <strong>{email}</strong> — just so we know how to reach
                you. Type it below to complete your application.
              </p>
              <form onSubmit={verify} noValidate>
                <label htmlFor="leaders-code" className="sr-only">6-digit code from your email</label>
                <input
                  id="leaders-code"
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
                  {submitting ? 'One moment…' : 'Send my application'}
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
                If God is calling, we would be honored to walk this with you.
              </h2>
              <p className="text-center leading-relaxed mb-8">
                Tell us where you are, and a pastor will reach out — personally.
              </p>
              {!open && (
                <p className="mb-6 rounded-lg border bg-white p-4 text-sm leading-relaxed" style={{ borderColor: C.sand }}>
                  Applications are briefly paused — but the call doesn’t expire. Reach out to a
                  pastor, or come back soon and we’ll walk you into the next cohort.
                </p>
              )}
              <form onSubmit={submit} noValidate>
                {/* honeypot — visually hidden from humans, tempting to bots */}
                <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
                  <label htmlFor="leaders-website">Website</label>
                  <input id="leaders-website" type="text" tabIndex={-1} autoComplete="off"
                    value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="leaders-first" className={label} style={{ color: C.navy }}>First name</label>
                      <input id="leaders-first" required value={firstName} onChange={e => setFirstName(e.target.value)}
                        className={input} style={inputStyle} placeholder="What should we call you?" autoComplete="given-name" />
                    </div>
                    <div>
                      <label htmlFor="leaders-last" className={label} style={{ color: C.navy }}>Last name</label>
                      <input id="leaders-last" required value={lastName} onChange={e => setLastName(e.target.value)}
                        className={input} style={inputStyle} autoComplete="family-name" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="leaders-email" className={label} style={{ color: C.navy }}>Email</label>
                    <input id="leaders-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className={input} style={inputStyle} placeholder="Where can we reach you?" autoComplete="email" />
                  </div>
                  <div>
                    <label htmlFor="leaders-phone" className={label} style={{ color: C.navy }}>
                      Phone <span className="font-normal opacity-60">(recommended)</span>
                    </label>
                    <input id="leaders-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className={input} style={inputStyle} placeholder="Your mentor will want to reach you personally" autoComplete="tel" />
                  </div>

                  <fieldset>
                    <legend className={label} style={{ color: C.navy }}>Where are you on the path?</legend>
                    <div className="space-y-2">
                      {AUDIENCES.map(a => (
                        <label key={a.code}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm transition-colors"
                          style={{ borderColor: audience === a.code ? C.gold : C.sand }}
                        >
                          <input type="radio" name="audience" value={a.code}
                            checked={audience === a.code}
                            onChange={() => setAudience(a.code)}
                            className="accent-[#B0894F]" />
                          <span>{a.label}</span>
                        </label>
                      ))}
                    </div>
                    {audience === 'LEAD_BECOME_NOT_YET' && (
                      <p className="mt-3 rounded-lg border p-3 text-sm leading-relaxed" style={{ borderColor: C.sand, background: '#fff', color: '#4b463f' }}>
                        The path usually runs through BECOME® first — it’s the ground the Leaders
                        Track builds on. You’re still welcome to apply, and a pastor’s recommendation
                        can carry an exception. If you’d like to start there, you can{' '}
                        <a href="/become" className="underline underline-offset-4" style={{ color: C.navy }}>begin BECOME® here</a>.
                      </p>
                    )}
                  </fieldset>

                  <div>
                    <label htmlFor="leaders-reference" className={label} style={{ color: C.navy }}>
                      A pastor or leader who knows your walk
                    </label>
                    <input id="leaders-reference" required value={reference} onChange={e => setReference(e.target.value)}
                      className={input} style={inputStyle} placeholder="One leader at GLC or CRM who knows you well" />
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#6b6459' }}>
                      We may reach out to them. In our family, leaders are recognized through
                      faithfulness, not self-nomination.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="leaders-calling" className={label} style={{ color: C.navy }}>
                      In a sentence or two: why do you sense God calling you to lead?
                    </label>
                    <textarea id="leaders-calling" required rows={4} maxLength={1000}
                      value={calling} onChange={e => setCalling(e.target.value)}
                      className={input} style={inputStyle} placeholder="There’s no right answer. Just tell the truth." />
                  </div>

                  {cohorts.length > 0 && (
                    <div>
                      <label htmlFor="leaders-cohort" className={label} style={{ color: C.navy }}>
                        Which cohort?
                      </label>
                      <select id="leaders-cohort" value={cohortId} onChange={e => setCohortId(e.target.value)}
                        className={input} style={inputStyle}>
                        <option value="">The next available cohort</option>
                        {cohorts.map(c => (
                          <option key={c.id} value={c.id}>{cohortLabel(c)}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="leaders-share" className={label} style={{ color: C.navy }}>
                      Anything you’d like us to know — or pray about? <span className="font-normal opacity-60">(optional)</span>
                    </label>
                    <textarea id="leaders-share" rows={3} maxLength={1000}
                      value={shareNote} onChange={e => setShareNote(e.target.value)}
                      className={input} style={inputStyle} placeholder="We’d be honored to." />
                  </div>

                  {error && <p role="alert" className="text-sm" style={{ color: '#9b3535' }}>{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting || !open || !firstName.trim() || !lastName.trim() || !email.trim() || !reference.trim() || !calling.trim()}
                    className="w-full rounded-lg px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: C.navy, color: C.cream }}
                  >
                    {submitting ? 'One moment…' : 'Send my application'}
                  </button>
                  <p className="text-center text-xs leading-relaxed" style={{ color: '#6b6459' }}>
                    We’ll only use this to walk with you toward the Leaders Track. Nothing else.
                  </p>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* ---- H. A few honest questions ---- */}
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

      {/* ---- I. Footer ---- */}
      <footer className="px-6 py-14 text-center" style={contourBg}>
        <p className={`${garamond.className} text-lg`} style={{ color: C.cream }}>
          {churchName} · Laurel, Maryland
        </p>
        <p className="mt-2 text-sm" style={{ color: '#9fb3c8' }}>
          Raising leaders who carry heaven everywhere they go.
        </p>
        <p className="mt-5 text-sm" style={{ color: '#9fb3c8' }}>
          New here?{' '}
          <a href="/begin" className="underline underline-offset-4" style={{ color: C.gold }}>Begin with the Welcome Track</a>
          <span className="mx-2 opacity-50">·</span>
          Ready to train with Jesus?{' '}
          <a href="/become" className="underline underline-offset-4" style={{ color: C.gold }}>BECOME®</a>
        </p>
        <p className="mt-4 text-xs" style={{ color: C.gold }}>
          BE with Jesus · BECOME like Jesus · BRING heaven
        </p>
      </footer>
    </div>
  );
}
