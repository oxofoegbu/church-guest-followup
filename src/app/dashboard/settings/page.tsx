'use client';
import OrderOfServiceTemplatesSection from '@/components/OrderOfServiceTemplatesSection';
import PageHelp from '@/components/PageHelp';

import { useState, useEffect } from 'react';
import { DEFAULT_ROLES, PERMISSION_LEVEL_LABELS } from '@/lib/roles';
import type { RoleConfig, PermissionLevel } from '@/lib/roles';

const SCHEDULE_COORDINATOR_ROLES = [
  { key: 'pastor',               label: 'Pastor',                   icon: '✝️'  },
  { key: 'coordination_leader',  label: 'Coordination Leader',      icon: '📋'  },
  { key: 'prayer_coordinator',   label: 'Prayer Coordinator',       icon: '🙏'  },
  { key: 'worship_coordinator',  label: 'Worship Team Coordinator', icon: '🎵'  },
] as const;

type CoordRoleKey = typeof SCHEDULE_COORDINATOR_ROLES[number]['key'];

interface TargetConfig { key: string; label: string; builtin: boolean }
interface CoordAssignment { userId: string; userName: string; role: CoordRoleKey }

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notify_emails: '',
    notify_whatsapp: '',
    notify_on_new_guest: 'true',
    notify_on_assignment: 'true',
    custom_targets: '[]',
    custom_roles: '[]',
    target_config: '[]',
    schedule_coordinators: '[]',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingDemo, setClearingDemo] = useState(false);
  const [demoMessage, setDemoMessage] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Target goals state
  const [newTarget, setNewTarget] = useState('');
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // Roles state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRolePermission, setNewRolePermission] = useState<PermissionLevel>('VOLUNTEER_ACCESS');

  // Coordinators state
  const [users, setUsers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);

  const DEFAULT_TARGETS: TargetConfig[] = [
    { key: 'becomeSignup',       label: 'Become Signup',         builtin: true },
    { key: 'waterBaptism',       label: 'Water Baptism',         builtin: true },
    { key: 'volunteerInChurch',  label: 'Volunteer in Church',   builtin: true },
    { key: 'joinSmallGroup',     label: 'Join A Small Group',    builtin: true },
  ];

  const targetConfig: TargetConfig[] = (() => {
    try {
      const parsed = JSON.parse(settings.target_config);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TARGETS;
    } catch { return DEFAULT_TARGETS; }
  })();

  const coordinators: CoordAssignment[] = (() => {
    try { return JSON.parse(settings.schedule_coordinators); } catch { return []; }
  })();

  const customRoles: RoleConfig[] = (() => {
    try { return JSON.parse(settings.custom_roles); } catch { return []; }
  })();

  const setTargetConfig = (config: TargetConfig[]) =>
    setSettings(s => ({ ...s, target_config: JSON.stringify(config) }));

  const setCoordinators = (list: CoordAssignment[]) =>
    setSettings(s => ({ ...s, schedule_coordinators: JSON.stringify(list) }));

  const addTargetConfig = () => {
    const label = newTarget.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (targetConfig.some(t => t.key === key || t.label === label)) return;
    setTargetConfig([...targetConfig, { key, label, builtin: false }]);
    setNewTarget('');
  };

  const removeTargetConfig = (key: string) =>
    setTargetConfig(targetConfig.filter(t => t.key !== key));

  const startEditTarget = (key: string, label: string) => { setEditingTarget(key); setEditingLabel(label); };

  const finishEditTarget = (key: string) => {
    const trimmed = editingLabel.trim();
    if (trimmed) setTargetConfig(targetConfig.map(t => t.key === key ? { ...t, label: trimmed } : t));
    setEditingTarget(null); setEditingLabel('');
  };

  const moveTarget = (idx: number, dir: number) => {
    const cfg = [...targetConfig];
    const item = cfg.splice(idx, 1)[0];
    cfg.splice(idx + dir, 0, item);
    setTargetConfig(cfg);
  };

  const addRole = () => {
    if (!newRoleName || !newRoleLabel) return;
    const role: RoleConfig = { name: newRoleName, label: newRoleLabel, permissionLevel: newRolePermission };
    const updated = [...customRoles, role];
    setSettings(s => ({ ...s, custom_roles: JSON.stringify(updated) }));
    setNewRoleName(''); setNewRoleLabel('');
  };

  const removeRole = (name: string) => {
    const updated = customRoles.filter(r => r.name !== name);
    setSettings(s => ({ ...s, custom_roles: JSON.stringify(updated) }));
  };

  const assignCoordinator = (role: CoordRoleKey, userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) {
      // Remove assignment
      setCoordinators(coordinators.filter(c => c.role !== role));
    } else {
      const filtered = coordinators.filter(c => c.role !== role);
      setCoordinators([...filtered, { userId: user.id, userName: user.name, role }]);
    }
  };

  const getCoordinatorForRole = (role: CoordRoleKey) =>
    coordinators.find(c => c.role === role);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/users').then(r => r.ok ? r.json() : { users: [] }),
    ]).then(([settingsData, usersData]) => {
      if (!settingsData.error) {
        setSettings(s => ({ ...s, ...settingsData }));
        if (settingsData._pendingRequests) setPendingRequests(settingsData._pendingRequests);
      }
      setUsers((usersData.users || []).filter((u: any) => u.active));
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notify_emails:          settings.notify_emails,
          notify_whatsapp:        settings.notify_whatsapp,
          notify_on_new_guest:    settings.notify_on_new_guest,
          notify_on_assignment:   settings.notify_on_assignment,
          custom_roles:           settings.custom_roles,
          target_config:          settings.target_config,
          schedule_coordinators:  settings.schedule_coordinators,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setMessage({ type: 'success', text: '✅ Settings saved successfully.' });
    } catch {
      setMessage({ type: 'error', text: '❌ Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-church-400">Loading settings…</div>;

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">⚙️ Settings</h1>
        <PageHelp docSection="settings" tips={[
          { icon: "⛪", title: "Set coordinators first", body: "Before your first Sunday, designate your Schedule Coordinators so they can assign service roles without needing Admin access." },
          { icon: "🎯", title: "Customise target goals", body: "Rename or add milestones to match your church's discipleship pathway. Changes appear on every guest profile immediately after saving." },
          { icon: "🔔", title: "Test notifications", body: "Add your own email and WhatsApp number to the notification recipients and submit a test guest form to confirm delivery." }
        ]} />
          {pendingRequests > 0 && (
            <p className="text-sm text-amber-600 mt-1 font-medium">
              ⚠️ {pendingRequests} pending account request{pendingRequests > 1 ? 's' : ''} — see Users page
            </p>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-sage-50 text-sage-700 border border-sage-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">

        {/* ── Schedule Coordinators ── */}
        <div className="card">
          <h2 className="section-header mb-1">⛪ Schedule Coordinators</h2>
          <p className="text-sm text-church-500 mb-4">
            Designate who can assign people to roles in the Sunday Schedule. These users will see the ✏️ edit button on the schedule page.
          </p>
          <div className="space-y-3">
            {SCHEDULE_COORDINATOR_ROLES.map(({ key, label, icon }) => {
              const assigned = getCoordinatorForRole(key);
              return (
                <div key={key} className="flex items-center gap-3 p-3 bg-church-50 rounded-lg">
                  <span className="text-xl w-8 flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-church-800">{label}</p>
                    {assigned && (
                      <p className="text-xs text-brand-600 mt-0.5">Currently: {assigned.userName}</p>
                    )}
                  </div>
                  <select
                    value={assigned?.userId || ''}
                    onChange={e => assignCoordinator(key, e.target.value)}
                    className="select-field text-sm py-1.5 w-48 flex-shrink-0"
                  >
                    <option value="">— Unassigned —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-church-400 mt-3">
            Admins and Senior Leaders always have schedule edit access regardless of this setting.
          </p>
        </div>

        <OrderOfServiceTemplatesSection />

        {/* ── Roles & Permissions ── */}
        <div className="card">
          <h2 className="section-header mb-1">🔐 Roles & Permissions</h2>
          <p className="text-sm text-church-500 mb-4">
            Manage user roles and their permission levels.
          </p>
          <div className="mb-4">
            <p className="text-xs font-medium text-church-600 mb-2">Built-in Roles:</p>
            <div className="space-y-2">
              {DEFAULT_ROLES.map(role => (
                <div key={role.name} className="flex items-center justify-between p-3 bg-church-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm text-church-800">{role.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-church-200 text-church-600 rounded">{role.name}</span>
                  </div>
                  <span className="text-xs text-church-500">{PERMISSION_LEVEL_LABELS[role.permissionLevel]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-church-100 pt-4">
            <p className="text-xs font-medium text-church-600 mb-2">Custom Roles:</p>
            {customRoles.length === 0 ? (
              <p className="text-sm text-church-400 italic mb-3">No custom roles yet.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {customRoles.map(role => (
                  <div key={role.name} className="flex items-center justify-between p-3 bg-brand-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm text-church-800">{role.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-church-200 text-church-600 rounded">{role.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-church-500">{PERMISSION_LEVEL_LABELS[role.permissionLevel]}</span>
                      <button onClick={() => removeRole(role.name)} className="text-red-400 hover:text-red-600 text-xs font-bold">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input type="text" value={newRoleLabel}
                onChange={e => { setNewRoleLabel(e.target.value); setNewRoleName(e.target.value.toUpperCase().replace(/\s+/g, '_')); }}
                placeholder="Display Name (e.g. Deacon)" className="input-field" />
              <input type="text" value={newRoleName}
                onChange={e => setNewRoleName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                placeholder="CODE (e.g. DEACON)" className="input-field font-mono text-xs" />
              <select value={newRolePermission} onChange={e => setNewRolePermission(e.target.value as PermissionLevel)} className="select-field">
                <option value="VOLUNTEER_ACCESS">Volunteer Access</option>
                <option value="LEADER_ACCESS">Leader Access</option>
                <option value="ADMIN_ACCESS">Admin Access</option>
              </select>
              <button onClick={addRole} className="btn-secondary btn-sm">+ Add Role</button>
            </div>
          </div>
        </div>

        {/* ── Target Goals ── */}
        <div className="card">
          <h2 className="section-header mb-1">🎯 Target Goals</h2>
          <p className="text-sm text-church-500 mb-4">
            Manage the milestone targets shown on each guest's profile. Changes take effect immediately after saving.
          </p>
          <div className="space-y-2 mb-4">
            {targetConfig.length === 0 ? (
              <p className="text-sm text-church-400 italic">No targets configured.</p>
            ) : targetConfig.map((target, idx) => (
              <div key={target.key} className="flex items-center gap-2 p-3 bg-church-50 rounded-lg group">
                <span className="text-lg">{target.builtin ? '📌' : '🏷️'}</span>
                {editingTarget === target.key ? (
                  <input type="text" value={editingLabel}
                    onChange={e => setEditingLabel(e.target.value)}
                    onBlur={() => finishEditTarget(target.key)}
                    onKeyDown={e => e.key === 'Enter' && finishEditTarget(target.key)}
                    autoFocus className="input-field flex-1 py-1" />
                ) : (
                  <span className="flex-1 text-sm font-medium text-church-800">{target.label}</span>
                )}
                {target.builtin && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-church-200 text-church-500 rounded">built-in</span>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx > 0 && <button onClick={() => moveTarget(idx, -1)} className="text-xs text-church-400 hover:text-church-700 px-1">↑</button>}
                  {idx < targetConfig.length - 1 && <button onClick={() => moveTarget(idx, 1)} className="text-xs text-church-400 hover:text-church-700 px-1">↓</button>}
                  <button onClick={() => startEditTarget(target.key, target.label)} className="text-xs text-brand-500 hover:text-brand-700 px-1">✏️</button>
                  <button onClick={() => removeTargetConfig(target.key)} className="text-xs text-red-400 hover:text-red-600 px-1">🗑️</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newTarget}
              onChange={e => setNewTarget(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTargetConfig()}
              placeholder="e.g. Completed New Members Class"
              className="input-field flex-1" />
            <button onClick={addTargetConfig} className="btn-secondary btn-sm whitespace-nowrap">+ Add Target</button>
          </div>
          <p className="text-xs text-church-400 mt-2">
            Built-in targets are stored as database columns. Custom targets use flexible JSON storage. All appear on every guest profile after saving.
          </p>
        </div>

        {/* ── New Guest Notifications ── */}
        <div className="card">
          <h2 className="section-header mb-1">🆕 New Guest Form Submitted</h2>
          <p className="text-sm text-church-500 mb-4">Who gets notified when someone fills out the guest form.</p>
          <div className="flex items-center gap-3 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.notify_on_new_guest === 'true'}
                onChange={e => setSettings(s => ({ ...s, notify_on_new_guest: e.target.checked ? 'true' : 'false' }))}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-church-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
            <span className="text-sm font-medium text-church-700">Enable new guest notifications</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">📧 Email Recipients</label>
              <input type="text" value={settings.notify_emails}
                onChange={e => setSettings(s => ({ ...s, notify_emails: e.target.value }))}
                placeholder="email1@church.com, email2@church.com" className="input-field" />
              <p className="text-xs text-church-400 mt-1">Separate multiple emails with commas</p>
            </div>
            <div>
              <label className="label">📱 WhatsApp Numbers</label>
              <input type="text" value={settings.notify_whatsapp}
                onChange={e => setSettings(s => ({ ...s, notify_whatsapp: e.target.value }))}
                placeholder="+12025551234, +12025555678" className="input-field" />
              <p className="text-xs text-church-400 mt-1">Include country code. Separate with commas.</p>
            </div>
          </div>
        </div>

        {/* ── Assignment Notifications ── */}
        <div className="card">
          <h2 className="section-header mb-1">📋 Guest Assignment</h2>
          <p className="text-sm text-church-500 mb-4">When a guest is assigned, the assignee gets notified.</p>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={settings.notify_on_assignment === 'true'}
                onChange={e => setSettings(s => ({ ...s, notify_on_assignment: e.target.checked ? 'true' : 'false' }))}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-church-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
            <span className="text-sm font-medium text-church-700">Enable assignment notifications</span>
          </div>
        </div>

        {/* ── Demo Data ── */}
        <div className="card border-2 border-dashed border-amber-300 bg-amber-50">
          <h2 className="section-header mb-1 text-amber-800">🧪 Demo Data</h2>
          <p className="text-sm text-amber-700 mb-3 leading-relaxed">
            The app was loaded with sample guest data so you could explore how it works.
            When you are ready to go live, click below to permanently delete all demo records.
            Any guests added through the real guest form are <strong>not</strong> affected.
            <strong className="text-red-600"> This cannot be undone.</strong>
          </p>
          {demoMessage && (
            <div className={`mb-3 p-3 rounded-lg text-sm font-medium border ${demoMessage.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {demoMessage}
            </div>
          )}
          <button
            onClick={async () => {
              if (!confirm('Permanently delete ALL demo guest records? This cannot be undone.')) return;
              setClearingDemo(true); setDemoMessage('');
              try {
                const res = await fetch('/api/settings?action=clearDemo', { method: 'DELETE' });
                const data = await res.json();
                setDemoMessage(data.ok ? ('✅ ' + data.message) : ('❌ ' + (data.error || 'Failed')));
              } catch { setDemoMessage('❌ Request failed — please try again.'); }
              finally { setClearingDemo(false); }
            }}
            disabled={clearingDemo}
            className="btn-primary"
            style={{ background: clearingDemo ? '#9ca3af' : '#d97706', borderColor: '#d97706' }}
          >
            {clearingDemo ? '⏳ Clearing demo data...' : '🗑️ Clear All Demo Data'}
          </button>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3">
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
