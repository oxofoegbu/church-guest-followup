'use client';

import { useState } from 'react';

export default function GuestIntakeForm() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    preferredContactMethod: 'CALL', firstVisitDate: new Date().toISOString().split('T')[0],
    serviceAttended: '', howHeardAboutUs: '', prayerRequest: '', honeypot: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.honeypot) return; // Bot trap
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/guests/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #102a43 0%, #243b53 50%, #334e68 100%)' }}>
        <div className="card max-w-lg w-full text-center fade-in">
          <div className="text-5xl mb-4">🙏</div>
          <h1 className="text-2xl font-display font-bold text-church-900 mb-3">
            Thank You for Visiting!
          </h1>
          <p className="text-church-600 mb-6">
            We're so glad you joined us today. A member of our team will be in touch
            with you soon. God bless you!
          </p>
          <button onClick={() => { setSubmitted(false); setForm({
            firstName: '', lastName: '', phone: '', email: '',
            preferredContactMethod: 'CALL', firstVisitDate: new Date().toISOString().split('T')[0],
            serviceAttended: '', howHeardAboutUs: '', prayerRequest: '', honeypot: '',
          }); }} className="btn-secondary">
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4"
      style={{ background: 'linear-gradient(135deg, #102a43 0%, #243b53 50%, #334e68 100%)' }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/20 mb-4">
            <img src="/icons/icon-152.png" alt="Grace Life Center" style={{width:72,height:72,borderRadius:"50%",objectFit:"cover"}} />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Welcome, Guest!
          </h1>
          <p className="text-church-300 text-sm">
            We're so glad you visited! Please fill out this short form so we can connect with you.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="card space-y-5 fade-in" style={{ animationDelay: '0.1s' }}>
          {/* Honeypot - hidden */}
          <input type="text" name="honeypot" value={form.honeypot} onChange={handleChange}
            className="absolute opacity-0 h-0 w-0" tabIndex={-1} autoComplete="off" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange}
                required className="input-field" placeholder="First name" />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange}
                required className="input-field" placeholder="Last name" />
            </div>
          </div>

          <div>
            <label className="label">Phone Number *</label>
            <input name="phone" type="tel" value={form.phone} onChange={handleChange}
              required className="input-field" placeholder="+234..." />
          </div>

          <div>
            <label className="label">Email Address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              className="input-field" placeholder="you@example.com" />
          </div>

          <div>
            <label className="label">Preferred Contact Method</label>
            <select name="preferredContactMethod" value={form.preferredContactMethod}
              onChange={handleChange} className="select-field">
              <option value="CALL">Phone Call</option>
              <option value="TEXT">SMS/Text</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date of Visit *</label>
              <input name="firstVisitDate" type="date" value={form.firstVisitDate}
                onChange={handleChange} required className="input-field" />
            </div>
            <div>
              <label className="label">Service Attended</label>
              <select name="serviceAttended" value={form.serviceAttended}
                onChange={handleChange} className="select-field">
                <option value="">Select...</option>
                <option value="Sunday 10am">Sunday 10am</option>
                <option value="Wednesday Bible Study">Wednesday Bible Study</option>
                <option value="Friday Prayer Meeting">Friday Prayer Meeting</option>
                <option value="Special Event">Special Event</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">How did you hear about us?</label>
            <select name="howHeardAboutUs" value={form.howHeardAboutUs}
              onChange={handleChange} className="select-field">
              <option value="">Select...</option>
              <option value="Friend/Family">Friend/Family</option>
              <option value="Social Media">Social Media</option>
              <option value="Website">Website</option>
              <option value="Drove Past">Drove Past</option>
              <option value="Flyer/Banner">Flyer/Banner</option>
              <option value="Online Search">Online Search</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="label">Prayer Request (optional)</label>
            <textarea name="prayerRequest" value={form.prayerRequest} onChange={handleChange}
              rows={3} className="textarea-field"
              placeholder="Is there anything we can pray about for you?" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-accent w-full text-lg py-3">
            {submitting ? 'Submitting...' : 'Submit Guest Card'}
          </button>

          <p className="text-center text-xs text-church-400">
            Your information is kept confidential and used only for church follow-up purposes.
          </p>
        </form>
      </div>
    </div>
  );
}
