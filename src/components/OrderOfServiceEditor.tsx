'use client';
import { useState, useEffect } from 'react';

export type OrderItem = {
  id: string;
  type: 'section' | 'item';
  time?: string;
  title: string;
  person?: string;
  durationMin?: number;
  notes?: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function blankItem(type: 'section' | 'item' = 'item'): OrderItem {
  return { id: uid(), type, title: '' };
}

const DEFAULT_TEMPLATE: OrderItem[] = [
  { id: uid(), type: 'section', title: 'PRE-SERVICE' },
  { id: uid(), type: 'item', time: '08:45', title: 'Prayer & setup', durationMin: 15 },
  { id: uid(), type: 'section', title: 'WORSHIP' },
  { id: uid(), type: 'item', time: '09:00', title: 'Opening prayer', durationMin: 5 },
  { id: uid(), type: 'item', time: '09:05', title: 'Worship set', durationMin: 25 },
  { id: uid(), type: 'section', title: 'WORD' },
  { id: uid(), type: 'item', time: '09:30', title: 'Announcements', durationMin: 5 },
  { id: uid(), type: 'item', time: '09:35', title: 'Offering', durationMin: 5 },
  { id: uid(), type: 'item', time: '09:40', title: 'Sermon', durationMin: 35 },
  { id: uid(), type: 'section', title: 'RESPONSE' },
  { id: uid(), type: 'item', time: '10:15', title: 'Altar call & prophetic prayer', durationMin: 15 },
  { id: uid(), type: 'item', time: '10:30', title: 'Closing & benediction', durationMin: 5 },
];

type Props = {
  scheduleId: string;
  scheduleLabel: string; // e.g. "Sunday, 12 April 2026 — The Power of Faith"
  onClose: () => void;
  onSaved?: (items: OrderItem[]) => void;
};

export default function OrderOfServiceEditor({
  scheduleId,
  scheduleLabel,
  onClose,
  onSaved,
}: Props) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/schedule/${scheduleId}/order`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (cancelled) return;
        const existing = Array.isArray(data.orderOfService) ? data.orderOfService : [];
        setItems(existing.length > 0 ? existing : []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleId]);

  function update(id: string, patch: Partial<OrderItem>) {
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    setItems((arr) => arr.filter((it) => it.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    setItems((arr) => {
      const i = arr.findIndex((x) => x.id === id);
      if (i < 0) return arr;
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = arr.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function addItem(type: 'section' | 'item') {
    setItems((arr) => [...arr, blankItem(type)]);
  }
  function loadTemplate() {
    if (items.length > 0 && !confirm('Replace the current order with the GLC template?')) return;
    setItems(DEFAULT_TEMPLATE.map((t) => ({ ...t, id: uid() })));
  }

  async function save() {
    // Validate
    const cleaned = items
      .map((it) => ({ ...it, title: it.title.trim() }))
      .filter((it) => it.title.length > 0);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/schedule/${scheduleId}/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderOfService: cleaned }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed');
      }
      onSaved?.(cleaned);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl my-8">
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-church-900">Order of Service</h2>
            <p className="mt-1 text-sm text-church-600">{scheduleLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-church-500 hover:text-church-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <p className="py-8 text-center text-church-600">Loading…</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <button onClick={() => addItem('section')} className="btn-secondary text-sm">
                  + Section header
                </button>
                <button onClick={() => addItem('item')} className="btn-secondary text-sm">
                  + Item
                </button>
                <button
                  onClick={loadTemplate}
                  className="ml-auto text-sm text-brand-700 hover:text-brand-900"
                >
                  Load GLC template
                </button>
              </div>

              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-church-300 p-6 text-center text-sm text-church-600">
                  No items yet. Add a section or item, or load the GLC template.
                </div>
              )}

              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    className={`rounded-lg border p-3 ${
                      it.type === 'section'
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-church-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => move(it.id, -1)}
                          disabled={idx === 0}
                          className="text-church-500 hover:text-church-900 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => move(it.id, 1)}
                          disabled={idx === items.length - 1}
                          className="text-church-500 hover:text-church-900 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          ▼
                        </button>
                      </div>

                      <div className="flex-1 space-y-2">
                        {it.type === 'section' ? (
                          <input
                            value={it.title}
                            onChange={(e) => update(it.id, { title: e.target.value })}
                            placeholder="SECTION NAME (e.g. WORSHIP)"
                            className="input-field font-semibold uppercase tracking-wide"
                          />
                        ) : (
                          <>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[110px_1fr_110px]">
                              <input
                                type="time"
                                value={it.time ?? ''}
                                onChange={(e) => update(it.id, { time: e.target.value || undefined })}
                                className="input-field"
                              />
                              <input
                                value={it.title}
                                onChange={(e) => update(it.id, { title: e.target.value })}
                                placeholder="Item (e.g. Worship set)"
                                className="input-field"
                              />
                              <input
                                type="number"
                                min={0}
                                value={it.durationMin ?? ''}
                                onChange={(e) =>
                                  update(it.id, {
                                    durationMin: e.target.value ? Number(e.target.value) : undefined,
                                  })
                                }
                                placeholder="min"
                                className="input-field"
                              />
                            </div>
                            <input
                              value={it.person ?? ''}
                              onChange={(e) => update(it.id, { person: e.target.value || undefined })}
                              placeholder="Person (optional)"
                              className="input-field"
                            />
                            <textarea
                              value={it.notes ?? ''}
                              onChange={(e) => update(it.id, { notes: e.target.value || undefined })}
                              placeholder="Notes (optional)"
                              rows={2}
                              className="textarea-field"
                            />
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => remove(it.id)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Remove"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-church-50 px-6 py-3">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={save} className="btn-primary" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save Order of Service'}
          </button>
        </div>
      </div>
    </div>
  );
}
