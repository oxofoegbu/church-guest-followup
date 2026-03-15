'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS, PREFERRED_CONTACT_LABELS, formatDate } from '@/lib/utils';

export default function GuestsPage() {
  const [guests, setGuests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: '', status: '', volunteerId: '', service: '', dateFrom: '', dateTo: '',
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkVolunteer, setBulkVolunteer] = useState('');

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status === 'UNASSIGNED') {
      params.set('unassigned', 'true');
    } else if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.volunteerId) params.set('volunteerId', filters.volunteerId);
    if (filters.service) params.set('service', filters.service);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    params.set('page', String(page));

    const res = await fetch(`/api/guests?${params}`);
    const data = await res.json();
    setGuests(data.guests || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user));
    fetch('/api/users').then(r => r.ok ? r.json() : { users: [] })
      .then(d => setVolunteers((d.users || []).filter((u: any) => u.active)));
    fetchGuests();
  }, [fetchGuests]);

  const handleBulkAssign = async () => {
    if (!bulkVolunteer || selected.length === 0) return;
    for (const guestId of selected) {
      await fetch(`/api/guests/${guestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedVolunteerId: bulkVolunteer }),
      });
    }
    setSelected([]);
    setBulkVolunteer('');
    fetchGuests();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const isAdmin = user?.permissionLevel === 'ADMIN_ACCESS';
  const canAssign = user?.permissionLevel === 'ADMIN_ACCESS' || user?.permissionLevel === 'LEADER_ACCESS';

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="page-header">All Guests ({total})</h1>
        <div className="flex gap-2">
          <a href="/api/reports/export?type=guests" className="btn-secondary btn-sm">
            📥 Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <input type="search" placeholder="Search name/phone/email..."
            value={filters.search} onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            className="input-field col-span-2" />
          <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
            className="select-field">
            <option value="">All Statuses</option>
            <option value="UNASSIGNED">— Unassigned —</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={filters.volunteerId}
            onChange={e => { setFilters({ ...filters, volunteerId: e.target.value }); setPage(1); }}
            className="select-field">
            <option value="">All Assignees</option>
            {volunteers.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <input type="date" value={filters.dateFrom}
            onChange={e => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1); }}
            className="input-field" placeholder="From" />
          <input type="date" value={filters.dateTo}
            onChange={e => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1); }}
            className="input-field" placeholder="To" />
        </div>
      </div>

      {/* Bulk Assign */}
      {canAssign && selected.length > 0 && (
        <div className="card bg-brand-50 border-brand-200 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <select value={bulkVolunteer} onChange={e => setBulkVolunteer(e.target.value)}
            className="select-field w-auto">
            <option value="">Assign to...</option>
            {volunteers.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button onClick={handleBulkAssign} disabled={!bulkVolunteer} className="btn-primary btn-sm">
            Assign Selected
          </button>
          <button onClick={() => setSelected([])} className="btn-secondary btn-sm">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {canAssign && <th className="w-10"><input type="checkbox"
                checked={selected.length === guests.length && guests.length > 0}
                onChange={e => setSelected(e.target.checked ? guests.map(g => g.id) : [])}
              /></th>}
              <th>Guest</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Returns</th>
              <th>First Visit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-church-400">Loading...</td></tr>
            ) : guests.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-church-400">No guests found</td></tr>
            ) : guests.map(guest => (
              <tr key={guest.id}>
                {canAssign && <td>
                  <input type="checkbox" checked={selected.includes(guest.id)}
                    onChange={() => toggleSelect(guest.id)} />
                </td>}
                <td>
                  <Link href={`/dashboard/guests/${guest.id}`}
                    className="font-medium text-church-900 hover:text-brand-600">
                    {guest.firstName} {guest.lastName}
                  </Link>
                  {guest.email && <div className="text-xs text-church-400">{guest.email}</div>}
                </td>
                <td className="text-sm">{guest.phone || '—'}</td>
                <td>
                  <span className={`badge ${STATUS_COLORS[guest.status]}`}>
                    {STATUS_LABELS[guest.status]}
                  </span>
                </td>
                <td className="text-sm">
                  {guest.assignedVolunteer?.name || (
                    <span className="text-church-400 italic">Unassigned</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${guest.serviceReturnCount >= 7 ? 'bg-emerald-100 text-emerald-700' : 'bg-church-100 text-church-600'}`}>
                    {guest.serviceReturnCount}/7
                  </span>
                </td>
                <td className="text-sm text-church-500">{formatDate(guest.firstVisitDate)}</td>
                <td>
                  <Link href={`/dashboard/guests/${guest.id}`}
                    className="text-brand-600 hover:text-brand-700 text-sm font-medium">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
