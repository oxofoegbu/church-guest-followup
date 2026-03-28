'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type LoginMode = 'magic' | 'password';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link:      '⚠️ This sign-in link is invalid. Please request a new one.',
  expired_link:      '⏰ This sign-in link has expired (links last 15 minutes). Please request a new one.',
  inactive_account:  '🔒 Your account is inactive. Please contact the admin.',
  server_error:      '❌ Something went wrong. Please try again.',
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<LoginMode>('magic');

  // Password login state
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Magic link state
  const [magicEmail, setMagicEmail]   = useState('');
  const [magicSent, setMagicSent]     = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError]   = useState('');

  // Show error from magic link redirect
  useEffect(() => {
    const err = searchParams.get('error');
    if (err && ERROR_MESSAGES[err]) {
      setError(ERROR_MESSAGES[err]);
      setMode('magic');
    }
  }, [searchParams]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.user?.mustChangePassword) {
        router.push('/change-password');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicLoading(true); setMagicError('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMagicSent(true);
    } catch (err: any) {
      setMagicError(err.message);
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #102a43 0%, #243b53 50%, #334e68 100%)' }}>
      <div className="card max-w-md w-full fade-in">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-full.png"
              alt="Grace Life Center"
              width={220}
              height={85}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <p className="text-church-500 text-sm">Staff Portal</p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1.5 mb-6 p-1 bg-church-100 rounded-xl">
          <button
            onClick={() => { setMode('magic'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'magic' ? 'bg-white text-church-900 shadow-sm' : 'text-church-500 hover:text-church-700'}`}>
            ✉️ Email Link
          </button>
          <button
            onClick={() => { setMode('password'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'password' ? 'bg-white text-church-900 shadow-sm' : 'text-church-500 hover:text-church-700'}`}>
            🔑 Password
          </button>
        </div>

        {/* ── Magic Link form ── */}
        {mode === 'magic' && !magicSent && (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm text-church-500 leading-relaxed">
                Enter your email and we'll send you a one-click sign-in link — no password needed.
              </p>
            </div>
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={magicEmail}
                onChange={e => setMagicEmail(e.target.value)}
                required
                autoFocus
                className="input-field"
                placeholder="you@email.com"
                autoComplete="email"
              />
            </div>
            {(magicError || error) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {magicError || error}
              </div>
            )}
            <button type="submit" disabled={magicLoading} className="btn-primary w-full py-3">
              {magicLoading ? 'Sending link…' : '✉️ Send Sign-In Link'}
            </button>
          </form>
        )}

        {/* ── Magic link sent ── */}
        {mode === 'magic' && magicSent && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✉️
            </div>
            <div>
              <p className="font-semibold text-church-900 text-lg">Check your email!</p>
              <p className="text-sm text-church-500 mt-1">
                We sent a sign-in link to <strong>{magicEmail}</strong>
              </p>
              <p className="text-xs text-church-400 mt-2">
                The link expires in 15 minutes. Check your spam folder if you don't see it.
              </p>
            </div>
            <button
              onClick={() => { setMagicSent(false); setMagicEmail(''); }}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              ← Try a different email
            </button>
          </div>
        )}

        {/* ── Password form ── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required className="input-field" placeholder="you@email.com" autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required className="input-field" placeholder="••••••••" autoComplete="current-password" />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Footer links */}
        <div className="mt-5 pt-4 border-t border-church-100 space-y-2 text-center">
          <Link href="/forgot-password"
            className="block text-sm text-church-400 hover:text-church-600">
            Forgot your password?
          </Link>
          <Link href="/forgot-password?mode=request"
            className="block text-sm text-church-400 hover:text-church-600">
            Don't have an account? Request access →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #102a43 0%, #334e68 100%)' }}>
        <div className="text-white text-sm">Loading…</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
