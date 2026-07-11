'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { resizeImageToJpeg } from '@/lib/client-image';

type Profile = {
  id: string; name: string; email: string; phone: string | null;
  role: string; roleLabel: string; photoUrl: string | null; createdAt: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/profile').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.profile) setProfile(d.profile); })
      .finally(() => setLoading(false));
  }, []);

  const handleFile = async (file: File | null) => {
    if (!file || !profile) return;
    setUploading(true); setError(''); setMessage('');
    try {
      const blob = await resizeImageToJpeg(file, 512, 0.85);
      const fd = new FormData();
      fd.append('file', blob, 'photo.jpg');
      const res = await fetch(`/api/users/${profile.id}/photo`, { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Upload failed');
      setProfile(prev => prev ? { ...prev, photoUrl: d.photoUrl } : prev);
      setMessage('Photo updated! It now appears anywhere you are shown as a discipler.');
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) return <div className="fade-in text-center py-12 text-church-400">Loading your profile…</div>;
  if (!profile) return <div className="fade-in text-center py-12 text-church-400">Could not load your profile.</div>;

  return (
    <div className="fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="page-header">🙂 My Profile</h1>
        <p className="text-church-500 text-sm mt-1">
          Your photo is shown to guests and members you disciple — a friendly face for the journey.
        </p>
      </div>

      <div className="card">
        <div className="flex items-center gap-5">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt={profile.name}
              className="w-24 h-24 rounded-full object-cover border-2 border-brand-200 flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-3xl font-bold flex-shrink-0">
              {profile.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-church-900 text-lg">{profile.name}</h2>
            <p className="text-sm text-church-500">{profile.roleLabel}</p>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="btn-primary btn-sm mt-3">
              {uploading ? 'Uploading…' : profile.photoUrl ? '📷 Change Photo' : '📷 Upload Photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => handleFile(e.target.files?.[0] || null)} />
          </div>
        </div>

        {message && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div className="mt-6 pt-5 border-t border-church-100 space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="text-church-400 w-24 flex-shrink-0">Email</span>
            <span className="text-church-800 font-medium">{profile.email}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-church-400 w-24 flex-shrink-0">Phone</span>
            <span className="text-church-800 font-medium">{profile.phone || '—'}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-church-400 w-24 flex-shrink-0">Role</span>
            <span className="text-church-800 font-medium">{profile.roleLabel}</span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-church-100 flex flex-wrap gap-4 text-sm">
          <Link href="/change-password" className="text-brand-600 hover:text-brand-700 font-medium">Change Password →</Link>
          <span className="text-church-400">Need your name, email, or phone updated? Ask an admin.</span>
        </div>
      </div>
    </div>
  );
}
