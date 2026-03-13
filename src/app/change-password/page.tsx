'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setIsFirstLogin(data.user.mustChangePassword);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: isFirstLogin ? undefined : currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-church-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #102a43 0%, #243b53 50%, #334e68 100%)' }}>
      <div className="card max-w-md w-full fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-100 mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          {isFirstLogin ? (
            <>
              <h1 className="text-2xl font-display font-bold text-church-900">Welcome, {user.name}!</h1>
              <p className="text-church-500 text-sm mt-2">
                For your security, please set a new password before continuing.
                Your temporary password will no longer work after this.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold text-church-900">Change Password</h1>
              <p className="text-church-500 text-sm mt-1">Update your account password</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isFirstLogin && (
            <div>
              <label className="label">Current Password</label>
              <input type="password" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required className="input-field" placeholder="Enter current password" />
            </div>
          )}
          <div>
            <label className="label">New Password</label>
            <input type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required minLength={6} className="input-field" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required className="input-field" placeholder="Re-enter new password" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Updating...' : 'Set New Password'}
          </button>
        </form>

        {isFirstLogin && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              You must change your password before accessing the dashboard. Choose something memorable and secure.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
