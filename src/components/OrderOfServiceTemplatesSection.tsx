'use client';

import { useEffect, useState } from 'react';
import TemplateApplyModal from './TemplateApplyModal';

type Item = { id: string; type: 'section' | 'item'; time?: string; title: string; person?: string; durationMin?: number; notes?: string };
type Template = { id: string; name: string; items: Item[]; isDefault: boolean };

export default function OrderOfServiceTemplatesSection() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [applying, setApplying] = useState<Template | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/settings/order-templates');
    const d = await r.json();
    setTemplates(d.templates ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createBlank() {
    const name = prompt('Template name?');
    if (!name) return;
    await fetch('/api/settings/order-templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, items: [], isDefault: templates.length === 0 }),
    });
    load();
  }

  async function setDefault(id: string) {
    await fetch(`/api/settings/order-templates/${id}/set-default`, { method: 'POST' });
    load();
  }

  async function remove(t: Template) {
    if (t.isDefault) { alert('Cannot delete default. Set another as default first.'); return; }
    if (!confirm(`Delete "${t.name}"?`)) return;
    await fetch(`/api/settings/order-templates/${t.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h2 className="section-header">📜 Order of Service Templates</h2>
      <div className="card">
        <p className="text-sm text-church-600 mb-3">
          Reusable Order of Service templates. The default template auto-populates new Sundays when a year is seeded.
        </p>
        {loading ? <p>Loading…</p> : (
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">
                    {t.name} {t.isDefault && <span className="ml-2 text-xs text-brand-600">DEFAULT</span>}
                  </div>
                  <div className="text-xs text-church-500">{t.items.length} items</div>
                </div>
                <div className="flex gap-2">
                  {!t.isDefault && <button className="btn-secondary text-xs" onClick={() => setDefault(t.id)}>Set Default</button>}
                  <button className="btn-secondary text-xs" onClick={() => setEditing(t)}>Edit</button>
                  <button className="btn-secondary text-xs" onClick={() => setApplying(t)}>Apply to Schedules…</button>
                  <button className="btn-secondary text-xs text-red-600" onClick={() => remove(t)}>Delete</button>
                </div>
              </div>
            ))}
            {templates.length === 0 && <p className="text-sm text-church-500">No templates yet.</p>}
          </div>
        )}
        <div className="mt-3">
          <button className="btn-primary" onClick={createBlank}>+ New Template</button>
        </div>
      </div>

      {applying && <TemplateApplyModal template={applying} onClose={() => { setApplying(null); load(); }} />}
      {editing && (
        <TemplateEditor template={editing} onClose={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function TemplateEditor({ template, onClose }: { template: Template; onClose: () => void }) {
  const [name, setName] = useState(template.name);
  const [items, setItems] = useState<Item[]>(template.items ?? []);
  const [saving, setSaving] = useState(false);

  function addRow(type: 'section' | 'item') {
    setItems([...items, { id: crypto.randomUUID(), type, title: type === 'section' ? 'NEW SECTION' : 'New item' }]);
  }
  function update(i: number, patch: Partial<Item>) { setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it)); }
  function remove(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= items.length) return;
    const next = [...items]; [next[i], next[j]] = [next[j], next[i]]; setItems(next);
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/settings/order-templates/${template.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, items }),
    });
    setSaving(false); onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-10 bottom-10 md:inset-x-12 lg:inset-x-32 bg-white rounded-lg shadow-xl z-50 p-6 overflow-auto">
        <h3 className="text-lg font-bold mb-3">Edit Template</h3>
        <input className="input-field mb-3" value={name} onChange={e => setName(e.target.value)} />
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={it.id} className={`p-2 border rounded ${it.type === 'section' ? 'bg-church-100 font-semibold' : ''}`}>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-xs uppercase tracking-wide w-16 text-church-500">{it.type}</span>
                  <input className="input-field flex-1" placeholder="Title" value={it.title} onChange={e => update(i, { title: e.target.value })} />
                  <button className="btn-secondary text-xs px-2" onClick={() => move(i, -1)}>↑</button>
                  <button className="btn-secondary text-xs px-2" onClick={() => move(i, 1)}>↓</button>
                  <button className="btn-secondary text-xs px-2 text-red-600" onClick={() => remove(i)}>✕</button>
                </div>
                {it.type === 'item' && (
                  <>
                    <div className="flex gap-2 items-center pl-16">
                      <input className="input-field w-24" placeholder="Time (09:00)" value={it.time ?? ''} onChange={e => update(i, { time: e.target.value })} />
                      <input className="input-field flex-1" placeholder="Person (optional)" value={it.person ?? ''} onChange={e => update(i, { person: e.target.value })} />
                      <input className="input-field w-24" placeholder="Min" type="number" value={it.durationMin ?? ''} onChange={e => update(i, { durationMin: e.target.value ? Number(e.target.value) : undefined })} />
                    </div>
                    <div className="pl-16">
                      <textarea className="textarea-field w-full" rows={2} placeholder="Notes (optional)" value={it.notes ?? ''} onChange={e => update(i, { notes: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn-secondary" onClick={() => addRow('section')}>+ Section</button>
          <button className="btn-secondary" onClick={() => addRow('item')}>+ Item</button>
          <div className="flex-1" />
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </>
  );
}
