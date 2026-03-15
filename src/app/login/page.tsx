'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #102a43 0%, #243b53 50%, #334e68 100%)' }}>
      <div className="card max-w-md w-full fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-100 mb-4">
            <span className="text-2xl">⛪</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-church-900">Staff Login</h1>
          <p className="text-church-500 text-sm mt-1">Church Guest Follow-Up System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required className="input-field" placeholder="you@church.org" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required className="input-field" placeholder="••••••••" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-church-100 space-y-2 text-center">
          <Link href="/forgot-password"
            className="block text-sm text-brand-600 hover:text-brand-700 font-medium">
            🔑 Forgot your password?
          </Link>
          <Link href="/forgot-password?mode=request"
            className="block text-sm text-church-500 hover:text-church-700">
            Don't have an account? Request access →
          </Link>
        </div>
      </div>
    </div>
  );
}
