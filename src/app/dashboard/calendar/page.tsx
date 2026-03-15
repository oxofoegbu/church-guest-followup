'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ACTION_ITEM_TYPES, formatDate } from '@/lib/utils';

type ViewMode = 'calendar' | 'list';

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const preGuestId = searchParams.get('guestId');
  const [items, setItems] = useState<any[]>([]);
  const [allGuests, setAllGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showAddModal, setShowAddModal] = useState(!!preGuestId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<'upcoming' | 'overdue' | 'completed' | 'all'>('upcoming');

  const fetchItems = useCallback(async () => {
    const params = view === 'calendar'
      ? `month=${currentMonth}`
      : listFilter === 'all' ? '' : `view=${listFilter}`;
    const res = await fetch(`/api/action-items?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
    }
  }, [currentMonth, view, listFilter]);

  useEffect(() => {
    fetchItems();
    fetch('/api/guests?limit=200').then(r => r.ok ? r.json() : { guests: [] })
      .then((data: any) => setAllGuests(data.guests || []))
      .finally(() => setLoading(false));
  }, [fetchItems]);

  const prevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleComplete = async (id: string, completed: boolean) => {
    await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: completed ? 'uncomplete' : 'complete', id }),
    });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this action item?')) return;
    await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    fetchItems();
  };

  const exportICS = () => {
    const params = view === 'calendar' ? `month=${currentMonth}&format=ics` : `format=ics`;
    window.open(`/api/action-items?${params}`, '_blank');
  };

  const [y, m] = currentMonth.split('-').map(Number);
  const monthLabel = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">My Calendar</h1>
          <p className="text-church-500 text-sm mt-1">Planned actions and reminders for your guests and prospects.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm">+ New Action</button>
          <button onClick={exportICS} className="btn-secondary btn-sm">📅 Export .ics</button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setView('calendar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-brand-500 text-white' : 'bg-church-100 text-church-600 hover:bg-church-200'}`}>
          📅 Calendar
        </button>
        <button onClick={() => setView('list')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'bg-brand-500 text-white' : 'bg-church-100 text-church-600 hover:bg-church-200'}`}>
          📋 List
        </button>
      </div>

      {view === 'calendar' ? (
        <CalendarView
          items={items}
          monthLabel={monthLabel}
          currentMonth={currentMonth}
          onPrev={prevMonth}
          onNext={nextMonth}
          onDayClick={(date) => { setSelectedDate(date); setShowAddModal(true); }}
          onComplete={handleComplete}
          onDelete={handleDelete}
        />
      ) : (
        <ListView
          items={items}
          filter={listFilter}
          onFilterChange={setListFilter}
          onComplete={handleComplete}
          onDelete={handleDelete}
        />
      )}

      {showAddModal && (
        <AddActionModal
          guests={allGuests}
          initialDate={selectedDate}
          initialGuestId={preGuestId}
          onClose={() => { setShowAddModal(false); setSelectedDate(null); fetchItems(); }}
        />
      )}
    </div>
  );
}

function CalendarView({ items, monthLabel, currentMonth, onPrev, onNext, onDayClick, onComplete, onDelete }: any) {
  const [y, m] = currentMonth.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getItemsForDay = (day: number) => {
    const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
    return items.filter((item: any) => {
      const d = new Date(item.dueDate);
      const itemDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return itemDate === dateStr;
    });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="btn-secondary btn-sm">← Prev</button>
        <h2 className="text-lg font-display font-bold text-church-900">{monthLabel}</h2>
        <button onClick={onNext} className="btn-secondary btn-sm">Next →</button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-church-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="bg-church-100 p-2 text-center text-xs font-medium text-church-600">{d}</div>
        ))}
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="bg-white p-1 min-h-[80px]" />;
          const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
          const dayItems = getItemsForDay(day);
          const isToday = dateStr === todayStr;

          return (
            <div key={day} className={`bg-white p-1 min-h-[80px] cursor-pointer hover:bg-brand-50 transition-colors ${isToday ? 'ring-2 ring-inset ring-brand-400' : ''}`}
              onClick={() => onDayClick(dateStr)}>
              <div className={`text-xs font-medium mb-1 ${isToday ? 'text-brand-600 font-bold' : 'text-church-500'}`}>{day}</div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map((item: any) => {
                  const typeInfo = ACTION_ITEM_TYPES[item.actionType] || { icon: '📝', label: item.actionType };
                  return (
                    <div key={item.id}
                      className={`text-[10px] px-1 py-0.5 rounded truncate ${item.completed ? 'bg-green-100 text-green-700 line-through' : 'bg-brand-50 text-brand-700'}`}
                      onClick={e => { e.stopPropagation(); onComplete(item.id, item.completed); }}>
                      {typeInfo.icon} {item.title}
                    </div>
                  );
                })}
                {dayItems.length > 3 && (
                  <div className="text-[10px] text-church-400 px-1">+{dayItems.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ items, filter, onFilterChange, onComplete, onDelete }: any) {
  const now = new Date();

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['upcoming', 'overdue', 'completed', 'all'] as const).map(f => (
          <button key={f} onClick={() => onFilterChange(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${filter === f ? 'bg-brand-500 text-white' : 'bg-church-100 text-church-600 hover:bg-church-200'}`}>
            {f === 'upcoming' ? '📅 Upcoming' : f === 'overdue' ? '⚠️ Overdue' : f === 'completed' ? '✅ Completed' : '📋 All'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-12 text-church-400">
          No action items found.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const typeInfo = ACTION_ITEM_TYPES[item.actionType] || { icon: '📝', label: item.customAction || item.actionType };
            const isOverdue = !item.completed && new Date(item.dueDate) < now;

            return (
              <div key={item.id} className={`card p-4 flex items-start gap-3 ${item.completed ? 'opacity-60' : ''}`}>
                <button onClick={() => onComplete(item.id, item.completed)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors
                    ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-church-300 hover:border-brand-400'}`}>
                  {item.completed && '✓'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">{typeInfo.icon}</span>
                    <span className={`font-medium text-sm ${item.completed ? 'line-through text-church-400' : 'text-church-900'}`}>{item.title}</span>
                    {isOverdue && <span className="badge bg-red-100 text-red-700 text-[10px]">OVERDUE</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-church-500">
                    <span>{formatDate(item.dueDate)}{item.dueTime ? ` at ${item.dueTime}` : ''}</span>
                    <span className="badge bg-church-100 text-church-600 text-[10px]">{typeInfo.label}</span>
                  </div>
                  {item.guest && (
                    <Link href={`/dashboard/guests/${item.guest.id}`}
                      className="text-xs text-brand-600 hover:underline mt-1 inline-block">
                      → {item.guest.firstName} {item.guest.lastName}
                      {item.guest.source === 'PROSPECT' && ' (prospect)'}
                    </Link>
                  )}
                  {item.notes && <p className="text-xs text-church-400 mt-1">{item.notes}</p>}
                </div>
                <button onClick={() => onDelete(item.id)}
                  className="text-church-300 hover:text-red-500 text-sm shrink-0">🗑️</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddActionModal({ guests, initialDate, initialGuestId, onClose }: { guests: any[]; initialDate?: string | null; initialGuestId?: string | null; onClose: () => void }) {
  const [form, setForm] = useState({
    guestId: initialGuestId || '',
    actionType: 'CALL',
    customAction: '',
    title: '',
    notes: '',
    dueDate: initialDate || new Date().toISOString().split('T')[0],
    dueTime: '',
    reminderMinutes: 60,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate title when action type or guest changes
  const updateTitle = (actionType: string, guestId: string, customAction?: string) => {
    const typeLabel = ACTION_ITEM_TYPES[actionType]?.label || customAction || actionType;
    const guest = guests.find((g: any) => g.id === guestId);
    const guestName = guest ? `${guest.firstName} ${guest.lastName}` : '';
    return guestName ? `${typeLabel} — ${guestName}` : typeLabel;
  };

  const handleTypeChange = (actionType: string) => {
    const title = updateTitle(actionType, form.guestId, form.customAction);
    setForm({ ...form, actionType, title });
  };

  const handleGuestChange = (guestId: string) => {
    const title = updateTitle(form.actionType, guestId, form.customAction);
    setForm({ ...form, guestId, title });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        guestId: form.guestId || null,
        reminderMinutes: Number(form.reminderMinutes),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create action item');
      setSaving(false);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="section-header mb-4">New Action Item</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Action Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(ACTION_ITEM_TYPES).map(([key, { label, icon }]) => (
                <button key={key} type="button"
                  onClick={() => handleTypeChange(key)}
                  className={`p-2 rounded-lg border text-sm text-left flex items-center gap-2 transition-all
                    ${form.actionType === key ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400' : 'border-church-200 hover:border-church-300'}`}>
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {form.actionType === 'OTHER' && (
            <div>
              <label className="label">Custom Action</label>
              <input value={form.customAction}
                onChange={e => {
                  const title = updateTitle('OTHER', form.guestId, e.target.value);
                  setForm({ ...form, customAction: e.target.value, title });
                }}
                className="input-field" placeholder="Describe the action..." />
            </div>
          )}

          <div>
            <label className="label">For Guest/Prospect (optional)</label>
            <select value={form.guestId} onChange={e => handleGuestChange(e.target.value)} className="select-field">
              <option value="">— General (no specific person) —</option>
              <optgroup label="Prospects">
                {guests.filter((g: any) => g.source === 'PROSPECT' && g.status !== 'ARCHIVED').map((g: any) => (
                  <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                ))}
              </optgroup>
              <optgroup label="Guests">
                {guests.filter((g: any) => g.source !== 'PROSPECT' && g.status !== 'ARCHIVED').map((g: any) => (
                  <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              required className="input-field" placeholder="Auto-generated or type your own" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Due Date *</label>
              <input type="date" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                required className="input-field" />
            </div>
            <div>
              <label className="label">Time (optional)</label>
              <input type="time" value={form.dueTime}
                onChange={e => setForm({ ...form, dueTime: e.target.value })}
                className="input-field" />
            </div>
          </div>

          <div>
            <label className="label">Remind Me</label>
            <select value={form.reminderMinutes} onChange={e => setForm({ ...form, reminderMinutes: Number(e.target.value) })}
              className="select-field">
              <option value={0}>No reminder</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={120}>2 hours before</option>
              <option value={1440}>1 day before</option>
              <option value={2880}>2 days before</option>
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2} className="textarea-field" placeholder="Additional details..." />
          </div>

          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Create Action Item'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
// rebuild Sun Mar 15 01:57:05 EDT 2026
