import PageHelp from '@/components/PageHelp';
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ACTION_ITEM_TYPES, formatDate } from '@/lib/utils';

type ViewMode = 'calendar' | 'list';
type RecurrenceType = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CUSTOM';

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; desc: string }[] = [
  { value: 'DAILY',     label: 'Daily',       desc: 'Every day'          },
  { value: 'WEEKLY',    label: 'Weekly',      desc: 'Every 7 days'       },
  { value: 'BIWEEKLY',  label: 'Bi-weekly',   desc: 'Every 14 days'      },
  { value: 'MONTHLY',   label: 'Monthly',     desc: 'Same date each month' },
  { value: 'QUARTERLY', label: 'Quarterly',   desc: 'Every 3 months'     },
  { value: 'CUSTOM',    label: 'Custom',      desc: 'Set your own interval' },
];

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const preGuestId = searchParams.get('guestId');
  const [items, setItems] = useState<any[]>([]);
  const [allGuests, setAllGuests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
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
    if (res.ok) { const data = await res.json(); setItems(data.items || []); }
  }, [currentMonth, view, listFilter]);

  useEffect(() => {
    fetchItems();
    fetch('/api/guests?limit=200').then(r => r.ok ? r.json() : { guests: [] })
      .then((d: any) => setAllGuests(d.guests || [])).finally(() => setLoading(false));
    fetch('/api/users?limit=200').then(r => r.ok ? r.json() : {})
      .then((d: any) => setAllUsers(d.users || []));
    fetch('/api/auth/me').then(r => r.json()).then(d => setCurrentUser(d.user)).catch(() => {});
  }, [fetchItems]);

  const prevMonth = () => {
    const [y,m] = currentMonth.split('-').map(Number);
    const d = new Date(y,m-2,1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  };
  const nextMonth = () => {
    const [y,m] = currentMonth.split('-').map(Number);
    const d = new Date(y,m,1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  };

  const handleComplete = async (id: string, completed: boolean) => {
    await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: completed ? 'uncomplete' : 'complete', id }),
    });
    fetchItems();
  };

  const handleDelete = async (id: string, isRecurring: boolean) => {
    if (isRecurring) {
      const choice = confirm('Delete just this occurrence?\n\nPress OK for "just this one", Cancel to choose "entire series".');
      if (choice) {
        await fetch('/api/action-items', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }) });
      } else {
        if (!confirm('Delete ALL occurrences in this series? This cannot be undone.')) return;
        await fetch('/api/action-items', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id, deleteAll: true }) });
      }
    } else {
      if (!confirm('Delete this action item?')) return;
      await fetch('/api/action-items', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }) });
    }
    fetchItems();
  };

  const exportICS = () => {
    const params = view === 'calendar' ? `month=${currentMonth}&format=ics` : `format=ics`;
    window.open(`/api/action-items?${params}`, '_blank');
  };

  const [y,m] = currentMonth.split('-').map(Number);
  const monthLabel = new Date(y,m-1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-header">My Calendar</h1>
        <PageHelp docSection="calendar" tips={[
          { icon: "📅", title: "Three types of items", body: "Your calendar shows personal action items (your follow-up tasks), service roles (from the Sunday Schedule), and meeting invites (from other team members)." },
          { icon: "🔁", title: "Set recurring events", body: "For regular meetings like weekly prayer or monthly leadership reviews, use the Recurring option when creating an event. Set it once, done." },
          { icon: "👥", title: "Invite attendees", body: "Check 'Meeting with attendees' when creating an event and tick who to invite. Each person gets the event added to their calendar automatically." }
        ]} />
          <p className="text-church-500 text-sm mt-1">Actions, events, and service roles.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm">+ New Action</button>
          <button onClick={exportICS} className="btn-secondary btn-sm">📅 Export .ics</button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['calendar','list'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view===v ? 'bg-brand-500 text-white' : 'bg-church-100 text-church-600 hover:bg-church-200'}`}>
            {v === 'calendar' ? '📅 Calendar' : '📋 List'}
          </button>
        ))}
      </div>

      {view === 'calendar' ? (
        <CalendarView items={items} monthLabel={monthLabel} currentMonth={currentMonth}
          onPrev={prevMonth} onNext={nextMonth}
          onDayClick={(date: string) => { setSelectedDate(date); setShowAddModal(true); }}
          onComplete={handleComplete} onDelete={handleDelete} />
      ) : (
        <ListView items={items} filter={listFilter} onFilterChange={setListFilter}
          onComplete={handleComplete} onDelete={handleDelete} />
      )}

      {showAddModal && (
        <AddActionModal guests={allGuests} users={allUsers} currentUser={currentUser}
          initialDate={selectedDate} initialGuestId={preGuestId}
          onClose={() => { setShowAddModal(false); setSelectedDate(null); fetchItems(); }} />
      )}
    </div>
  );
}

function CalendarView({ items, monthLabel, currentMonth, onPrev, onNext, onDayClick, onComplete, onDelete }: any) {
  const [y,m] = currentMonth.split('-').map(Number);
  const firstDay = new Date(y,m-1,1).getDay();
  const daysInMonth = new Date(y,m,0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const days: (number|null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getItemsForDay = (day: number) => {
    const dateStr = `${currentMonth}-${String(day).padStart(2,'0')}`;
    return items.filter((item: any) => {
      const d = new Date(item.dueDate);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` === dateStr;
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
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="bg-church-100 p-2 text-center text-xs font-medium text-church-600">{d}</div>
        ))}
        {days.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} className="bg-white p-1 min-h-[80px]" />;
          const dateStr = `${currentMonth}-${String(day).padStart(2,'0')}`;
          const dayItems = getItemsForDay(day);
          const isToday = dateStr === todayStr;
          return (
            <div key={day}
              className={`bg-white p-1 min-h-[80px] cursor-pointer hover:bg-brand-50 transition-colors ${isToday ? 'ring-2 ring-inset ring-brand-400' : ''}`}
              onClick={() => onDayClick(dateStr)}>
              <div className={`text-xs font-medium mb-1 ${isToday ? 'text-brand-600 font-bold' : 'text-church-500'}`}>{day}</div>
              <div className="space-y-0.5">
                {dayItems.slice(0,3).map((item: any) => {
                  const typeInfo = ACTION_ITEM_TYPES[item.actionType] || { icon: '📝' };
                  const isService = !!item.scheduleId;
                  const isEvent = item.isEvent;
                  const isRecurring = !!item.recurrence;
                  return (
                    <div key={item.id}
                      className={`text-[10px] px-1 py-0.5 rounded truncate ${
                        item.completed    ? 'bg-green-100 text-green-700 line-through' :
                        isService         ? 'bg-purple-100 text-purple-700' :
                        isEvent           ? 'bg-blue-100 text-blue-700' :
                                            'bg-brand-50 text-brand-700'}`}
                      onClick={e => { e.stopPropagation(); onComplete(item.id, item.completed); }}>
                      {isService ? '⛪' : typeInfo.icon} {item.title}{isRecurring ? ' 🔁' : ''}
                    </div>
                  );
                })}
                {dayItems.length > 3 && <div className="text-[10px] text-church-400 px-1">+{dayItems.length-3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 pt-3 border-t border-church-100 text-xs text-church-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-50 border border-brand-200 inline-block" /> Action</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-200 inline-block" /> ⛪ Service Role</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" /> 👥 Event</span>
        <span className="flex items-center gap-1">🔁 Recurring</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> Completed</span>
      </div>
    </div>
  );
}

function ListView({ items, filter, onFilterChange, onComplete, onDelete }: any) {
  const now = new Date();
  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['upcoming','overdue','completed','all'] as const).map(f => (
          <button key={f} onClick={() => onFilterChange(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter===f ? 'bg-brand-500 text-white' : 'bg-church-100 text-church-600 hover:bg-church-200'}`}>
            {f==='upcoming'?'📅 Upcoming':f==='overdue'?'⚠️ Overdue':f==='completed'?'✅ Completed':'📋 All'}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="card text-center py-12 text-church-400">No action items found.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const typeInfo = ACTION_ITEM_TYPES[item.actionType] || { icon: '📝', label: item.customAction || item.actionType };
            const isOverdue = !item.completed && new Date(item.dueDate) < now;
            const isService = !!item.scheduleId;
            const isHostEvent = item.isEvent && item.invites?.length > 0;
            const isInvitedEvent = item.isEvent && (!item.invites || item.invites.length === 0);
            const isRecurring = !!item.recurrence;
            return (
              <div key={item.id} className={`card p-4 flex items-start gap-3 ${item.completed ? 'opacity-60' : ''}`}>
                <button onClick={() => onComplete(item.id, item.completed)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-church-300 hover:border-brand-400'}`}>
                  {item.completed && '✓'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">{isService ? '⛪' : typeInfo.icon}</span>
                    <span className={`font-medium text-sm ${item.completed ? 'line-through text-church-400' : 'text-church-900'}`}>{item.title}</span>
                    {isOverdue    && <span className="badge bg-red-100 text-red-700 text-[10px]">OVERDUE</span>}
                    {isService    && <span className="badge bg-purple-100 text-purple-700 text-[10px]">⛪ SERVICE ROLE</span>}
                    {isHostEvent  && <span className="badge bg-blue-100 text-blue-700 text-[10px]">👥 {item.invites.length} ATTENDEE{item.invites.length>1?'S':''}</span>}
                    {isInvitedEvent && <span className="badge bg-indigo-100 text-indigo-700 text-[10px]">📨 INVITED</span>}
                    {isRecurring  && <span className="badge bg-amber-100 text-amber-700 text-[10px]">🔁 {item.recurrence}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-church-500 flex-wrap">
                    <span>{formatDate(item.dueDate)}{item.dueTime ? ` at ${item.dueTime}` : ''}</span>
                    <span className="badge bg-church-100 text-church-600 text-[10px]">{typeInfo.label}</span>
                    {item.recurrenceEndDate && <span className="text-church-400">until {new Date(item.recurrenceEndDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>}
                  </div>
                  {isHostEvent && <p className="text-xs text-blue-600 mt-1">Attendees: {item.invites.map((i: any) => i.userName).join(', ')}</p>}
                  {item.guest && (
                    <Link href={`/dashboard/guests/${item.guest.id}`} className="text-xs text-brand-600 hover:underline mt-1 inline-block">
                      → {item.guest.firstName} {item.guest.lastName}{item.guest.source==='PROSPECT'?' (prospect)':''}
                    </Link>
                  )}
                  {item.notes && <p className="text-xs text-church-400 mt-1 whitespace-pre-line">{item.notes}</p>}
                </div>
                <button onClick={() => onDelete(item.id, isRecurring)} className="text-church-300 hover:text-red-500 text-sm shrink-0">🗑️</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddActionModal({ guests, users, currentUser, initialDate, initialGuestId, onClose }: {
  guests: any[]; users: any[]; currentUser: any;
  initialDate?: string | null; initialGuestId?: string | null; onClose: () => void;
}) {
  const [form, setForm] = useState({
    guestId: initialGuestId || '', actionType: 'CALL', customAction: '',
    title: '', notes: '',
    dueDate: initialDate || new Date().toISOString().split('T')[0],
    dueTime: '', reminderMinutes: 60,
  });
  const [isEvent, setIsEvent] = useState(false);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(7);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateTitle = (actionType: string, guestId: string, customAction?: string) => {
    const typeLabel = ACTION_ITEM_TYPES[actionType]?.label || customAction || actionType;
    const guest = guests.find((g: any) => g.id === guestId);
    const guestName = guest ? `${guest.firstName} ${guest.lastName}` : '';
    return guestName ? `${typeLabel} — ${guestName}` : typeLabel;
  };

  const handleTypeChange = (actionType: string) =>
    setForm({ ...form, actionType, title: updateTitle(actionType, form.guestId, form.customAction) });

  const toggleAttendee = (id: string) =>
    setAttendeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecurring && !recurrenceEndDate) { setError('Please set an end date for recurring items.'); return; }
    setSaving(true); setError('');

    const res = await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        guestId: form.guestId || null,
        reminderMinutes: Number(form.reminderMinutes),
        isEvent,
        attendeeIds: isEvent ? attendeeIds : [],
        recurrence:          isRecurring ? recurrence : null,
        recurrenceInterval:  isRecurring && recurrence === 'CUSTOM' ? recurrenceInterval : null,
        recurrenceEndDate:   isRecurring ? recurrenceEndDate : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create');
      setSaving(false); return;
    }
    onClose();
  };

  const otherUsers = users.filter(u => u.id !== currentUser?.userId && u.active !== false);

  // Count occurrences preview
  const occurrenceCount = (() => {
    if (!isRecurring || !recurrenceEndDate || !form.dueDate) return null;
    try {
      const start = new Date(form.dueDate); const end = new Date(recurrenceEndDate);
      const days = recurrence === 'DAILY' ? 1 : recurrence === 'WEEKLY' ? 7 : recurrence === 'BIWEEKLY' ? 14 :
                   recurrence === 'MONTHLY' ? 30 : recurrence === 'QUARTERLY' ? 91 : recurrenceInterval;
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      return Math.min(Math.floor(diff / days) + 1, 104);
    } catch { return null; }
  })();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="section-header mb-4">New Action Item</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Action type */}
          <div>
            <label className="label">Action Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(ACTION_ITEM_TYPES).map(([key, { label, icon }]) => (
                <button key={key} type="button" onClick={() => handleTypeChange(key)}
                  className={`p-2 rounded-lg border text-sm text-left flex items-center gap-2 transition-all ${form.actionType===key ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400' : 'border-church-200 hover:border-church-300'}`}>
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {form.actionType === 'OTHER' && (
            <div>
              <label className="label">Custom Action</label>
              <input value={form.customAction}
                onChange={e => { const title = updateTitle('OTHER', form.guestId, e.target.value); setForm({...form, customAction: e.target.value, title}); }}
                className="input-field" placeholder="Describe the action..." />
            </div>
          )}

          {/* Event with attendees */}
          <div className="bg-church-50 border border-church-200 rounded-lg p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isEvent} onChange={e => { setIsEvent(e.target.checked); if (!e.target.checked) setAttendeeIds([]); }}
                className="w-4 h-4 rounded border-church-300 text-brand-500" />
              <div>
                <span className="text-sm font-medium text-church-800">👥 Meeting / event with attendees</span>
                <p className="text-xs text-church-500 mt-0.5">Invited people get a calendar entry automatically</p>
              </div>
            </label>
            {isEvent && (
              <div className="mt-3 pt-3 border-t border-church-200">
                <label className="label mb-2">Invite Attendees</label>
                <div className="space-y-1 max-h-44 overflow-y-auto border border-church-200 rounded-lg p-2 bg-white">
                  {otherUsers.map(u => (
                    <label key={u.id} className="flex items-center gap-2 py-1.5 px-1 cursor-pointer hover:bg-brand-50 rounded">
                      <input type="checkbox" checked={attendeeIds.includes(u.id)} onChange={() => toggleAttendee(u.id)}
                        className="w-4 h-4 rounded border-church-300 text-brand-500" />
                      <span className="text-sm text-church-900">{u.name}</span>
                      <span className="text-xs text-church-400">{u.role}</span>
                    </label>
                  ))}
                </div>
                {attendeeIds.length > 0 && (
                  <p className="text-xs text-brand-600 mt-1.5 font-medium">✓ {attendeeIds.length} person{attendeeIds.length>1?'s':''} will be invited</p>
                )}
              </div>
            )}
          </div>

          {/* Recurring */}
          <div className="bg-church-50 border border-church-200 rounded-lg p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-church-300 text-brand-500" />
              <div>
                <span className="text-sm font-medium text-church-800">🔁 Recurring</span>
                <p className="text-xs text-church-500 mt-0.5">Repeat this item on a schedule</p>
              </div>
            </label>

            {isRecurring && (
              <div className="mt-3 pt-3 border-t border-church-200 space-y-3">
                <div>
                  <label className="label mb-2">Frequency</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {RECURRENCE_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setRecurrence(opt.value)}
                        className={`p-2 rounded-lg border text-xs text-left transition-all ${recurrence===opt.value ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400 text-brand-700' : 'border-church-200 bg-white hover:border-church-300 text-church-700'}`}>
                        <div className="font-semibold">{opt.label}</div>
                        <div className="text-church-400 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {recurrence === 'CUSTOM' && (
                  <div>
                    <label className="label">Repeat every (days)</label>
                    <input type="number" value={recurrenceInterval} min={1} max={365}
                      onChange={e => setRecurrenceInterval(Number(e.target.value))}
                      className="input-field w-32" />
                  </div>
                )}

                <div>
                  <label className="label">End Date *</label>
                  <input type="date" value={recurrenceEndDate} min={form.dueDate}
                    onChange={e => setRecurrenceEndDate(e.target.value)}
                    required={isRecurring} className="input-field" />
                </div>

                {occurrenceCount !== null && occurrenceCount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
                    🗓️ This will create approximately <strong>{occurrenceCount}</strong> occurrence{occurrenceCount>1?'s':''}.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guest */}
          <div>
            <label className="label">For Guest/Prospect (optional)</label>
            <select value={form.guestId} onChange={e => setForm({...form, guestId: e.target.value, title: updateTitle(form.actionType, e.target.value, form.customAction)})}
              className="select-field">
              <option value="">— General —</option>
              <optgroup label="Prospects">
                {guests.filter((g:any) => g.source==='PROSPECT' && g.status!=='ARCHIVED').map((g:any) => (
                  <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                ))}
              </optgroup>
              <optgroup label="Guests">
                {guests.filter((g:any) => g.source!=='PROSPECT' && g.status!=='ARCHIVED').map((g:any) => (
                  <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              required className="input-field" placeholder="Auto-generated or type your own" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Due Date *</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})}
                required className="input-field" />
            </div>
            <div>
              <label className="label">Time (optional)</label>
              <input type="time" value={form.dueTime} onChange={e => setForm({...form, dueTime: e.target.value})}
                className="input-field" />
            </div>
          </div>

          <div>
            <label className="label">Remind Me</label>
            <select value={form.reminderMinutes} onChange={e => setForm({...form, reminderMinutes: Number(e.target.value)})}
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
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              rows={2} className="textarea-field" placeholder="Additional details..." />
          </div>

          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' :
                isRecurring && occurrenceCount ? `Create (${occurrenceCount} occurrences)` :
                isEvent && attendeeIds.length > 0 ? `Create & Invite ${attendeeIds.length}` :
                'Create Action Item'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
