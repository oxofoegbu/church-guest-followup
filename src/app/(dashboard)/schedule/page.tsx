'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { CalendarDays, ChevronDown, ChevronUp, User, Mic, Music, Shield, Edit3, RefreshCw, Send } from 'lucide-react'
import AssignRoleModal from './AssignRoleModal'

type UserRef = { id: string; name: string; email: string; phone: string | null } | null

type ServiceSchedule = {
  id: string
  date: string
  monthTheme: string | null
  topic: string
  speakerName: string | null
  serviceCoordinatorName: string | null
  propheticPrayerName: string | null
  worshipLeaderName: string | null
  speakerId: string | null
  serviceCoordinatorId: string | null
  propheticPrayerId: string | null
  worshipLeaderId: string | null
  speaker: UserRef
  serviceCoordinator: UserRef
  propheticPrayer: UserRef
  worshipLeader: UserRef
  reminderSent: boolean
  notes: string | null
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const MONTH_COLORS: Record<number, { bg: string; header: string; badge: string; dot: string }> = {
  0:  { bg: 'bg-violet-50',  header: 'from-violet-700 to-violet-500',  badge: 'bg-violet-100 text-violet-800',  dot: 'bg-violet-500' },
  1:  { bg: 'bg-rose-50',    header: 'from-rose-700 to-rose-500',      badge: 'bg-rose-100 text-rose-800',      dot: 'bg-rose-500'   },
  2:  { bg: 'bg-emerald-50', header: 'from-emerald-700 to-emerald-500',badge: 'bg-emerald-100 text-emerald-800',dot: 'bg-emerald-500'},
  3:  { bg: 'bg-amber-50',   header: 'from-amber-600 to-amber-400',    badge: 'bg-amber-100 text-amber-800',    dot: 'bg-amber-500'  },
  4:  { bg: 'bg-cyan-50',    header: 'from-cyan-700 to-cyan-500',      badge: 'bg-cyan-100 text-cyan-800',      dot: 'bg-cyan-500'   },
  5:  { bg: 'bg-lime-50',    header: 'from-lime-700 to-lime-500',      badge: 'bg-lime-100 text-lime-800',      dot: 'bg-lime-500'   },
  6:  { bg: 'bg-orange-50',  header: 'from-orange-700 to-orange-500',  badge: 'bg-orange-100 text-orange-800',  dot: 'bg-orange-500' },
  7:  { bg: 'bg-teal-50',    header: 'from-teal-700 to-teal-500',      badge: 'bg-teal-100 text-teal-800',      dot: 'bg-teal-500'   },
  8:  { bg: 'bg-indigo-50',  header: 'from-indigo-700 to-indigo-500',  badge: 'bg-indigo-100 text-indigo-800',  dot: 'bg-indigo-500' },
  9:  { bg: 'bg-red-50',     header: 'from-red-700 to-red-500',        badge: 'bg-red-100 text-red-800',        dot: 'bg-red-500'    },
  10: { bg: 'bg-purple-50',  header: 'from-purple-700 to-purple-500',  badge: 'bg-purple-100 text-purple-800',  dot: 'bg-purple-500' },
  11: { bg: 'bg-blue-50',    header: 'from-blue-700 to-blue-500',      badge: 'bg-blue-100 text-blue-800',      dot: 'bg-blue-500'   },
}

function getDisplayName(name: string | null, user: UserRef): string {
  if (user?.name) return user.name
  if (name && name !== 'TBD') return name
  return 'TBD'
}

function RoleBadge({
  icon: Icon,
  label,
  name,
  user,
  color,
}: {
  icon: React.ElementType
  label: string
  name: string | null
  user: UserRef
  color: string
}) {
  const displayName = getDisplayName(name, user)
  const isAssigned = displayName !== 'TBD'

  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <div className={`mt-0.5 p-1 rounded ${color} flex-shrink-0`}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className={`text-xs font-medium truncate ${isAssigned ? 'text-gray-800' : 'text-gray-400 italic'}`}>
          {displayName}
        </p>
      </div>
    </div>
  )
}

function ServiceCard({
  svc,
  canEdit,
  isToday,
  onEdit,
  onSendReminder,
}: {
  svc: ServiceSchedule
  canEdit: boolean
  isToday: boolean
  onEdit: (s: ServiceSchedule) => void
  onSendReminder: (id: string) => void
}) {
  const date = new Date(svc.date)
  const day = date.getUTCDate()
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })

  // Extract scripture from topic (text inside last parentheses)
  const scriptureMatch = svc.topic.match(/\(([^)]+)\)\s*$/)
  const scripture = scriptureMatch?.[1] || null
  const title = scripture ? svc.topic.replace(/\s*\([^)]+\)\s*$/, '') : svc.topic

  return (
    <div className={`
      relative bg-white rounded-xl border shadow-sm overflow-hidden
      transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
      ${isToday ? 'ring-2 ring-indigo-500 shadow-indigo-100' : 'border-gray-200'}
    `}>
      {isToday && (
        <div className="absolute top-2 right-2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          This Sunday
        </div>
      )}

      <div className="p-4">
        {/* Date + Actions Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-medium text-gray-400 uppercase leading-none">{dayName}</span>
              <span className="text-lg font-bold text-gray-800 leading-tight">{day}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && !svc.reminderSent && (
              <button
                onClick={() => onSendReminder(svc.id)}
                title="Send reminder now"
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(svc)}
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Topic */}
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{title}</h3>
          {scripture && (
            <p className="mt-1 text-[11px] text-indigo-600 font-medium italic">{scripture}</p>
          )}
        </div>

        {/* Role Grid */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
          <RoleBadge icon={Mic}    label="Speaker"     name={svc.speakerName}            user={svc.speaker}           color="bg-blue-100 text-blue-600"   />
          <RoleBadge icon={User}   label="Coordinator" name={svc.serviceCoordinatorName} user={svc.serviceCoordinator} color="bg-green-100 text-green-600"  />
          <RoleBadge icon={Shield} label="Prayer"      name={svc.propheticPrayerName}    user={svc.propheticPrayer}    color="bg-purple-100 text-purple-600"/>
          <RoleBadge icon={Music}  label="Worship"     name={svc.worshipLeaderName}      user={svc.worshipLeader}      color="bg-rose-100 text-rose-600"    />
        </div>

        {svc.notes && (
          <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded italic">
            📌 {svc.notes}
          </p>
        )}

        {svc.reminderSent && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600">
            <span>✓</span><span>Reminder sent</span>
          </div>
        )}
      </div>
    </div>
  )
}

function MonthSection({
  month,
  services,
  canEdit,
  todayStr,
  onEdit,
  onSendReminder,
}: {
  month: number
  services: ServiceSchedule[]
  canEdit: boolean
  todayStr: string
  onEdit: (s: ServiceSchedule) => void
  onSendReminder: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const colors = MONTH_COLORS[month]
  const theme = services[0]?.monthTheme || ''

  // Extract short theme name (before the dash)
  const [themeName, themeSubtitle] = theme.includes(' — ')
    ? theme.split(' — ')
    : [theme, '']

  // Remove "MONTH THEME: " prefix
  const cleanThemeName = themeName.replace(/^[A-Z]+ THEME:\s*/i, '')

  return (
    <div className="mb-8">
      {/* Month Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`w-full text-left rounded-xl overflow-hidden shadow-sm mb-4`}
      >
        <div className={`bg-gradient-to-r ${colors.header} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">{MONTH_NAMES[month]}</h2>
                <span className="text-white/60 text-sm">{services.length} {services.length === 1 ? 'Sunday' : 'Sundays'}</span>
              </div>
              {cleanThemeName && (
                <div className="mt-1">
                  <span className="text-white/90 text-sm font-medium">{cleanThemeName}</span>
                  {themeSubtitle && <span className="text-white/60 text-xs ml-2">— {themeSubtitle}</span>}
                </div>
              )}
            </div>
            <div className="text-white/70">
              {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </button>

      {/* Cards Grid */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {services.map(svc => (
            <ServiceCard
              key={svc.id}
              svc={svc}
              canEdit={canEdit}
              isToday={svc.date.startsWith(todayStr)}
              onEdit={onEdit}
              onSendReminder={onSendReminder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SchedulePage() {
  const { data: session } = useSession()
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingService, setEditingService] = useState<ServiceSchedule | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [year] = useState(2026)

  const role = (session?.user as any)?.role as string | undefined
  const customRole = (session?.user as any)?.customRole as string | undefined
  const canEdit =
    ['ADMIN', 'SENIOR_LEADER'].includes(role ?? '') ||
    ['Coordination Leader', 'Prayer Coordinator', 'Worship Team Coordinator'].includes(customRole ?? '')

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/schedule?year=${year}`)
      const data = await res.json()
      setSchedules(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  const handleSendReminder = async (id: string) => {
    if (!confirm('Send WhatsApp + email reminders now to all assigned people for this service?')) return
    setSendingReminder(id)
    try {
      await fetch(`/api/cron/schedule-reminders`, { method: 'POST' })
      await fetchSchedules()
    } finally {
      setSendingReminder(null)
    }
  }

  // Group by month
  const byMonth = schedules.reduce<Record<number, ServiceSchedule[]>>((acc, svc) => {
    const m = new Date(svc.date).getUTCMonth()
    if (!acc[m]) acc[m] = []
    acc[m].push(svc)
    return acc
  }, {})

  const todayStr = new Date().toISOString().slice(0, 10)

  // Find next upcoming Sunday
  const upcomingIds = schedules
    .filter(s => s.date >= todayStr)
    .slice(0, 1)
    .map(s => s.id)

  const totalAssigned = schedules.filter(
    s => s.speakerId || s.serviceCoordinatorId || s.propheticPrayerId || s.worshipLeaderId
  ).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CalendarDays className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sunday Schedule</h1>
                <p className="text-sm text-gray-500">Grace Life Center · {year}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4 mr-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{schedules.length}</p>
                  <p className="text-xs text-gray-400">Sundays</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-indigo-600">{totalAssigned}</p>
                  <p className="text-xs text-gray-400">Linked</p>
                </div>
              </div>
              <button
                onClick={fetchSchedules}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 text-white py-6 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest text-indigo-300 uppercase mb-1">Year Theme · 2026</p>
          <h2 className="text-xl sm:text-2xl font-bold">Bringing In The Harvest</h2>
          <p className="text-indigo-200 text-sm mt-1 italic">Matt. 9:35–38 · John 4:35–37 · Psalm 126:6</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-gray-500">Loading schedule…</p>
            </div>
          </div>
        ) : (
          Object.entries(byMonth)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([monthStr, services]) => (
              <MonthSection
                key={monthStr}
                month={Number(monthStr)}
                services={services}
                canEdit={canEdit}
                todayStr={todayStr}
                onEdit={setEditingService}
                onSendReminder={handleSendReminder}
              />
            ))
        )}
      </div>

      {/* Role Assignment Modal */}
      {editingService && (
        <AssignRoleModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSaved={() => {
            setEditingService(null)
            fetchSchedules()
          }}
        />
      )}
    </div>
  )
}
