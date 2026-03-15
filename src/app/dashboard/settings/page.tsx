'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_ROLES, PERMISSION_LEVEL_LABELS } from '@/lib/roles';
import type { RoleConfig, PermissionLevel } from '@/lib/roles';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notify_emails: '',
    notify_whatsapp: '',
    notify_on_new_guest: 'true',
    notify_on_assignment: 'true',
    custom_targets: '[]',
    custom_roles: '[]',
    target_config: '[]',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newTarget, setNewTarget] = useState('');
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRolePermission, setNewRolePermission] = useState<PermissionLevel>('VOLUNTEER_ACCESS');

  interface TargetConfig {
    key: string;
    label: string;
    builtin: boolean;
  }

  const DEFAULT_TARGETS: TargetConfig[] = [
    { key: 'becomeSignup', label: 'Become Signup', builtin: true },
    { key: 'waterBaptism', label: 'Water Baptism', builtin: true },
    { key: 'volunteerInChurch', label: 'Volunteer in Church', builtin: true },
    { key: 'joinSmallGroup', label: 'Join A Small Group', builtin: true },
  ];

  const targetConfig: TargetConfig[] = (() => {
    try {
      const parsed = JSON.parse(settings.target_config);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TARGETS;
    } catch { return DEFAULT_TARGETS; }
  })();

  const setTargetConfig = (config: TargetConfig[]) => {
    setSettings({ ...settings, target_config: JSON.stringify(config) });
  };

  const addTargetConfig = () => {
    const label = newTarget.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (targetConfig.some(t => t.key === key || t.label === label)) return;
    setTargetConfig([...targetConfig, { key, label, builtin: false }]);
    setNewTarget('');
  };

  const removeTargetConfig = (key: string) => {
    setTargetConfig(targetConfig.filter(t => t.key !== key));
  };

  const startEditTarget = (key: string, label: string) => {
    setEditingTarget(key);
    setEditingLabel(label);
  };

  const finishEditTarget = (key: string) => {
    const trimmed = editingLabel.trim();
    if (trimmed) {
      setTargetConfig(targetConfig.map(t => t.key === key ? { ...t, label: trimmed } : t));
    }
    setEditingTarget(null);
    setEditingLabel('');
  };

  const moveTarget = (idx: number, direction: number) => {
    const newConfig = [...targetConfig];
    const target = newConfig.splice(idx, 1)[0];
    newConfig.splice(idx + direction, 0, target);
    setTargetConfig(newConfig);
  };

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const customRoles: RoleConfig[] = (() => {
    try { return JSON.parse(settings.custom_roles); } catch { return []; }
  })();

  const addRole = () => {
    const name = newRoleName.trim().toUpperCase().replace(/\s+/g, '_');
    const label = newRoleLabel.trim();
    if (!name || !label) return;
    // Check for duplicates in both default and custom
    const allNames = [...DEFAULT_ROLES.map(r => r.name), ...customRoles.map(r => r.name)];
    if (allNames.includes(name)) return;
    const updated: RoleConfig[] = [...customRoles, { name, label, permissionLevel: newRolePermission }];
    setSettings({ ...settings, custom_roles: JSON.stringify(updated) });
    setNewRoleName('');
    setNewRoleLabel('');
    setNewRolePermission('VOLUNTEER_ACCESS');
  };

  const removeRole = (name: string) => {
    const updated = customRoles.filter(r => r.name !== name);
    setSettings({ ...settings, custom_roles: JSON.stringify(updated) });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Settings</h1>
          <p className="text-church-500 mt-1">Configure roles, notifications, target goals, and other app settings.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-sage-50 text-sage-700 border border-sage-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Roles Management */}
        <div className="card">
          <h2 className="section-header mb-1">🔐 Roles & Permissions</h2>
          <p className="text-sm text-church-500 mb-4">
            Manage user roles and their permission levels. Each role maps to a permission level that controls what features are accessible.
          </p>

          <div className="mb-4">
            <p className="text-xs font-medium text-church-600 mb-2">Built-in Roles (cannot be removed):</p>
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
              <p className="text-sm text-church-400 italic mb-3">No custom roles added yet.</p>
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
                      <button onClick={() => removeRole(role.name)}
                        className="text-red-400 hover:text-red-600 text-xs font-bold">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input type="text" value={newRoleLabel}
                onChange={e => {
                  setNewRoleLabel(e.target.value);
                  setNewRoleName(e.target.value.toUpperCase().replace(/\s+/g, '_'));
                }}
                placeholder="Display Name (e.g. Deacon)"
                className="input-field" />
              <input type="text" value={newRoleName}
                onChange={e => setNewRoleName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                placeholder="CODE (e.g. DEACON)"
                className="input-field font-mono text-xs" />
              <select value={newRolePermission}
                onChange={e => setNewRolePermission(e.target.value as PermissionLevel)}
                className="select-field">
                <option value="VOLUNTEER_ACCESS">Volunteer Access</option>
                <option value="LEADER_ACCESS">Leader Access</option>
                <option value="ADMIN_ACCESS">Admin Access</option>
              </select>
              <button onClick={addRole} className="btn-secondary btn-sm whitespace-nowrap">+ Add Role</button>
            </div>
            <p className="text-xs text-church-400 mt-2">
              Permission levels: <strong>Admin</strong> = full access; <strong>Leader</strong> = view all, assign, reports; <strong>Volunteer</strong> = own guests only
            </p>
          </div>
        </div>

        {/* Target Goals */}
        <div className="card">
          <h2 className="section-header mb-1">🎯 Target Goals</h2>
          <p className="text-sm text-church-500 mb-4">
            Manage the target milestones shown on each guest's profile. You can rename, reorder, or remove any target.
          </p>

          <div className="space-y-2 mb-4">
            {targetConfig.length === 0 ? (
              <p className="text-sm text-church-400 italic">No targets configured. Add some below.</p>
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
                  {idx > 0 && (
                    <button onClick={() => moveTarget(idx, -1)}
                      className="text-xs text-church-400 hover:text-church-700 px-1">↑</button>
                  )}
                  {idx < targetConfig.length - 1 && (
                    <button onClick={() => moveTarget(idx, 1)}
                      className="text-xs text-church-400 hover:text-church-700 px-1">↓</button>
                  )}
                  <button onClick={() => startEditTarget(target.key, target.label)}
                    className="text-xs text-brand-500 hover:text-brand-700 px-1">✏️</button>
                  <button onClick={() => removeTargetConfig(target.key)}
                    className="text-xs text-red-400 hover:text-red-600 px-1">🗑️</button>
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
            Removing a target hides it from guest profiles. Guest data is preserved and will reappear if you re-add it.
          </p>
        </div>

        {/* Notification Settings */}
        <div className="card">
          <h2 className="section-header mb-1">🆕 New Guest Form Submitted</h2>
          <p className="text-sm text-church-500 mb-4">These people will be notified every time someone fills out the guest form.</p>
          
          <div className="flex items-center gap-3 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox"
                checked={settings.notify_on_new_guest === 'true'}
                onChange={e => setSettings({ ...settings, notify_on_new_guest: e.target.checked ? 'true' : 'false' })}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-church-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
            <span className="text-sm font-medium text-church-700">Enable notifications for new guest submissions</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">📧 Email Recipients</label>
              <input type="text" value={settings.notify_emails}
                onChange={e => setSettings({ ...settings, notify_emails: e.target.value })}
                placeholder="email1@church.com, email2@church.com"
                className="input-field" />
              <p className="text-xs text-church-400 mt-1">Separate multiple emails with commas</p>
            </div>
            <div>
              <label className="label">📱 WhatsApp Numbers</label>
              <input type="text" value={settings.notify_whatsapp}
                onChange={e => setSettings({ ...settings, notify_whatsapp: e.target.value })}
                placeholder="+12025551234, +12025555678"
                className="input-field" />
              <p className="text-xs text-church-400 mt-1">Separate multiple numbers with commas. Include country code.</p>
            </div>
          </div>
        </div>

        {/* Assignment Notifications */}
        <div className="card">
          <h2 className="section-header mb-1">📋 Guest Assignment</h2>
          <p className="text-sm text-church-500 mb-4">When a guest is assigned, the assignee will be notified via email and WhatsApp.</p>
          
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox"
                checked={settings.notify_on_assignment === 'true'}
                onChange={e => setSettings({ ...settings, notify_on_assignment: e.target.checked ? 'true' : 'false' })}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-church-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
            <span className="text-sm font-medium text-church-700">Enable notifications when guests are assigned</span>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
