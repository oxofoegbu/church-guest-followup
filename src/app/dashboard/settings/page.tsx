'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notify_emails: '',
    notify_whatsapp: '',
    notify_on_new_guest: 'true',
    notify_on_assignment: 'true',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
          <h1 className="page-header">Notification Settings</h1>
          <p className="text-church-500 mt-1">Configure who gets notified when new guests submit a form or are assigned.</p>
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
        {/* New Guest Notifications */}
        <div className="card">
          <h2 className="section-header mb-1">New Guest Form Submitted</h2>
          <p className="text-sm text-church-500 mb-4">These people will be notified every time someone fills out the guest form on the website.</p>
          
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
              <input
                type="text"
                value={settings.notify_emails}
                onChange={e => setSettings({ ...settings, notify_emails: e.target.value })}
                placeholder="email1@church.com, email2@church.com"
                className="input-field"
              />
              <p className="text-xs text-church-400 mt-1">Separate multiple emails with commas</p>
            </div>

            <div>
              <label className="label">📱 WhatsApp Numbers</label>
              <input
                type="text"
                value={settings.notify_whatsapp}
                onChange={e => setSettings({ ...settings, notify_whatsapp: e.target.value })}
                placeholder="+12025551234, +12025555678"
                className="input-field"
              />
              <p className="text-xs text-church-400 mt-1">Separate multiple numbers with commas. Include country code (e.g. +1 for US, +234 for Nigeria)</p>
            </div>
          </div>
        </div>

        {/* Assignment Notifications */}
        <div className="card">
          <h2 className="section-header mb-1">Guest Assignment</h2>
          <p className="text-sm text-church-500 mb-4">When a guest is assigned to a volunteer, the volunteer will be notified via email and WhatsApp.</p>
          
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox"
                checked={settings.notify_on_assignment === 'true'}
                onChange={e => setSettings({ ...settings, notify_on_assignment: e.target.checked ? 'true' : 'false' })}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-church-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
            <span className="text-sm font-medium text-church-700">Enable notifications when guests are assigned to volunteers</span>
          </div>
        </div>

        {/* WhatsApp Sandbox Note */}
        <div className="card bg-amber-50 border-amber-200">
          <h2 className="section-header text-amber-800 mb-2">⚠️ WhatsApp Sandbox Note</h2>
          <p className="text-sm text-amber-700">
            If you're using the Twilio sandbox for WhatsApp, every phone number that should receive messages must first 
            send the join code to the Twilio sandbox number. Ask each recipient to send the join message from their WhatsApp 
            before they can receive notifications. For production use, register a WhatsApp Business Account through Twilio.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="btn-primary px-8 py-3">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
