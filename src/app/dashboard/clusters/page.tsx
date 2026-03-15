'use client';
import PageHelp from '@/components/PageHelp';

import { useState, useEffect, useCallback } from 'react';

type ClusterMember = { userId: string; user: { id: string; name: string; email: string; role: string } };
type Cluster = {
  id: string; name: string; description: string | null; color: string;
  members: ClusterMember[]; createdByUser: { id: string; name: string };
  createdAt: string;
};

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#14b8a6','#0ea5e9','#64748b',
];

function ClusterModal({
  cluster, users, onClose, onSaved,
}: {
  cluster?: Cluster; users: any[]; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!cluster;
  const [name, setName] = useState(cluster?.name || '');
  const [description, setDescription] = useState(cluster?.description || '');
  const [color, setColor] = useState(cluster?.color || '#6366f1');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    cluster?.members.map(m => m.userId) || []
  );
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isSelected = (id: string) => selectedIds.includes(id);

  const toggleUser = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!name.trim()) { setError('Cluster name is required'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        const existingIds = cluster!.members.map(m => m.userId);
        const addMemberIds    = selectedIds.filter(id => !existingIds.includes(id));
        const removeMemberIds = existingIds.filter(id => !selectedIds.includes(id));
        const res = await fetch(`/api/clusters/${cluster!.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, color, addMemberIds, removeMemberIds }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch('/api/clusters', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, color, memberIds: selectedIds }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      onSaved();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-church-900">{isEdit ? '✏️ Edit Cluster' : '👥 New Cluster'}</h2>
          <button onClick={onClose} className="text-church-400 hover:text-church-600 p-1">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Cluster Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="input-field" placeholder="e.g. Young Adults, Prayer Team, Ushers" />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} className="textarea-field" placeholder="What is this cluster for?" />
          </div>
          <div>
            <label className="label">Colour</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  style={{ background: c }}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="label mb-2">
              Members <span className="text-church-400 font-normal">({selectedIds.length} selected)</span>
            </label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…" className="input-field mb-2" />
            <div className="border border-church-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-church-400 text-center py-4">No users found</p>
              ) : filteredUsers.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50 cursor-pointer border-b border-church-50 last:border-0">
                  <input type="checkbox" checked={isSelected(u.id)} onChange={() => toggleUser(u.id)}
                    className="w-4 h-4 rounded border-church-300 text-brand-500" />
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-brand-600 bg-brand-100 flex-shrink-0">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-church-900 truncate">{u.name}</p>
                    <p className="text-xs text-church-400 truncate">{u.email} · {u.role}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Cluster'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);

  const fetchClusters = useCallback(async () => {
    const res = await fetch('/api/clusters');
    if (res.ok) { const d = await res.json(); setClusters(d.clusters || []); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClusters();
    fetch('/api/users').then(r => r.ok ? r.json() : { users: [] })
      .then(d => setUsers((d.users || []).filter((u: any) => u.active)));
    fetch('/api/auth/me').then(r => r.json()).then(d => setCurrentUser(d.user)).catch(() => {});
  }, [fetchClusters]);

  const isAdmin = currentUser && ['ADMIN', 'SENIOR_LEADER'].includes(currentUser.role);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete cluster "${name}"? Members will not be affected.`)) return;
    await fetch(`/api/clusters/${id}`, { method: 'DELETE' });
    fetchClusters();
  };

  return (
    <div className="fade-in max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">👥 Clusters</h1>
        <PageHelp docSection="clusters" tips={[
          { icon: "👥", title: "Group your team", body: "Clusters are named groups of staff members — Prayer Team, Young Adults, Ushers, etc. Use them to organise your team for future targeted communications." },
          { icon: "🎨", title: "Use colours to identify groups", body: "Each cluster has a colour. Pick distinct colours so clusters are easy to tell apart at a glance." },
          { icon: "🚀", title: "More features coming", body: "Clusters will soon support group meeting scheduling, targeted WhatsApp/email blasts, and full small-group management." }
        ]} />
          <p className="text-church-500 text-sm mt-1">
            Groups of members for shared activities, meetings, and targeted communications.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Cluster</button>
        )}
      </div>

      <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700">
        <p className="font-semibold mb-1">🚀 What clusters unlock (coming soon)</p>
        <p className="text-indigo-600">Schedule meetings with your whole cluster · Send targeted WhatsApp/email blasts · Set up shared calendar events · Manage small groups — this is the foundation.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-church-400">Loading clusters…</div>
      ) : clusters.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-semibold text-church-700 mb-1">No clusters yet</p>
          <p className="text-sm text-church-400 mb-4">Create your first cluster to start grouping members.</p>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create First Cluster</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clusters.map(cluster => (
            <div key={cluster.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0"
                  style={{ background: cluster.color }}>
                  👥
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-church-900 truncate">{cluster.name}</h3>
                  {cluster.description && (
                    <p className="text-xs text-church-500 mt-0.5 line-clamp-2">{cluster.description}</p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditingCluster(cluster)}
                      className="p-1.5 text-church-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors text-sm">✏️</button>
                    <button onClick={() => handleDelete(cluster.id, cluster.name)}
                      className="p-1.5 text-church-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm">🗑️</button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-3 text-xs text-church-500">
                <span className="flex items-center gap-1">
                  <span style={{ color: cluster.color }}>●</span>
                  {cluster.members.length} member{cluster.members.length !== 1 ? 's' : ''}
                </span>
                <span>Created by {cluster.createdByUser.name}</span>
              </div>

              {cluster.members.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {cluster.members.slice(0, 8).map(m => (
                    <div key={m.userId} title={m.user.name}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: cluster.color, opacity: 0.85 }}>
                      {m.user.name[0]?.toUpperCase()}
                    </div>
                  ))}
                  {cluster.members.length > 8 && (
                    <span className="text-xs text-church-400 ml-1">+{cluster.members.length - 8} more</span>
                  )}
                </div>
              )}

              {cluster.members.length > 0 && (
                <div className="mt-3 pt-3 border-t border-church-100">
                  <p className="text-xs text-church-500 font-medium mb-1">Members:</p>
                  <p className="text-xs text-church-600 line-clamp-2">
                    {cluster.members.map(m => m.user.name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ClusterModal users={users} onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); fetchClusters(); }} />
      )}
      {editingCluster && (
        <ClusterModal cluster={editingCluster} users={users}
          onClose={() => setEditingCluster(null)}
          onSaved={() => { setEditingCluster(null); fetchClusters(); }} />
      )}
    </div>
  );
}
