'use client'

import { useEffect, useState } from 'react'
import { X, Mic, User, Shield, Music, Search, UserCheck, Loader2 } from 'lucide-react'

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
  notes: string | null
}

type AppUser = { id: string; name: string; email: string; role: string }

type RoleField = {
  key: 'speaker' | 'serviceCoordinator' | 'propheticPrayer' | 'worshipLeader'
  nameKey: 'speakerName' | 'serviceCoordinatorName' | 'propheticPrayerName' | 'worshipLeaderName'
  idKey: 'speakerId' | 'serviceCoordinatorId' | 'propheticPrayerId' | 'worshipLeaderId'
  label: string
  icon: React.ElementType
  color: string
}

const ROLE_FIELDS: RoleField[] = [
  { key: 'speaker',            nameKey: 'speakerName',            idKey: 'speakerId',            label: 'Speaker (Word Minister)',   icon: Mic,    color: 'text-blue-600 bg-blue-100'   },
  { key: 'serviceCoordinator', nameKey: 'serviceCoordinatorName', idKey: 'serviceCoordinatorId', label: 'Service Coordinator',       icon: User,   color: 'text-green-600 bg-green-100'  },
  { key: 'propheticPrayer',    nameKey: 'propheticPrayerName',    idKey: 'propheticPrayerId',    label: 'Prophetic Prayer Minister', icon: Shield, color: 'text-purple-600 bg-purple-100'},
  { key: 'worshipLeader',      nameKey: 'worshipLeaderName',      idKey: 'worshipLeaderId',      label: 'Worship Leader',            icon: Music,  color: 'text-rose-600 bg-rose-100'    },
]

function UserSelect({
  field,
  users,
  currentId,
  currentName,
  onChange,
}: {
  field: RoleField
  users: AppUser[]
  currentId: string | null
  currentName: string | null
  onChange: (id: string | null, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [textMode, setTextMode] = useState(!currentId && !!currentName)

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  const currentUser = users.find(u => u.id === currentId)
  const displayValue = currentUser?.name || currentName || ''

  const Icon = field.icon

  return (
    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        <span className={`p-1 rounded ${field.color}`}><Icon className="w-3.5 h-3.5" /></span>
        {field.label}
      </label>

      {!textMode ? (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={currentUser ? currentUser.name : query}
              placeholder="Search by name or email…"
              onFocus={() => { setShowDropdown(true); if (currentUser) setQuery('') }}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true); onChange(null, e.target.value) }}
              className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {(currentId || query) && (
              <button
                onClick={() => { onChange(null, ''); setQuery(''); setShowDropdown(false) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showDropdown && query && (
            <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
              {filtered.length > 0 ? (
                filtered.map(u => (
                  <button
                    key={u.id}
                    onMouseDown={() => {
                      onChange(u.id, u.name)
                      setQuery('')
                      setShowDropdown(false)
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{u.name[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email} · {u.role}</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No users found. <button onClick={() => setTextMode(true)} className="text-indigo-600 underline">Enter name manually</button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setTextMode(true)}
            className="mt-1 text-xs text-indigo-600 hover:underline"
          >
            Enter name manually (for guests / TBD)
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={currentName || ''}
            placeholder="Type name (e.g. TBD, Young Adults…)"
            onChange={e => onChange(null, e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => setTextMode(false)}
            className="mt-1 text-xs text-indigo-600 hover:underline"
          >
            ← Search from users list
          </button>
        </div>
      )}
    </div>
  )
}

export default function AssignRoleModal({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceSchedule
  onClose: () => void
  onSaved: () => void
}) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Local form state
  const [form, setForm] = useState({
    speakerId:            service.speakerId,
    speakerName:          service.speakerName,
    serviceCoordinatorId: service.serviceCoordinatorId,
    serviceCoordinatorName: service.serviceCoordinatorName,
    propheticPrayerId:    service.propheticPrayerId,
    propheticPrayerName:  service.propheticPrayerName,
    worshipLeaderId:      service.worshipLeaderId,
    worshipLeaderName:    service.worshipLeaderName,
    notes:                service.notes || '',
  })

  useEffect(() => {
    fetch('/api/users?limit=200')
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : data.users || []))
      .catch(() => {})
  }, [])

  const date = new Date(service.date)
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  })

  const handleRoleChange = (
    idKey: keyof typeof form,
    nameKey: keyof typeof form,
    id: string | null,
    name: string
  ) => {
    setForm(prev => ({ ...prev, [idKey]: id, [nameKey]: name || null }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/schedule/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl sm:rounded-t-2xl flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900">Assign Roles</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 italic">{service.topic}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4">
          {ROLE_FIELDS.map(field => (
            <UserSelect
              key={field.key}
              field={field}
              users={users}
              currentId={form[field.idKey] as string | null}
              currentName={form[field.nameKey] as string | null}
              onChange={(id, name) => handleRoleChange(field.idKey, field.nameKey, id, name)}
            />
          ))}

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any special notes for this service…"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  )
}
