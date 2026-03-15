import PageHelp from '@/components/PageHelp';
'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDate } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  GUEST: { label: 'Guest', icon: '👤', color: 'bg-blue-100 text-blue-700' },
  USER: { label: 'User', icon: '⚙️', color: 'bg-purple-100 text-purple-700' },
  ASSIGNMENT: { label: 'Assignment', icon: '📋', color: 'bg-indigo-100 text-indigo-700' },
  SETTINGS: { label: 'Settings', icon: '🔔', color: 'bg-amber-100 text-amber-700' },
  AUTH: { label: 'Auth', icon: '🔐', color: 'bg-green-100 text-green-700' },
  NOTIFICATION: { label: 'Notification', icon: '📱', color: 'bg-teal-100 text-teal-700' },
};

const ACTION_ICONS: Record<string, string> = {
  GUEST_CREATED: '🆕',
  GUEST_ASSIGNED: '📋',
  GUEST_STATUS_CHANGED: '🔄',
  GUEST_ARCHIVED: '📦',
  GUEST_RESTORED: '♻️',
  GUEST_DELETED: '🗑️',
  USER_CREATED: '👤',
  USER_UPDATED: '✏️',
  USER_DEACTIVATED: '🚫',
  PASSWORD_RESET: '🔑',
  SETTINGS_CHANGED: '⚙️',
  USER_LOGIN: '🔓',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    params.set('page', String(page));

    const res = await fetch(`/api/audit?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [category, search, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="page-header">Audit Trail</h1>
        <PageHelp docSection="audit" tips={[
          { icon: "📜", title: "Immutable record", body: "Every significant action is logged here — who did what and when. This cannot be edited or deleted." },
          { icon: "🔍", title: "Filter by category", body: "Use the category filter to focus on GUEST, USER, or SETTINGS events. Use date range to narrow to a specific period." }
        ]} />
        <p className="text-church-500 mt-1">Complete log of all system actions and changes.</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="search" placeholder="Search actions, users, guests..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field" />
          <select value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="select-field">
            <option value="">All Categories</option>
            <option value="GUEST">Guest Actions</option>
            <option value="USER">User Management</option>
            <option value="ASSIGNMENT">Assignments</option>
            <option value="AUTH">Authentication</option>
            <option value="SETTINGS">Settings</option>
            <option value="NOTIFICATION">Notifications</option>
          </select>
          <div className="flex items-center text-sm text-church-500">
            {total} event{total !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(CATEGORY_LABELS).map(([key, { label, icon, color }]) => (
          <button key={key}
            onClick={() => { setCategory(category === key ? '' : key); setPage(1); }}
            className={`p-3 rounded-lg border text-center transition-all hover:shadow-sm
              ${category === key ? 'ring-2 ring-brand-400 border-brand-300' : 'border-church-200'}`}>
            <span className="text-lg">{icon}</span>
            <p className="text-xs font-medium text-church-600 mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* Log Entries */}
      {loading ? (
        <div className="card text-center py-12 text-church-400">Loading audit trail...</div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-church-400">No audit events found.</p>
          <p className="text-xs text-church-300 mt-1">Events are logged as actions happen in the system.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const cat = CATEGORY_LABELS[log.category] || { label: log.category, icon: '📄', color: 'bg-church-100 text-church-700' };
            const actionIcon = ACTION_ICONS[log.action] || '📄';
            return (
              <div key={log.id} className="card p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{actionIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge text-[10px] ${cat.color}`}>{cat.label}</span>
                      <span className="text-xs font-mono text-church-400">{log.action}</span>
                    </div>
                    <p className="text-sm text-church-800">{log.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-church-400">
                      <span>{formatTime(log.createdAt)}</span>
                      {log.userName && (
                        <span>by <span className="font-medium text-church-600">{log.userName}</span></span>
                      )}
                      {log.ipAddress && (
                        <span className="font-mono">{log.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary btn-sm">← Prev</button>
          <span className="px-4 py-1.5 text-sm text-church-600">
            Page {page} of {Math.ceil(total / 50)}
          </span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}
            className="btn-secondary btn-sm">Next →</button>
        </div>
      )}
    </div>
  );
}
