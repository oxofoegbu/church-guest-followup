'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import PageHelp from '@/components/PageHelp';
import { getPermissionLevel } from '@/lib/roles';

type Track = {
  id: string; name: string; slug: string; description: string | null;
  ordering: number; isActive: boolean;
  milestoneLabel: string | null; workbookUrl: string | null;
  moduleCount: number; cohortCount: number;
  enrollmentCount: number; activeEnrollmentCount: number;
};

const TRACK_ICONS: Record<string, string> = {
  'welcome-track': '🤝',
  'become': '🌱',
  'leaders-track': '🔥',
  'ministry-track': '⛪',
};

function trackIcon(slug: string) {
  return TRACK_ICONS[slug] || '📖';
}

function TrackModal({ track, onClose, onSaved }: {
  track?: Track; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!track;
  const [name, setName] = useState(track?.name || '');
  const [description, setDescription] = useState(track?.description || '');
  const [milestoneLabel, setMilestoneLabel] = useState(track?.milestoneLabel || '');
  const [workbookUrl, setWorkbookUrl] = useState(track?.workbookUrl || '');
  const [ordering, setOrdering] = useState<number>(track?.ordering ?? 0);
  const [isActive, setIsActive] = useState<boolean>(track?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfFileRef = useRef<HTMLInputElement>(null);

  const handlePdfFile = async (file: File | null) => {
    if (!file || !isEdit) return;
    if (file.type !== 'application/pdf') { setError('Please choose a PDF file'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('PDF is too large (max 50 MB)'); return; }
    setUploadingPdf(true); setError('');
    try {
      // 1. Get a signed URL from Harvest (admin-gated)
      const signRes = await fetch(`/api/tracks/${track!.id}/workbook-upload-url`, { method: 'POST' });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error || 'Could not prepare upload');
      // 2. Upload the PDF DIRECTLY to storage (bypasses server size limits)
      const putRes = await fetch(sign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
        body: file,
      });
      if (!putRes.ok) {
        const t = await putRes.text().catch(() => '');
        throw new Error(`Upload failed (${putRes.status})${t ? `: ${t.slice(0, 120)}` : ''}`);
      }
      // 3. Fill the URL field — Save Changes persists it on the track
      setWorkbookUrl(sign.publicUrl);
    } catch (err: any) {
      setError(err.message || 'Workbook upload failed');
    } finally {
      setUploadingPdf(false);
      if (pdfFileRef.current) pdfFileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Track name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name, description, milestoneLabel, workbookUrl, ordering, isActive };
      const res = isEdit
        ? await fetch(`/api/tracks/${track!.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/tracks', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error((await res.json()).error);
      onSaved();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-church-900">{isEdit ? '✏️ Edit Track' : '📖 New Track'}</h2>
          <button onClick={onClose} className="text-church-400 hover:text-church-600 p-1">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Track Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="input-field" placeholder="e.g. Welcome Track, Become, Leaders Track" />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} className="textarea-field" placeholder="What is this track about?" />
          </div>
          <div>
            <label className="label">Completion Milestone (optional)</label>
            <input type="text" value={milestoneLabel} onChange={e => setMilestoneLabel(e.target.value)}
              className="input-field" placeholder="e.g. Water and Holy Spirit Baptism" />
          </div>
          <div>
            <label className="label">Workbook PDF URL (optional)</label>
            <input type="text" value={workbookUrl} onChange={e => setWorkbookUrl(e.target.value)}
              className="input-field" placeholder="https://…" />
            {isEdit ? (
              <div className="mt-2">
                <button type="button" onClick={() => pdfFileRef.current?.click()} disabled={uploadingPdf}
                  className="btn-secondary btn-sm">
                  {uploadingPdf ? 'Uploading PDF…' : '📕 Upload Workbook PDF'}
                </button>
                <input ref={pdfFileRef} type="file" accept="application/pdf" className="hidden"
                  onChange={e => handlePdfFile(e.target.files?.[0] || null)} />
                <span className="text-xs text-church-400 ml-2">Fills the URL above — click Save Changes after.</span>
              </div>
            ) : (
              <p className="text-xs text-church-400 mt-1">Create the track first, then edit it to upload a PDF.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Display Order</label>
              <input type="number" value={ordering} onChange={e => setOrdering(parseInt(e.target.value) || 0)}
                className="input-field" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-church-300 text-brand-500" />
                <span className="text-sm font-medium text-church-700">Active</span>
              </label>
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Track'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [customRolesJson, setCustomRolesJson] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  const fetchTracks = useCallback(async () => {
    const res = await fetch('/api/tracks');
    if (res.ok) { const d = await res.json(); setTracks(d.tracks || []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTracks();
    fetch('/api/auth/me').then(r => r.json()).then(d => setCurrentUser(d.user)).catch(() => {});
    fetch('/api/roles').then(r => r.ok ? r.json() : {}).then((d: any) => {
      if (d.customRolesJson) setCustomRolesJson(d.customRolesJson);
    }).catch(() => {});
  }, [fetchTracks]);

  const permLevel = currentUser ? getPermissionLevel(currentUser.role, customRolesJson) : null;
  const isAdmin = permLevel === 'ADMIN_ACCESS';

  const handleDelete = async (track: Track) => {
    if (!confirm(`Delete track "${track.name}"? This removes its modules and cohorts too.`)) return;
    const res = await fetch(`/api/tracks/${track.id}`, { method: 'DELETE' });
    if (!res.ok) { alert((await res.json()).error || 'Failed to delete'); return; }
    fetchTracks();
  };

  return (
    <>
      <div className="fade-in max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="page-header">🌱 Discipleship Tracks</h1>
            <PageHelp docSection="tracks" tips={[
              { icon: '🤝', title: 'The formation journey', body: 'Welcome Track → Become → Leaders Track → Ministry Track. Each track is a sequence of weekly modules a participant walks through with a discipler.' },
              { icon: '👤', title: 'Guests and members', body: 'New guests can be enrolled in Welcome Track directly. Members (users) can be enrolled in Become, Leaders Track, and beyond.' },
              { icon: '✅', title: 'Track progress weekly', body: 'Open a track and use the progress grid to mark each participant\u2019s completed weeks. Completing all weeks readies them for the track milestone (e.g. baptism).' },
            ]} />
            <p className="text-church-500 text-sm mt-1">
              Formation journeys — building a certain kind of person through consistent following of Jesus.
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Track</button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-church-400">Loading tracks…</div>
        ) : tracks.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">🌱</div>
            <p className="font-semibold text-church-700 mb-1">No tracks yet</p>
            <p className="text-sm text-church-400 mb-4">Create your first discipleship track, or run the Run 9 seed SQL to load Welcome, Become, and Leaders Track.</p>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create First Track</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tracks.map(track => (
              <div key={track.id} className={`card hover:shadow-md transition-shadow ${!track.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-brand-100 text-xl flex-shrink-0">
                    {trackIcon(track.slug)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/dashboard/tracks/${track.id}`}
                      className="font-bold text-church-900 hover:text-brand-600 transition-colors">
                      {track.name}
                    </Link>
                    {!track.isActive && <span className="ml-2 badge bg-gray-100 text-gray-500">Inactive</span>}
                    {track.description && (
                      <p className="text-xs text-church-500 mt-0.5 line-clamp-2">{track.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditingTrack(track)}
                        className="p-1.5 text-church-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors text-sm">✏️</button>
                      <button onClick={() => handleDelete(track)}
                        className="p-1.5 text-church-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm">🗑️</button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-church-500 mb-3">
                  <span>📚 {track.moduleCount} week{track.moduleCount !== 1 ? 's' : ''}</span>
                  <span>👥 {track.activeEnrollmentCount} active</span>
                  <span>🧑‍🤝‍🧑 {track.cohortCount} cohort{track.cohortCount !== 1 ? 's' : ''}</span>
                </div>

                {track.milestoneLabel && (
                  <div className="text-xs text-brand-600 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 mb-3">
                    🏁 Milestone: {track.milestoneLabel}
                  </div>
                )}

                <Link href={`/dashboard/tracks/${track.id}`} className="btn-secondary btn-sm inline-block">
                  Open Track →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <TrackModal onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); fetchTracks(); }} />
      )}
      {editingTrack && (
        <TrackModal track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onSaved={() => { setEditingTrack(null); fetchTracks(); }} />
      )}
    </>
  );
}
