'use client';

// Run 33 — The Gathering, a holding / interest page for a brand-new expression
// of Grace Life Center: a gentle, contemplative, Scripture-formed online
// community (Saturday evenings, Zoom) for the unchurched, dechurched, and
// spiritually weary. Uniquely branded for seekers — warm candlelight, an
// unhurried literary serif, lots of air. Its one job for now: invite two kinds
// of people to raise a hand — those who'd help launch it (a team of 10-15) and
// those who'd love to gather with us when it begins. Both post to /api/gathering
// (email only; no accounts, no DB). Voice from the concept doc: "tend a fire,
// not build a crowd"; "you don't have to believe first to belong."
import { useState } from 'react';
import { EB_Garamond, Lato } from 'next/font/google';
import StandaloneNav from '@/components/site/StandaloneNav';
import OtpDialog from '@/components/site/OtpDialog';

const garamond = EB_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], display: 'swap' });

// A warm, candle-lit sub-palette — its own gentle identity, drawn from the
// motifs Pastor Okezie made for The Gathering.
const C = {
  cream: '#FBF7EF',
  cream2: '#F4ECDD',
  paper: '#FFFDF8',
  ink: '#2B2620',
  soft: '#6C6358',
  warm: '#241812', // deep warm brown (hero base / dark sections)
  warm2: '#160F0A',
  umber: '#33201A',
  amber: '#B07C3C', // candle-gold accent on light
  glow: '#E7CF9E', // soft gold on dark
  ember: '#A63D1F',
  emberdk: '#8F3418',
  line: '#E2D5C1',
};

type Interest = 'LAUNCH_TEAM' | 'GATHER';

function InterestForm({ interest, cta, placeholder }: { interest: Interest; cta: string; placeholder: string }) {
  const [f, setF] = useState({ name: '', email: '', note: '', website: '' });
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
      const res = await fetch('/api/gathering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name, email: f.email, note: f.note, interest, website: '' }),
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    background: '#fff',
    padding: '11px 13px',
    fontSize: 15,
    color: C.ink,
  };

  if (status === 'done') {
    return (
      <div style={{ borderRadius: 14, border: `1px solid ${C.line}`, background: C.paper, padding: 28, textAlign: 'center' }}>
        <p className={garamond.className} style={{ fontSize: 22, color: C.umber }}>Thank you — we have you.</p>
        <p style={{ marginTop: 10, fontSize: 15, color: C.soft }}>
          {interest === 'LAUNCH_TEAM'
            ? 'We’ll reach out personally as the launch team comes together.'
            : 'We’ll let you know the moment The Gathering begins.'}
        </p>
      </div>
    );
  }

  return (
    <>
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: C.umber }} htmlFor={`${interest}-name`}>Your name</label>
        <input id={`${interest}-name`} style={inputStyle} required value={f.name} onChange={set('name')} placeholder="However you’d like to be known" />
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: C.umber }} htmlFor={`${interest}-email`}>Email</label>
        <input id={`${interest}-email`} type="email" style={inputStyle} required value={f.email} onChange={set('email')} placeholder="you@email.com" />
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: C.umber }} htmlFor={`${interest}-note`}>
          A little about you <span style={{ fontWeight: 400, color: C.soft }}>(optional)</span>
        </label>
        <textarea id={`${interest}-note`} style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }} value={f.note} onChange={set('note')} placeholder={placeholder} />
      </div>
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} value={f.website} onChange={set('website')} />
      {status === 'error' ? <p style={{ fontSize: 14, color: C.ember }}>{error}</p> : null}
      <button
        type="submit"
        disabled={status === 'sending'}
        style={{
          justifySelf: 'start',
          borderRadius: 40,
          background: C.ember,
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          padding: '12px 24px',
          border: 'none',
          cursor: 'pointer',
          opacity: status === 'sending' ? 0.6 : 1,
        }}
      >
        {status === 'sending' ? 'Sending…' : cta}
      </button>
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

const RHYTHM = [
  { t: 'Stillness & prayer', d: 'We begin by slowing down — a few quiet minutes to breathe and turn toward God.' },
  { t: 'Simple worship', d: 'A song or two, lyrics on the screen. Sing if you like, or just listen.' },
  { t: 'Scripture, book by book', d: 'Slow, unhurried teaching through the Word — pastoral, not academic.' },
  { t: 'Quiet reflection', d: 'A little silence to notice what stirred, and to write down what resonates.' },
  { t: 'Honest questions', d: 'Ask anything — out loud or anonymously. Doubt is welcome here.' },
  { t: 'Prayer for one another', d: 'We pray together. No fixing, no advising, no correcting — only love.' },
];

const FORWHOM = [
  'New to faith, or never really had one',
  'Worn out or wounded by church',
  'Carrying quiet grief, shame, or questions',
  'Hungry for depth, prayer, and formation',
  'Curious about Jesus, unsure where to start',
];

export default function TheGatheringPage() {
  return (
    <div className={lato.className} style={{ background: C.cream, color: C.ink }}>
      <StandaloneNav serifClass={garamond.className} />

      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', background: C.warm2 }}>
        <img
          src="/thegathering/hero.webp"
          alt="Several people's hands folded in prayer around a wooden table, an open Bible and a single lit candle between them in warm low light."
          // eslint-disable-next-line
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
        />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(22,15,10,0.72) 0%, rgba(22,15,10,0.55) 38%, rgba(22,15,10,0.72) 100%)' }} />
        <div style={{ position: 'relative', maxWidth: 1160, margin: '0 auto', padding: '150px 24px 108px' }}>
          <div style={{ maxWidth: 680 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: C.glow }}>
              The Gathering · An expression of Grace Life Center
            </p>
            <h1 className={garamond.className} style={{ margin: '18px 0 20px', fontSize: 'clamp(40px, 6vw, 62px)', lineHeight: 1.05, color: '#fff', fontWeight: 600 }}>
              A safe place to meet Jesus.
            </h1>
            <p style={{ fontSize: 'clamp(17px, 2.4vw, 20px)', lineHeight: 1.6, color: 'rgba(251,247,239,0.92)', maxWidth: 600 }}>
              A gentle, Scripture-centered community for anyone longing for depth, healing, and an
              unhurried walk with Jesus. No pressure. No pretending. Just Jesus.
            </p>
            <p style={{ marginTop: 26, fontSize: 14.5, color: 'rgba(251,247,239,0.82)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#fff' }}>Saturdays · 7:00 PM</span>
              <span aria-hidden="true">·</span>
              <span>Online via Zoom</span>
              <span aria-hidden="true">·</span>
              <span style={{ color: C.glow, fontWeight: 700 }}>Launching soon</span>
            </p>
            <div style={{ marginTop: 32, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a href="#launch-team" style={{ borderRadius: 40, background: C.ember, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 26px', textDecoration: 'none' }}>
                Join the launch team
              </a>
              <a href="#gather" style={{ borderRadius: 40, border: '1.5px solid rgba(255,255,255,0.55)', color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 26px', textDecoration: 'none' }}>
                Tell me when it launches
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Not a crowd — a fire */}
      <section style={{ padding: '86px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.amber, marginBottom: 16 }}>
            The invitation
          </p>
          <h2 className={garamond.className} style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.14, color: C.umber, marginBottom: 20, fontWeight: 600 }}>
            Not to build a crowd — but to tend a fire.
          </h2>
          <p style={{ fontSize: 20, lineHeight: 1.62, color: C.ink }}>
            We believe God is inviting us to open a space. Not a program to perform, not a crowd to
            gather — a small, warm fire to sit around. A place where wounded people find healing
            rather than shame, where questions are welcome, and where the Word forms us slowly.
          </p>
          <p className={garamond.className} style={{ fontStyle: 'italic', fontSize: 23, color: C.amber, marginTop: 24 }}>
            You don’t have to believe first to belong. Belonging makes room for belief.
          </p>
        </div>
      </section>

      {/* What a gathering feels like */}
      <section style={{ padding: '86px 24px', background: C.cream2 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ maxWidth: 680, marginBottom: 44 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.amber, marginBottom: 16 }}>
              A Saturday evening · 75–90 minutes
            </p>
            <h2 className={garamond.className} style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.14, color: C.umber, fontWeight: 600 }}>
              What an evening feels like.
            </h2>
            <p style={{ marginTop: 16, fontSize: 18, lineHeight: 1.6, color: C.soft }}>
              The same calm, predictable rhythm each week — enough to feel safe, quiet enough to hear
              God. Come as you are; leave gently carried.
            </p>
          </div>
          <div style={{ display: 'grid', gap: 22, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {RHYTHM.map((r, i) => (
              <div key={r.t} style={{ display: 'flex', gap: 16 }}>
                <span className={garamond.className} style={{ fontSize: 22, color: C.amber, lineHeight: 1.1, minWidth: 28 }}>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className={garamond.className} style={{ fontSize: 20, color: C.umber, marginBottom: 5 }}>{r.t}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.55, color: C.soft }}>{r.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who this is for (dark) */}
      <section style={{ padding: '86px 24px', background: C.warm, color: C.cream }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.glow, marginBottom: 16 }}>
            Who this is for
          </p>
          <h2 className={garamond.className} style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.14, color: '#fff', marginBottom: 26, fontWeight: 600 }}>
            Especially for the ones who feel far.
          </h2>
          <ul style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', listStyle: 'none', padding: 0, margin: 0 }}>
            {FORWHOM.map((w) => (
              <li key={w} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 16.5, lineHeight: 1.5, color: 'rgba(251,247,239,0.9)' }}>
                <span aria-hidden="true" style={{ color: C.glow, marginTop: 2 }}>✦</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
          <p className={garamond.className} style={{ fontStyle: 'italic', fontSize: 22, color: C.glow, marginTop: 30, maxWidth: 620 }}>
            Wherever you’re standing, and whichever way you’re facing — there’s room for you here.
          </p>
        </div>
      </section>

      {/* The two invitations */}
      <section style={{ padding: '86px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 46px' }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.amber, marginBottom: 16 }}>
              Two ways to say yes
            </p>
            <h2 className={garamond.className} style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.14, color: C.umber, fontWeight: 600 }}>
              Come help us light it — or come be warmed by it.
            </h2>
            <p style={{ marginTop: 16, fontSize: 18, lineHeight: 1.6, color: C.soft }}>
              We’re just beginning. Raise a hand below and we’ll reach out personally — no obligation,
              no pressure.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 26, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {/* Launch team */}
            <div id="launch-team" style={{ borderRadius: 18, border: `1px solid ${C.line}`, background: C.paper, padding: 34, scrollMarginTop: 90 }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.amber, marginBottom: 12 }}>
                The launch team · we’re looking for 10–15
              </p>
              <h3 className={garamond.className} style={{ fontSize: 26, color: C.umber, marginBottom: 12 }}>Help us light it.</h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.soft, marginBottom: 14 }}>
                We’re gathering a small team of gentle, prayerful people — good listeners, comfortable
                with questions, not looking for a spotlight. Facilitators, prayer leaders, a Zoom host,
                moderators, follow-up carers. This is ministry of presence, not performance.
              </p>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.soft, marginBottom: 24 }}>
                If you feel drawn to gentleness over noise, depth over speed, and people over platforms —
                this may be for you.
              </p>
              <InterestForm interest="LAUNCH_TEAM" cta="Count me in" placeholder="A little about you, and why this draws you." />
            </div>

            {/* Gather with us */}
            <div id="gather" style={{ borderRadius: 18, border: `1px solid ${C.line}`, background: C.paper, padding: 34, scrollMarginTop: 90 }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.amber, marginBottom: 12 }}>
                Gather with us · when we launch
              </p>
              <h3 className={garamond.className} style={{ fontSize: 26, color: C.umber, marginBottom: 12 }}>Come be warmed by it.</h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.soft, marginBottom: 14 }}>
                Not sure about any of this, but something in you leaned in? That’s enough. Leave your
                name and we’ll gently let you know the moment The Gathering begins — a Saturday evening,
                online, wherever you are.
              </p>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: C.soft, marginBottom: 24 }}>
                No commitment. No follow-up you didn’t ask for. Just an open door when the fire is lit.
              </p>
              <InterestForm interest="GATHER" cta="Tell me when it launches" placeholder="Anything you’d like us to know (optional)." />
            </div>
          </div>
        </div>
      </section>

      {/* Closing blessing */}
      <section style={{ padding: '86px 24px', background: C.warm2, color: C.cream, textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p className={garamond.className} style={{ fontSize: 'clamp(24px, 3.4vw, 30px)', lineHeight: 1.4, color: '#fff', fontStyle: 'italic' }}>
            “Come help us make a place where people can meet Jesus, be healed, and become whole. Not
            loudly. Not hurriedly. But faithfully.”
          </p>
          <p style={{ marginTop: 22, fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.glow }}>
            Welcome to The Gathering
          </p>
          <p style={{ marginTop: 8, fontSize: 14.5, color: 'rgba(251,247,239,0.7)' }}>
            Pastor Okezie Ofoegbu · Grace Life Center
          </p>
        </div>
      </section>

      {/* Minimal footer */}
      <footer style={{ padding: '40px 24px', background: '#100A07', color: 'rgba(251,247,239,0.55)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={garamond.className} style={{ fontSize: 17, color: 'rgba(251,247,239,0.85)' }}>
            Grace Life <span style={{ color: C.glow }}>Center</span>
          </span>
          <div style={{ display: 'flex', gap: 22, fontSize: 14 }}>
            <a href="/home" style={{ color: 'rgba(251,247,239,0.7)', textDecoration: 'none' }}>Main site</a>
            <a href="/journey" style={{ color: 'rgba(251,247,239,0.7)', textDecoration: 'none' }}>The Journey</a>
            <a href="/prayer" style={{ color: 'rgba(251,247,239,0.7)', textDecoration: 'none' }}>Prayer</a>
          </div>
          <span style={{ fontSize: 12.5 }}>© 2026 Grace Life Center · Charismatic Renewal Ministries</span>
        </div>
      </footer>
    </div>
  );
}
