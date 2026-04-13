'use client';
import { useEffect, useState } from 'react';

type DripChannel = 'EMAIL' | 'WHATSAPP';

type DripTemplate = {
  id: string;
  name: string;
  dayOffset: number;
  channel: DripChannel;
  subject: string | null;
  body: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type DraftTemplate = {
  name: string;
  dayOffset: number;
  channel: DripChannel;
  subject: string;
  body: string;
  enabled: boolean;
};

const BLANK_DRAFT: DraftTemplate = {
  name: '',
  dayOffset: 1,
  channel: 'EMAIL',
  subject: '',
  body: '',
  enabled: true,
};

export default function DripTemplatesSection() {
  const [templates, setTemplates] = useState<DripTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftTemplate>(BLANK_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftTemplate>(BLANK_DRAFT);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/drip-templates');
      if (!res.ok) throw new Error('Failed to load drip templates');
      const data = await res.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(t: DripTemplate) {
    setEditingId(t.id);
    setEditDraft({
      name: t.name,
      dayOffset: t.dayOffset,
      channel: t.channel,
      subject: t.subject || '',
      body: t.body,
      enabled: t.enabled,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(BLANK_DRAFT);
  }

  async function saveEdit(id: string) {
    if (!editDraft.name.trim() || !editDraft.body.trim()) {
      alert('Name and body are required.');
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/settings/drip-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDraft.name.trim(),
          dayOffset: Number(editDraft.dayOffset),
          channel: editDraft.channel,
          subject: editDraft.channel === 'EMAIL' ? editDraft.subject.trim() || null : null,
          body: editDraft.body,
          enabled: editDraft.enabled,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed');
      }
      cancelEdit();
      await load();
    } catch (e: any) {
      alert(e.message || 'Save failed');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleEnabled(t: DripTemplate) {
    setBusyId(t.id);
    try {
      const res = await fetch(`/api/settings/drip-templates/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !t.enabled }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      await load();
    } catch (e: any) {
      alert(e.message || 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(t: DripTemplate) {
    if (!confirm(`Delete drip template "${t.name}"? This cannot be undone.`)) return;
    setBusyId(t.id);
    try {
      const res = await fetch(`/api/settings/drip-templates/${t.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await load();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  async function createTemplate() {
    if (!draft.name.trim() || !draft.body.trim()) {
      alert('Name and body are required.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/settings/drip-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(),
          dayOffset: Number(draft.dayOffset),
          channel: draft.channel,
          subject: draft.channel === 'EMAIL' ? draft.subject.trim() || null : null,
          body: draft.body,
          enabled: draft.enabled,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Create failed');
      }
      setDraft(BLANK_DRAFT);
      await load();
    } catch (e: any) {
      alert(e.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  const sorted = [...templates].sort((a, b) => a.dayOffset - b.dayOffset);

  return (
    <div className="card">
      <h2 className="section-header mb-1">💧 Drip Campaign Templates</h2>
      <p className="text-sm text-church-500 mb-4">
        Pre-written messages sent automatically to new guests on a schedule (e.g. day 1, day 7).
        Templates are configured here; per-guest scheduling and the cron sender are coming in later runs.
      </p>
      <p className="text-xs text-church-400 mb-4">
        You can use these placeholders in subject and body:
        {' '}
        <code className="px-1 py-0.5 bg-church-100 rounded">{'{{firstName}}'}</code>
        {' '}
        <code className="px-1 py-0.5 bg-church-100 rounded">{'{{churchName}}'}</code>
        {' '}
        <code className="px-1 py-0.5 bg-church-100 rounded">{'{{volunteerName}}'}</code>
      </p>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-church-400">Loading templates…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-church-400 mb-4">
          No drip templates yet. Create your first one below.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {sorted.map((t) => {
            const isEditing = editingId === t.id;
            const isBusy = busyId === t.id;
            return (
              <div
                key={t.id}
                className={`border rounded-lg p-3 ${
                  t.enabled ? 'bg-white border-church-200' : 'bg-church-50 border-church-100'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="label">Name</label>
                        <input
                          className="input-field"
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Day offset (days after first visit)</label>
                        <input
                          type="number"
                          min={0}
                          className="input-field"
                          value={editDraft.dayOffset}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, dayOffset: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">Channel</label>
                        <select
                          className="select-field"
                          value={editDraft.channel}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              channel: e.target.value as DripChannel,
                            })
                          }
                        >
                          <option value="EMAIL">Email</option>
                          <option value="WHATSAPP">WhatsApp</option>
                        </select>
                      </div>
                      {editDraft.channel === 'EMAIL' && (
                        <div>
                          <label className="label">Subject (email only)</label>
                          <input
                            className="input-field"
                            value={editDraft.subject}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, subject: e.target.value })
                            }
                            placeholder="Welcome to {{churchName}}!"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="label">Body</label>
                      <textarea
                        className="textarea-field"
                        rows={6}
                        value={editDraft.body}
                        onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
                        placeholder="Hi {{firstName}}, thanks so much for visiting {{churchName}}…"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-church-600">
                        <input
                          type="checkbox"
                          checked={editDraft.enabled}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, enabled: e.target.checked })
                          }
                        />
                        Enabled
                      </label>
                      <div className="flex-1" />
                      <button
                        type="button"
                        className="btn-secondary text-sm"
                        onClick={cancelEdit}
                        disabled={isBusy}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary text-sm"
                        onClick={() => saveEdit(t.id)}
                        disabled={isBusy}
                      >
                        {isBusy ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-xs text-church-400">Day</div>
                      <div className="text-lg font-semibold text-church-800">{t.dayOffset}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-church-800">{t.name}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            t.channel === 'EMAIL'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {t.channel}
                        </span>
                        {!t.enabled && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-church-200 text-church-600">
                            DISABLED
                          </span>
                        )}
                      </div>
                      {t.subject && (
                        <div className="text-xs text-church-500 mt-0.5 truncate">
                          Subject: {t.subject}
                        </div>
                      )}
                      <div className="text-xs text-church-500 mt-1 line-clamp-2 whitespace-pre-wrap">
                        {t.body}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1 px-2"
                        onClick={() => startEdit(t)}
                        disabled={isBusy}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs py-1 px-2"
                        onClick={() => toggleEnabled(t)}
                        disabled={isBusy}
                      >
                        {t.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="text-xs py-1 px-2 text-red-600 hover:text-red-700"
                        onClick={() => remove(t)}
                        disabled={isBusy}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-church-100 pt-4">
        <p className="text-xs font-medium text-church-600 mb-2">Add a new template:</p>
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="label">Name</label>
              <input
                className="input-field"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Day 1 — Welcome email"
              />
            </div>
            <div>
              <label className="label">Day offset</label>
              <input
                type="number"
                min={0}
                className="input-field"
                value={draft.dayOffset}
                onChange={(e) => setDraft({ ...draft, dayOffset: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Channel</label>
              <select
                className="select-field"
                value={draft.channel}
                onChange={(e) => setDraft({ ...draft, channel: e.target.value as DripChannel })}
              >
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
            {draft.channel === 'EMAIL' && (
              <div>
                <label className="label">Subject</label>
                <input
                  className="input-field"
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  placeholder="Welcome to {{churchName}}!"
                />
              </div>
            )}
          </div>
          <div>
            <label className="label">Body</label>
            <textarea
              className="textarea-field"
              rows={5}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              placeholder="Hi {{firstName}}, thanks so much for visiting {{churchName}}…"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-church-600">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              Enabled
            </label>
            <div className="flex-1" />
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={createTemplate}
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Add template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
