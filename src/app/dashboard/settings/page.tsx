'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notify_emails: '',
    notify_whatsapp: '',
    notify_on_new_guest: 'true',
    notify_on_assignment: 'true',
    custom_targets: '[]',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newTarget, setNewTarget] = useState('');

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

  const customTargets: string[] = (() => {
    try { return JSON.parse(settings.custom_targets); } catch { return []; }
  })();

  const addTarget = () => {
    const trimmed = newTarget.trim();
    if (!trimmed || customTargets.includes(trimmed)) return;
    const updated = [...customTargets, trimmed];
    setSettings({ ...settings, custom_targets: JSON.stringify(updated) });
    setNewTarget('');
  };

  const removeTarget = (target: string) => {
    const updated = customTargets.filter(t => t !== target);
    setSettings({ ...settings, custom_targets: JSON.stringify(updated) });
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
          <p className="text-church-500 mt-1">Configure notifications, target goals, and other app settings.</p>
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
        {/* Target Goals */}
        <div className="card">
          <h2 className="section-header mb-1">🎯 Target Goals</h2>
          <p className="text-sm text-church-500 mb-4">
            Built-in targets are always available. Add custom targets for your church's specific needs.
          </p>

          <div className="mb-4">
            <p className="text-xs font-medium text-church-600 mb-2">Built-in Targets (always available):</p>
            <div className="flex flex-wrap gap-2">
              <span className="badge bg-emerald-100 text-emerald-700">Become Signup</span>
              <span className="badge bg-blue-100 text-blue-700">Water Baptism</span>
              <span className="badge bg-purple-100 text-purple-700">Volunteer in Church</span>
              <span className="badge bg-amber-100 text-amber-700">Join A Small Group</span>
            </div>
          </div>

          <div className="border-t border-church-100 pt-4">
            <p className="text-xs font-medium text-church-600 mb-2">Custom Targets:</p>
            {customTargets.length === 0 ? (
              <p className="text-sm text-church-400 italic mb-3">No custom targets added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {customTargets.map(target => (
                  <span key={target} className="badge bg-church-100 text-church-700 flex items-center gap-1.5">
                    {target}
                    <button onClick={() => removeTarget(target)}
                      className="text-red-400 hover:text-red-600 ml-1 text-xs font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTarget()}
                placeholder="e.g. Completed New Members Class"
                className="input-field flex-1" />
              <button onClick={addTarget} className="btn-secondary btn-sm whitespace-nowrap">
                + Add Target
              </button>
            </div>
          </div>
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

        {/* WhatsApp Note */}
        <div className="card bg-amber-50 border-amber-200">
          <h2 className="section-header text-amber-800 mb-2">⚠️ WhatsApp Sandbox Note</h2>
          <p className="text-sm text-amber-700">
            If using the Twilio sandbox, every recipient must first send the join code to the sandbox number.
            For production, register a WhatsApp Business Account through Twilio.
          </p>
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
