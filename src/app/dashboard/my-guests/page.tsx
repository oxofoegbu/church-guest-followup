'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS, formatDate } from '@/lib/utils';

export default function MyGuestsPage() {
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    fetch('/api/guests?limit=200')
      .then(r => r.json())
      .then(data => { setGuests(data.guests || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = guests.filter(g => {
    if (filter === 'active') return !['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE'].includes(g.status);
    if (filter === 'completed') return g.status === 'BECOME_SIGNED_UP';
    if (filter === 'closed') return ['NOT_INTERESTED', 'INACTIVE'].includes(g.status);
    return true;
  });

  const getNextFollowUp = (guest: any) => {
    const lastAct = guest.activities?.[0];
    return lastAct?.nextFollowUpDate || null;
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-church-400">Loading...</div>;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-header">My Guests ({guests.length})</h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Active', count: guests.filter(g => !['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE'].includes(g.status)).length },
          { key: 'all', label: 'All', count: guests.length },
          { key: 'completed', label: 'Completed', count: guests.filter(g => g.status === 'BECOME_SIGNED_UP').length },
          { key: 'closed', label: 'Closed', count: guests.filter(g => ['NOT_INTERESTED', 'INACTIVE'].includes(g.status)).length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === tab.key ? 'bg-church-800 text-white' : 'bg-white text-church-600 border border-church-200 hover:bg-church-50'}`}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Guest Cards */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-church-400">No guests in this category.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(guest => {
            const nextFollowUp = getNextFollowUp(guest);
            const overdue = isOverdue(nextFollowUp);
            return (
              <Link key={guest.id} href={`/dashboard/guests/${guest.id}`}
                className={`card hover:shadow-md transition-shadow cursor-pointer
                  ${overdue ? 'border-l-4 border-l-red-400' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-semibold text-church-900">
                      {guest.firstName} {guest.lastName}
                    </h3>
                    <p className="text-sm text-church-500">{guest.phone}</p>
                  </div>
                  <span className={`badge ${STATUS_COLORS[guest.status]}`}>
                    {STATUS_LABELS[guest.status]}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  {/* Service Returns Progress */}
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-church-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${guest.serviceReturnCount >= 7 ? 'bg-emerald-500' : 'bg-brand-400'}`}
                        style={{ width: `${(guest.serviceReturnCount / 7) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${guest.serviceReturnCount >= 7 ? 'text-emerald-600' : 'text-church-500'}`}>
                      {guest.serviceReturnCount}/7
                    </span>
                  </div>

                  {/* Next Follow-up */}
                  {nextFollowUp && (
                    <div className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-church-500'}`}>
                      {overdue ? '⚠️ Overdue' : `Next: ${formatDate(nextFollowUp)}`}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-church-50">
                  <span className="text-xs text-church-400">
                    First visit: {formatDate(guest.firstVisitDate)}
                  </span>
                  <span className="text-brand-600 text-sm font-medium">View →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
