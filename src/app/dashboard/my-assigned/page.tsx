'use client';
import PageHelp from '@/components/PageHelp';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS, formatDate } from '@/lib/utils';

export default function MyAssignedGuestsPage() {
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'mine' | 'available'>('mine');
  const [availableGuests, setAvailableGuests] = useState<any[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [filter, setFilter] = useState('active');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user first, then fetch their assigned guests
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(async (data) => {
        setUser(data.user);
        // For volunteers, /api/guests already filters by assigned user
        // For admin/leader, we pass volunteerId to filter by their own ID
        const url = data.user?.permissionLevel === 'VOLUNTEER_ACCESS'
          ? '/api/guests?limit=200'
          : `/api/guests?limit=200&volunteerId=${data.user?.userId}`;
        const res = await fetch(url);
        const guestsData = await res.json();
        setGuests(guestsData.guests || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = guests.filter(g => {
    if (filter === 'active') return !['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE', 'ARCHIVED'].includes(g.status);
    if (filter === 'completed') return g.status === 'BECOME_SIGNED_UP';
    if (filter === 'closed') return ['NOT_INTERESTED', 'INACTIVE'].includes(g.status);
    return g.status !== 'ARCHIVED';
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

  const fetchAvailable = async () => {
    setAvailableLoading(true);
    try {
      const res = await fetch('/api/guests?unassigned=true&limit=50');
      if (res.ok) {
        const data = await res.json();
        setAvailableGuests(data.guests || []);
      }
    } finally {
      setAvailableLoading(false);
    }
  };

  const selfAssign = async (guestId: string, guestName: string) => {
    if (!confirm(`Assign ${guestName} to yourself for follow-up?`)) return;
    setAssigning(guestId);
    try {
      const res = await fetch('/api/guests/self-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // Remove from available, refresh my guests
      setAvailableGuests(prev => prev.filter(g => g.id !== guestId));
      // Refresh my guests list
      if (user) {
        const url = user.permissionLevel === 'VOLUNTEER_ACCESS'
          ? '/api/guests?limit=200'
          : '/api/guests?limit=200&volunteerId=' + user.userId;
        const r = await fetch(url);
        if (r.ok) { const d = await r.json(); setGuests(d.guests || []); }
      }
    } catch (e: any) {
      alert('❌ ' + e.message);
    } finally {
      setAssigning(null);
    }
  };


  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-header">My Guests ({guests.length})</h1>
        <PageHelp docSection="guest-pipeline" tips={[
          { icon: "🙋", title: "Your assigned guests", body: "These are the guests assigned specifically to you for follow-up. Focus here first every week." },
          { icon: "📞", title: "Log every contact", body: "After every call, text, or visit — open the guest profile and log an activity. This keeps your leader informed and the Audit Trail complete." },
          { icon: "🎯", title: "Tick off milestones", body: "When a guest gets baptised, joins a group, or signs up for BECOME — tick it off in their Target Goals section." }
        ]} />
      </div>

      {tab === 'mine' && guests.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-church-400 mb-2">No guests assigned to you yet.</p>
          <p className="text-sm text-church-300">Guests will appear here once they are assigned to you.</p>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'active', label: 'Active', count: guests.filter(g => !['BECOME_SIGNED_UP', 'NOT_INTERESTED', 'INACTIVE', 'ARCHIVED'].includes(g.status)).length },
              { key: 'all', label: 'All', count: guests.filter(g => g.status !== 'ARCHIVED').length },
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

                      {nextFollowUp && (
                        <div className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-church-500'}`}>
                          {overdue ? '⚠️ Overdue' : `Next: ${formatDate(nextFollowUp)}`}
                        </div>
                      )}
                    </div>

                    {/* Target badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {guest.becomeSignup && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">Become ✓</span>}
                      {guest.waterBaptism && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Baptism ✓</span>}
                      {guest.volunteerInChurch && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Volunteer ✓</span>}
                      {guest.joinSmallGroup && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Small Group ✓</span>}
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
        </>
      )}

      {/* ── Available Guests Tab ── */}
      {tab === 'available' && (
        <div className="space-y-3">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
            <p className="font-semibold mb-1">🙋 Pick up a guest for follow-up</p>
            <p className="text-emerald-700">These guests have submitted the welcome form but haven't been assigned yet. Click <strong>Assign to Me</strong> to take them on — you'll get a notification and they'll appear in your My Guests list.</p>
          </div>

          {availableLoading ? (
            <div className="text-center py-8 text-church-400">Loading available guests…</div>
          ) : availableGuests.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-semibold text-church-700">All guests are assigned!</p>
              <p className="text-sm text-church-400 mt-1">No unassigned guests at the moment. Check back after the next service.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableGuests.map((guest: any) => {
                const guestName = `${guest.firstName} ${guest.lastName}`;
                return (
                  <div key={guest.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                        {guest.firstName[0]}{guest.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-church-900 truncate">{guestName}</p>
                        <p className="text-xs text-church-400">{guest.serviceAttended || 'Service not specified'}</p>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0">New</span>
                    </div>
                    {guest.phone && <p className="text-xs text-church-500 mb-1">📞 {guest.phone}</p>}
                    {guest.preferredContactMethod && <p className="text-xs text-church-500 mb-3">Prefers: {guest.preferredContactMethod}</p>}
                    {guest.prayerRequest && (
                      <p className="text-xs text-church-400 italic mb-3 line-clamp-2">🙏 "{guest.prayerRequest}"</p>
                    )}
                    <button
                      onClick={() => selfAssign(guest.id, guestName)}
                      disabled={assigning === guest.id}
                      className="w-full btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700"
                    >
                      {assigning === guest.id ? 'Assigning…' : '🙋 Assign to Me'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
