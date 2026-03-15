'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  STATUS_LABELS, STATUS_COLORS, RELATIONSHIP_OPTIONS,
  SPIRITUAL_STATUS_OPTIONS, SPIRITUAL_STATUS_LABELS, formatDate,
} from '@/lib/utils';

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'converted'>('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/guests?limit=500&source=prospect').then(r => r.ok ? r.json() : { guests: [] }),
      fetch('/api/users').then(r => r.ok ? r.json() : { users: [] }),
    ]).then(([me, guestsData, usersData]) => {
      setUser(me.user);
      setProspects(guestsData.guests || []);
      setUsers((usersData.users || []).filter((u: any) => u.active));
      setLoading(false);
    });
  }, []);

  const refreshProspects = async () => {
    const res = await fetch('/api/guests?limit=500&source=prospect');
    if (res.ok) {
      const data = await res.json();
      setProspects(data.guests || []);
    }
  };

  const isVolunteer = user?.permissionLevel === 'VOLUNTEER_ACCESS';

  const filtered = prospects.filter(p => {
    if (filter === 'mine') return p.assignedVolunteerId === user?.userId;
    if (filter === 'converted') return p.convertedToGuestAt;
    return !p.convertedToGuestAt;
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-church-400">Loading...</div>;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">Prospects</h1>
          <p className="text-church-500 text-sm mt-1">People your team is reaching out to who haven't visited church yet.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Add Prospect
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: `Active (${prospects.filter(p => !p.convertedToGuestAt).length})` },
          { key: 'mine', label: `My Prospects (${prospects.filter(p => p.assignedVolunteerId === user?.userId).length})` },
          { key: 'converted', label: `Converted (${prospects.filter(p => p.convertedToGuestAt).length})` },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === tab.key ? 'bg-brand-500 text-white' : 'bg-church-100 text-church-600 hover:bg-church-200'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Prospect Cards */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-church-400">{filter === 'converted' ? 'No prospects converted yet.' : 'No prospects found.'}</p>
          <button onClick={() => setShowForm(true)} className="btn-accent btn-sm mt-4">Add your first prospect</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Link key={p.id} href={`/dashboard/guests/${p.id}`}
              className="card hover:shadow-md transition-shadow p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-church-900">{p.firstName} {p.lastName}</h3>
                  {p.phone && <p className="text-xs text-church-500">{p.phone}</p>}
                </div>
                <span className={`badge text-[10px] ${STATUS_COLORS[p.status]}`}>
                  {STATUS_LABELS[p.status]}
                </span>
              </div>
              {p.spiritualStatus && (
                <p className="text-xs text-church-500 mb-1">
                  🙏 {SPIRITUAL_STATUS_LABELS[p.spiritualStatus] || p.spiritualStatus}
                </p>
              )}
              {p.relationshipToAdder && (
                <p className="text-xs text-church-500 mb-1">
                  🤝 {p.relationshipToAdder}
                </p>
              )}
              {p.assignedVolunteer && (
                <p className="text-xs text-church-400 mt-2">
                  Assigned to {p.assignedVolunteer.name}
                </p>
              )}
              {p.convertedToGuestAt && (
                <div className="mt-2 p-2 bg-emerald-50 rounded text-xs text-emerald-700 font-medium">
                  ✅ Converted to Guest {formatDate(p.convertedToGuestAt)}
                </div>
              )}
              <p className="text-[10px] text-church-300 mt-2">Added {formatDate(p.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Add Prospect Modal */}
      {showForm && (
        <ProspectFormModal
          users={users}
          currentUserId={user?.userId}
          onClose={() => { setShowForm(false); refreshProspects(); }}
        />
      )}
    </div>
  );
}

function ProspectFormModal({ users, currentUserId, onClose }: {
  users: any[];
  currentUserId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    preferredContactMethod: 'CALL',
    relationshipToAdder: '',
    spiritualStatus: '',
    prospectNotes: '',
    assignedVolunteerId: currentUserId || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required');
      return;
    }
    setSaving(true);
    setError('');

    // Ensure assignedVolunteerId defaults to current user
    const payload = { ...form };
    if (!payload.assignedVolunteerId) {
      payload.assignedVolunteerId = currentUserId;
    }

    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to add prospect');
      setSaving(false);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="mb-5">
          <h2 className="section-header">Add a Prospect</h2>
          <p className="text-sm text-church-500 mt-1">
            Someone you're reaching out to who hasn't visited church yet.
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          {/* Name fields first and prominent */}
          <div className="p-3 bg-brand-50 rounded-lg border border-brand-100">
            <p className="text-xs font-medium text-brand-700 mb-2">Who is this prospect?</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name *</label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                  required className="input-field" placeholder="Prospect's first name" autoComplete="new-password"
                  name="prospect-first-name" id="prospect-first-name" />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                  required className="input-field" placeholder="Prospect's last name" autoComplete="new-password"
                  name="prospect-last-name" id="prospect-last-name" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="input-field" placeholder="+1..." autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field" placeholder="email@example.com" autoComplete="new-password" />
            </div>
          </div>

          <div>
            <label className="label">Preferred Contact Method</label>
            <select value={form.preferredContactMethod}
              onChange={e => setForm({ ...form, preferredContactMethod: e.target.value })}
              className="select-field">
              <option value="CALL">Phone Call</option>
              <option value="TEXT">Text/SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Your Relationship to Them</label>
              <select value={form.relationshipToAdder}
                onChange={e => setForm({ ...form, relationshipToAdder: e.target.value })}
                className="select-field">
                <option value="">Select...</option>
                {RELATIONSHIP_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Spiritual Status</label>
              <select value={form.spiritualStatus}
                onChange={e => setForm({ ...form, spiritualStatus: e.target.value })}
                className="select-field">
                <option value="">Select...</option>
                {SPIRITUAL_STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Only show Assign To if users list is available */}
          {users.length > 0 && (
            <div>
              <label className="label">Assign To</label>
              <select value={form.assignedVolunteerId}
                onChange={e => setForm({ ...form, assignedVolunteerId: e.target.value })}
                className="select-field">
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}){u.id === currentUserId ? ' — me' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Notes</label>
            <textarea value={form.prospectNotes}
              onChange={e => setForm({ ...form, prospectNotes: e.target.value })}
              rows={3} className="textarea-field"
              placeholder="Context about this person, best time to reach them, how you met..." />
          </div>

          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding...' : 'Add Prospect'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
