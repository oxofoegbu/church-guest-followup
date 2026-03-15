'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    fetch(`/api/auth/reset-password?token=${token}`)
      .then(r => r.json())
      .then(d => setTokenValid(d.valid === true))
      .catch(() => setTokenValid(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #102a43 0%, #243b53 50%, #334e68 100%)' }}>
      <div className="card max-w-md w-full fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-100 mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-church-900">Set New Password</h1>
          <p className="text-church-500 text-sm mt-1">Grace Life Center Staff System</p>
        </div>

        {tokenValid === null && (
          <p className="text-center text-church-400">Verifying link…</p>
        )}

        {tokenValid === false && (
          <div className="text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <p className="font-semibold text-red-700">Invalid or expired link</p>
            <p className="text-sm text-church-500">This reset link has expired or already been used. Please request a new one.</p>
            <Link href="/forgot-password" className="btn-primary block">Request New Link</Link>
          </div>
        )}

        {tokenValid === true && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6} className="input-field" placeholder="At least 6 characters" />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required className="input-field" placeholder="Repeat new password" />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Saving...' : 'Set New Password'}
            </button>
          </form>
        )}

        {done && (
          <div className="text-center space-y-3">
            <div className="text-5xl">✅</div>
            <p className="font-semibold text-church-900">Password updated!</p>
            <p className="text-sm text-church-500">Redirecting to login…</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #102a43 0%, #243b53 50%, #334e68 100%)' }}>
        <div className="text-white text-sm">Loading…</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
