'use client';

import { useEffect, useState } from 'react';

export default function TemplateApplyModal({ template, onClose }: { template: { id: string; name: string }; onClose: () => void }) {
  const [scope, setScope] = useState<'future' | 'all'>('future');
  const [overwrite, setOverwrite] = useState(false);
  const [counts, setCounts] = useState<{ affected: number; skipped: number; totalInScope: number } | null>(null);
  const [applying, setApplying] = useState(false);

  async function loadCounts() {
    const r = await fetch(`/api/settings/order-templates/${template.id}/apply-counts?scope=${scope}&overwriteCustomized=${overwrite ? 1 : 0}`);
    setCounts(await r.json());
  }
  useEffect(() => { loadCounts(); /* eslint-disable-next-line */ }, [scope, overwrite]);

  async function apply() {
    if (!confirm(`Apply "${template.name}" to ${counts?.affected ?? 0} schedule(s)?`)) return;
    setApplying(true);
    const r = await fetch(`/api/settings/order-templates/${template.id}/apply-counts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, overwriteCustomized: overwrite }),
    });
    const d = await r.json();
    setApplying(false);
    alert(`Updated ${d.updated} schedule(s).`);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-20 md:inset-x-1/3 bg-white rounded-lg shadow-xl z-50 p-6">
        <h3 className="text-lg font-bold mb-3">Apply "{template.name}"</h3>
        <div className="space-y-3">
          <div>
            <label className="label">Scope</label>
            <select className="select-field" value={scope} onChange={e => setScope(e.target.value as any)}>
              <option value="future">Future Sundays only</option>
              <option value="all">All Sundays (including past)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
            Overwrite customized schedules (default: skip them)
          </label>
          {counts && (
            <div className="p-3 bg-church-50 rounded text-sm">
              <div><b>{counts.affected}</b> schedule(s) will be updated</div>
              <div className="text-church-500"><b>{counts.skipped}</b> skipped (customized), <b>{counts.totalInScope}</b> total in scope</div>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={apply} disabled={applying || !counts?.affected}>
            {applying ? 'Applying…' : `Apply to ${counts?.affected ?? 0}`}
          </button>
        </div>
      </div>
    </>
  );
}
