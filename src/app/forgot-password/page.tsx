'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Mode = 'reset' | 'request';
type Step = 'form' | 'done';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'request' ? 'request' : 'reset'
  );
  const [step, setStep] = useState<Step>('form');

  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqMessage, setReqMessage] = useState('');
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true); setResetError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setStep('done');
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqLoading(true); setReqError('');
    try {
      const res = await fetch('/api/auth/account-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: reqName.trim(), email: reqEmail.trim().toLowerCase(), phone: reqPhone.trim(), message: reqMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setStep('done');
    } catch (err: any) {
      setReqError(err.message);
    } finally {
      setReqLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #102a43 0%, #243b53 50%, #334e68 100%)' }}>
      <div className="card max-w-md w-full fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-100 mb-4">
            <span className="text-2xl">⛪</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-church-900">
            {mode === 'reset' ? 'Reset Password' : 'Request Access'}
          </h1>
          <p className="text-church-500 text-sm mt-1">Grace Life Center Staff System</p>
        </div>

        {step === 'form' && (
          <div className="flex gap-2 mb-6 p-1 bg-church-100 rounded-lg">
            <button
              onClick={() => { setMode('reset'); setResetError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'reset' ? 'bg-white text-church-900 shadow-sm' : 'text-church-500 hover:text-church-700'}`}>
              🔑 Forgot Password
            </button>
            <button
              onClick={() => { setMode('request'); setReqError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'request' ? 'bg-white text-church-900 shadow-sm' : 'text-church-500 hover:text-church-700'}`}>
              👤 Request Access
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            {mode === 'reset' ? (
              <>
                <p className="font-semibold text-church-900">Check your email</p>
                <p className="text-sm text-church-500">If your name and email match our records, a password reset link has been sent.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-church-900">Request submitted!</p>
                <p className="text-sm text-church-500">Your access request has been sent to the admin. You'll be contacted once your account is set up.</p>
              </>
            )}
            <Link href="/login" className="btn-primary block mt-4">Back to Login</Link>
          </div>
        )}

        {step === 'form' && mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-church-500 mb-4">
              Enter your full name and email address exactly as they appear in the system.
            </p>
            <div>
              <label className="label">Email Address *</label>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                required className="input-field" placeholder="you@church.org" />
            </div>
            {resetError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{resetError}</div>
            )}
            <button type="submit" disabled={resetLoading} className="btn-primary w-full">
              {resetLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {step === 'form' && mode === 'request' && (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-sm text-church-500 mb-4">
              Not in the system yet? Fill in your details and the admin will set up your account.
            </p>
            <div>
              <label className="label">Full Name *</label>
              <input type="text" value={reqName} onChange={e => setReqName(e.target.value)}
                required className="input-field" placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <label className="label">Email Address *</label>
              <input type="email" value={reqEmail} onChange={e => setReqEmail(e.target.value)}
                required className="input-field" placeholder="you@email.com" />
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input type="tel" value={reqPhone} onChange={e => setReqPhone(e.target.value)}
                className="input-field" placeholder="+1 202 555 0123" />
            </div>
            <div>
              <label className="label">Message (optional)</label>
              <textarea value={reqMessage} onChange={e => setReqMessage(e.target.value)}
                rows={2} className="textarea-field" placeholder="Your role at the church, who referred you, etc." />
            </div>
            {reqError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{reqError}</div>
            )}
            <button type="submit" disabled={reqLoading} className="btn-primary w-full">
              {reqLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}

        {step === 'form' && (
          <div className="mt-5 pt-4 border-t border-church-100 text-center">
            <Link href="/login" className="text-sm text-church-400 hover:text-church-600">
              ← Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #102a43 0%, #243b53 50%, #334e68 100%)' }}>
        <div className="text-white text-sm">Loading…</div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
