'use client';

// Run 47 — shared email-verification (OTP) dialog for every public website
// contact form. Self-contained inline styles so it drops cleanly into both the
// Tailwind (site) forms and the inline-styled Gathering page. Given a pending
// WebContact { id, email }, it collects the 6-digit code, calls
// /api/webcontact/verify (+ /resend), and calls onVerified() on success.
import { useEffect, useState } from 'react';

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,15,10,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};
const card: React.CSSProperties = {
  position: 'relative', width: '100%', maxWidth: 400, background: '#FBF7EF',
  border: '1px solid #E2D5C1', borderRadius: 18, padding: '30px 26px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)', fontFamily: 'ui-sans-serif,system-ui,sans-serif',
};
const closeBtn: React.CSSProperties = {
  position: 'absolute', top: 10, right: 14, background: 'none', border: 'none',
  fontSize: 24, lineHeight: 1, color: '#6C6358', cursor: 'pointer',
};
const titleStyle: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: '#33201A', margin: '0 0 8px' };
const bodyStyle: React.CSSProperties = { fontSize: 15, color: '#2A2622', margin: 0, lineHeight: 1.5 };
const codeInput: React.CSSProperties = {
  width: '100%', textAlign: 'center', letterSpacing: 8, fontSize: 26, fontWeight: 700,
  color: '#2A2622', border: '1px solid #E2D5C1', borderRadius: 10, padding: '12px 10px', background: '#fff',
};
const primaryBtn: React.CSSProperties = {
  borderRadius: 40, background: '#A63D1F', color: '#fff', fontWeight: 700, fontSize: 15,
  padding: '12px 20px', border: 'none', cursor: 'pointer',
};
const errStyle: React.CSSProperties = { fontSize: 14, color: '#A63D1F', margin: 0 };
const noteStyle: React.CSSProperties = { fontSize: 14, color: '#3E5A34', margin: 0 };
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, color: '#A63D1F', fontWeight: 600,
  textDecoration: 'underline', cursor: 'pointer', fontSize: 13,
};

export default function OtpDialog({ id, email, onVerified, onClose }: {
  id: string;
  email: string;
  onVerified: () => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function verify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (busy) return;
    const c = code.trim();
    if (!/^[0-9]{6}$/.test(c)) { setErr('Enter the 6-digit code we emailed you.'); return; }
    setBusy(true); setErr(''); setNote('');
    try {
      const res = await fetch('/api/webcontact/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, code: c }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'That did not work. Please try again.');
      onVerified();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || cooldown > 0) return;
    setBusy(true); setErr(''); setNote('');
    try {
      const res = await fetch('/api/webcontact/resend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not resend the code.');
      setNote('A new code is on its way.');
      setCooldown(60);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not resend the code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm your email" style={overlay}>
      <div style={card}>
        <button type="button" aria-label="Close" onClick={onClose} style={closeBtn}>×</button>
        <p style={titleStyle}>Just one more step</p>
        <p style={bodyStyle}>
          We emailed a 6-digit code to <strong>{email}</strong>. Enter it below to confirm it is really you.
        </p>
        <form onSubmit={verify} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <input
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="000000"
            aria-label="6-digit code"
            style={codeInput}
          />
          {err ? <p style={errStyle}>{err}</p> : null}
          {note ? <p style={noteStyle}>{note}</p> : null}
          <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Confirming…' : 'Confirm'}
          </button>
        </form>
        <p style={{ marginTop: 14, fontSize: 13, color: '#6C6358', textAlign: 'center' }}>
          Didn’t get it? Check spam, or{' '}
          <button type="button" onClick={resend} disabled={busy || cooldown > 0} style={linkBtn}>
            {cooldown > 0 ? `resend in ${cooldown}s` : 'resend the code'}
          </button>
          .
        </p>
      </div>
    </div>
  );
}
