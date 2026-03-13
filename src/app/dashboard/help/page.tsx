'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'overview' | 'guest-form' | 'dashboard' | 'all-guests' | 'guest-detail' | 'my-guests' | 'activities' | 'returns' | 'targets' | 'reports' | 'users' | 'settings' | 'roles' | 'notifications' | 'faq';

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'overview', label: 'Getting Started', icon: '🏠' },
  { key: 'guest-form', label: 'Guest Intake Form', icon: '📋' },
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'all-guests', label: 'All Guests', icon: '👥' },
  { key: 'guest-detail', label: 'Guest Detail Page', icon: '👤' },
  { key: 'my-guests', label: 'My Guests', icon: '🙋' },
  { key: 'activities', label: 'Logging Activities', icon: '📝' },
  { key: 'returns', label: 'Service Returns', icon: '🔄' },
  { key: 'targets', label: 'Target Goals', icon: '🎯' },
  { key: 'reports', label: 'Reports', icon: '📈' },
  { key: 'users', label: 'User Management', icon: '⚙️' },
  { key: 'settings', label: 'Settings', icon: '🔔' },
  { key: 'roles', label: 'Roles & Permissions', icon: '🔐' },
  { key: 'notifications', label: 'Notifications', icon: '📱' },
  { key: 'faq', label: 'FAQ', icon: '❓' },
];

export default function HelpPage() {
  const [active, setActive] = useState<Section>('overview');

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Help & Tutorial</h1>
          <p className="text-church-500 mt-1">Everything you need to know about the Guest Follow-Up system.</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left nav */}
        <div className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-8 space-y-1">
            {SECTIONS.map(s => (
              <button key={s.key} onClick={() => setActive(s.key)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                  ${active === s.key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-church-600 hover:bg-church-50'}`}>
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile section picker */}
        <div className="lg:hidden w-full mb-4">
          <select value={active} onChange={e => setActive(e.target.value as Section)}
            className="select-field w-full">
            {SECTIONS.map(s => (
              <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="card prose-church">
            {active === 'overview' && <OverviewSection />}
            {active === 'guest-form' && <GuestFormSection />}
            {active === 'dashboard' && <DashboardSection />}
            {active === 'all-guests' && <AllGuestsSection />}
            {active === 'guest-detail' && <GuestDetailSection />}
            {active === 'my-guests' && <MyGuestsSection />}
            {active === 'activities' && <ActivitiesSection />}
            {active === 'returns' && <ReturnsSection />}
            {active === 'targets' && <TargetsSection />}
            {active === 'reports' && <ReportsSection />}
            {active === 'users' && <UsersSection />}
            {active === 'settings' && <SettingsSection />}
            {active === 'roles' && <RolesSection />}
            {active === 'notifications' && <NotificationsSection />}
            {active === 'faq' && <FAQSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-display font-bold text-church-900 mb-4">{title}</h2>
      <div className="space-y-4 text-sm text-church-700 leading-relaxed">{children}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
      <span className="font-medium">💡 Tip:</span> {children}
    </div>
  );
}

function OverviewSection() {
  return (
    <HelpSection title="Getting Started">
      <p>
        Welcome to the Church Guest Follow-Up System! This app helps your church track and follow up with first-time visitors,
        ensuring no guest falls through the cracks.
      </p>
      <p className="font-medium text-church-900">Here's the basic workflow:</p>
      <div className="space-y-3 pl-1">
        <div className="flex gap-3"><span className="text-brand-500 font-bold">1.</span><span>A guest visits your church and fills out the <strong>Guest Form</strong> (available as a link or QR code).</span></div>
        <div className="flex gap-3"><span className="text-brand-500 font-bold">2.</span><span>Admin/Leader is notified via email and WhatsApp about the new guest.</span></div>
        <div className="flex gap-3"><span className="text-brand-500 font-bold">3.</span><span>Admin assigns the guest to a team member (volunteer, leader, or admin) for follow-up.</span></div>
        <div className="flex gap-3"><span className="text-brand-500 font-bold">4.</span><span>The assigned person contacts the guest and logs their activities (calls, texts, visits, etc.).</span></div>
        <div className="flex gap-3"><span className="text-brand-500 font-bold">5.</span><span>Track the guest's journey: service returns (goal: 7 visits), Become signup, baptism, small group, volunteering.</span></div>
        <div className="flex gap-3"><span className="text-brand-500 font-bold">6.</span><span>Leadership reviews progress through Reports and the Dashboard.</span></div>
      </div>
      <Tip>After your first login, you'll be prompted to change your temporary password. Make sure to set a strong password you'll remember.</Tip>
    </HelpSection>
  );
}

function GuestFormSection() {
  return (
    <HelpSection title="Guest Intake Form">
      <p>
        The guest form is a public page where first-time visitors enter their information. It's accessible without logging in.
      </p>
      <p className="font-medium text-church-900">What guests fill out:</p>
      <div className="space-y-1 pl-4">
        <p>• <strong>Name, Phone, Email</strong> — basic contact info</p>
        <p>• <strong>Preferred Contact Method</strong> — how they want to be reached (Call, Text, WhatsApp, or Email)</p>
        <p>• <strong>Date of Visit & Service Attended</strong> — which service they came to</p>
        <p>• <strong>How They Heard About Us</strong> — tracking your outreach effectiveness</p>
        <p>• <strong>Prayer Request</strong> — optional, shows on the guest's profile for the follow-up person</p>
      </div>
      <Tip>Share the guest form link at your welcome desk, project it on screens, or create a QR code that links to it. The URL is your app's homepage (e.g. church-guest-followup.vercel.app).</Tip>
      <p>When a guest submits the form, configured recipients receive instant email and WhatsApp notifications (set up in Settings).</p>
    </HelpSection>
  );
}

function DashboardSection() {
  return (
    <HelpSection title="Dashboard">
      <p>The Dashboard is your at-a-glance view of the entire follow-up operation.</p>
      <p className="font-medium text-church-900">For Admins & Leaders, it shows:</p>
      <div className="space-y-1 pl-4">
        <p>• <strong>New This Week / Month</strong> — how many guests have visited recently</p>
        <p>• <strong>Become Signups</strong> — guests who have signed up for your Become program</p>
        <p>• <strong>Overdue Follow-ups</strong> — guests whose next follow-up date has passed (action needed!)</p>
        <p>• <strong>Assigned &lt;24h</strong> — percentage of guests assigned to someone within 24 hours of visiting</p>
        <p>• <strong>Contacted &lt;48h</strong> — percentage contacted within 48 hours of assignment</p>
        <p>• <strong>Service Return Distribution</strong> — bar chart showing how many guests have returned 0-7 times</p>
        <p>• <strong>Guest Pipeline</strong> — visual count of guests in each status stage</p>
        <p>• <strong>Operational Alerts</strong> — unassigned guests, stalled cases, guests near the 7-visit target</p>
      </div>
      <p className="font-medium text-church-900 mt-3">For Volunteers, it shows:</p>
      <div className="space-y-1 pl-4">
        <p>• Count of assigned guests, active cases, overdue follow-ups, and Become signups</p>
        <p>• Quick link to the My Guests page</p>
      </div>
    </HelpSection>
  );
}

function AllGuestsSection() {
  return (
    <HelpSection title="All Guests">
      <p>The All Guests page shows every guest in a searchable, filterable table.</p>
      <p className="font-medium text-church-900">Filters available:</p>
      <div className="space-y-1 pl-4">
        <p>• <strong>Search</strong> — search by name, phone, or email</p>
        <p>• <strong>Status</strong> — filter by any status (New Guest, Assigned, Contacted, etc.) or "Unassigned" to find guests without an assignee</p>
        <p>• <strong>Assignee</strong> — filter to see only one person's assigned guests</p>
        <p>• <strong>Date Range</strong> — filter by first visit date</p>
      </div>
      <p className="font-medium text-church-900 mt-3">Bulk Assignment (Admin & Leader):</p>
      <p>Check the boxes next to multiple guests, select an assignee from the dropdown, and click "Assign Selected" to assign them all at once.</p>
      <Tip>Use the "Unassigned" filter regularly to catch any new guests that haven't been assigned yet.</Tip>
      <p><strong>All Guests Overview</strong> shows the same data in a card format, which some people find easier to scan. It also includes filter tabs for Active, Completed, Closed, and Archived guests.</p>
    </HelpSection>
  );
}

function GuestDetailSection() {
  return (
    <HelpSection title="Guest Detail Page">
      <p>Click on any guest name to see their full profile. This is the main page for managing a single guest's follow-up journey.</p>
      <p className="font-medium text-church-900">What you'll find here:</p>
      <div className="space-y-1 pl-4">
        <p>• <strong>Guest Information</strong> — all their contact details and prayer request</p>
        <p>• <strong>Target Goals</strong> — checkboxes for Become Signup, Water Baptism, Volunteer in Church, Join Small Group, plus any custom targets</p>
        <p>• <strong>Activity Timeline</strong> — history of all follow-up activities, with who did them and when</p>
        <p>• <strong>Status</strong> — dropdown to update the guest's current stage</p>
        <p>• <strong>Assignment</strong> — who this guest is assigned to (Admin/Leader can change this)</p>
        <p>• <strong>Service Returns</strong> — visual tracker showing progress toward 7 return visits</p>
        <p>• <strong>Notification Log</strong> — history of email/WhatsApp notifications sent about this guest</p>
      </div>
      <p className="font-medium text-church-900 mt-3">Actions available:</p>
      <div className="space-y-1 pl-4">
        <p>• <strong>+ Log Activity</strong> — record a phone call, text, email, visit, etc.</p>
        <p>• <strong>+ Record Return</strong> — log when the guest comes back to a service</p>
        <p>• <strong>Archive</strong> (Admin only) — soft-delete a guest; they can be restored later</p>
        <p>• <strong>Delete</strong> (Admin only) — permanently remove a guest and all their data</p>
        <p>• <strong>Restore</strong> — bring back an archived guest</p>
      </div>
    </HelpSection>
  );
}

function MyGuestsSection() {
  return (
    <HelpSection title="My Guests">
      <p>
        My Guests shows only the guests assigned to <strong>you</strong>. This is your personal follow-up list.
        It's available to all roles — Volunteers, Leaders, and Admins.
      </p>
      <p className="font-medium text-church-900">Filter tabs:</p>
      <div className="space-y-1 pl-4">
        <p>• <strong>Active</strong> — guests who still need follow-up (default view)</p>
        <p>• <strong>All</strong> — everything assigned to you except archived</p>
        <p>• <strong>Completed</strong> — guests who have reached "Become Signed Up" status</p>
        <p>• <strong>Closed</strong> — guests marked as "Not Interested" or "Inactive"</p>
      </div>
      <p>Each guest card shows their status, service return progress bar, and next follow-up date (highlighted red if overdue).</p>
      <Tip>Check this page daily to stay on top of your follow-ups. Pay special attention to any red "Overdue" warnings.</Tip>
    </HelpSection>
  );
}

function ActivitiesSection() {
  return (
    <HelpSection title="Logging Activities">
      <p>Every time you interact with a guest, log it as an activity. This creates a history that leadership can review.</p>
      <p className="font-medium text-church-900">Activity types:</p>
      <div className="space-y-1 pl-4">
        <p>📞 <strong>Phone Call</strong> — called the guest</p>
        <p>💬 <strong>WhatsApp Message</strong> — sent a WhatsApp message</p>
        <p>📱 <strong>SMS/Text</strong> — sent a text message</p>
        <p>✉️ <strong>Email</strong> — sent an email</p>
        <p>🏠 <strong>Home Visit</strong> — visited the guest at their home</p>
        <p>👥 <strong>Invited to Small Group</strong> — invited them to join a small group</p>
        <p>🍽️ <strong>Lunch/Meeting with Pastor</strong> — had a meal or meeting with pastoral staff</p>
        <p>⛪ <strong>Attended Next Service</strong> — guest came back to church</p>
        <p>🙏 <strong>Pastoral Meeting</strong> — formal pastoral meeting</p>
        <p>📝 <strong>Other</strong> — any other interaction</p>
      </div>
      <p className="font-medium text-church-900 mt-3">Each activity includes:</p>
      <div className="space-y-1 pl-4">
        <p>• <strong>Outcome</strong> — brief result (e.g. "Left voicemail", "Had great conversation")</p>
        <p>• <strong>Notes</strong> — detailed notes about the interaction</p>
        <p>• <strong>Next Follow-Up Date</strong> — when you plan to follow up next (this drives the overdue alerts)</p>
      </div>
      <Tip>Always set a "Next Follow-Up Date" so the system can alert you when it's time to reach out again.</Tip>
    </HelpSection>
  );
}

function ReturnsSection() {
  return (
    <HelpSection title="Service Returns (0-7 Target)">
      <p>
        Track how many times a guest returns to church services. The target is <strong>7 return visits</strong>,
        which research shows is the threshold where guests are likely to become regular members.
      </p>
      <p className="font-medium text-church-900">How to record a return:</p>
      <div className="space-y-1 pl-4">
        <p>1. Go to the guest's detail page</p>
        <p>2. Click "+ Record Return" on the right side</p>
        <p>3. Select the service date and service name</p>
        <p>4. Click "Record Return"</p>
      </div>
      <p>The progress bar fills up as returns are recorded. When all 7 are logged, a "Target Reached!" message appears.</p>
      <Tip>The Dashboard's Service Return Distribution chart shows how your overall guest population is progressing toward the 7-visit target.</Tip>
    </HelpSection>
  );
}

function TargetsSection() {
  return (
    <HelpSection title="Target Goals">
      <p>Target goals track important milestones in a guest's spiritual journey.</p>
      <p className="font-medium text-church-900">Built-in targets:</p>
      <div className="space-y-1 pl-4">
        <p>✅ <strong>Become Signup</strong> — guest has enrolled in the Become/membership program</p>
        <p>💧 <strong>Water Baptism</strong> — guest has been baptized or is scheduled</p>
        <p>🤝 <strong>Volunteer in Church</strong> — guest has started serving in a ministry</p>
        <p>👥 <strong>Join A Small Group</strong> — guest has joined a small group or home fellowship</p>
      </div>
      <p>Each target is a checkbox on the guest's detail page. When checked, the date is automatically recorded.</p>
      <p className="font-medium text-church-900 mt-3">Custom targets:</p>
      <p>Admins can add custom targets in Settings → Target Goals (e.g. "Completed New Members Class", "Attended Retreat"). These appear as additional checkboxes on every guest's profile.</p>
    </HelpSection>
  );
}

function ReportsSection() {
  return (
    <HelpSection title="Reports">
      <p>Reports are available to Admins and Leaders. They provide data-driven insights into your follow-up operation.</p>
      <p className="font-medium text-church-900">Report tabs:</p>
      <div className="space-y-2 pl-4">
        <p><strong>Funnel & Outcomes</strong> — monthly breakdown of new guests → assigned → contacted → become signups. Shows key metrics like % assigned within 24 hours and % contacted within 48 hours.</p>
        <p><strong>Assignee Performance</strong> — table showing each team member's guest count, activities, become signups, average returns, and 7/7 hits. Click any name to expand and see their assigned guests with full activity timelines.</p>
        <p><strong>Operational</strong> — actionable lists: unassigned guests older than 24h, overdue follow-ups, stalled cases (no activity in 7+ days), and guests near the 7-visit target.</p>
        <p><strong>Export Data</strong> — download CSV files for guests, activities, service returns, and volunteer summaries for further analysis in Excel.</p>
      </div>
    </HelpSection>
  );
}

function UsersSection() {
  return (
    <HelpSection title="User Management (Admin Only)">
      <p>Admins can create, edit, and deactivate user accounts from the Users page.</p>
      <p className="font-medium text-church-900">Creating a new user:</p>
      <div className="space-y-1 pl-4">
        <p>1. Click "Edit" or create a new user</p>
        <p>2. Fill in name, email, phone (with country code for WhatsApp), and role</p>
        <p>3. Set a temporary password</p>
        <p>4. The user will be prompted to change their password on first login</p>
      </div>
      <p className="font-medium text-church-900 mt-3">Phone number format:</p>
      <p>Enter phone numbers in international format with the country code (e.g. +12025551234 for US, +2348012345678 for Nigeria). This is required for WhatsApp notifications to work.</p>
      <Tip>If someone leaves the team, deactivate their account rather than deleting it. Their activity history is preserved.</Tip>
    </HelpSection>
  );
}

function SettingsSection() {
  return (
    <HelpSection title="Settings (Admin Only)">
      <p>Settings lets you configure notifications and target goals.</p>
      <p className="font-medium text-church-900">Notification Settings:</p>
      <div className="space-y-1 pl-4">
        <p>• <strong>Email Recipients</strong> — comma-separated list of emails to notify when a new guest form is submitted</p>
        <p>• <strong>WhatsApp Numbers</strong> — comma-separated phone numbers to WhatsApp when a new guest form is submitted</p>
        <p>• <strong>Toggle: New Guest Notifications</strong> — turn on/off notifications for new form submissions</p>
        <p>• <strong>Toggle: Assignment Notifications</strong> — turn on/off notifications when a guest is assigned to someone</p>
      </div>
      <p className="font-medium text-church-900 mt-3">Target Goals:</p>
      <p>Add custom target goals that appear on every guest's profile. Built-in targets (Become, Baptism, Volunteer, Small Group) cannot be removed. Custom targets can be added and removed freely.</p>
    </HelpSection>
  );
}

function RolesSection() {
  return (
    <HelpSection title="Roles & Permissions">
      <p>There are three roles in the system, each with different access levels.</p>

      <div className="space-y-4 mt-3">
        <div className="p-4 bg-red-50 rounded-lg border border-red-100">
          <p className="font-bold text-red-800 mb-2">🔴 Admin</p>
          <div className="space-y-1 text-red-700">
            <p>• Full access to everything</p>
            <p>• Create/edit/deactivate users</p>
            <p>• Assign guests to anyone</p>
            <p>• Archive and permanently delete guests</p>
            <p>• Configure settings and notifications</p>
            <p>• View all reports and export data</p>
            <p>• Change any guest's status to any value</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="font-bold text-blue-800 mb-2">🔵 Leader</p>
          <div className="space-y-1 text-blue-700">
            <p>• View all guests and reports</p>
            <p>• Assign guests to team members</p>
            <p>• Log pastoral meeting activities</p>
            <p>• Cannot create/edit users</p>
            <p>• Cannot delete guests or change settings</p>
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <p className="font-bold text-green-800 mb-2">🟢 Volunteer</p>
          <div className="space-y-1 text-green-700">
            <p>• See only guests assigned to them</p>
            <p>• Log activities and record service returns</p>
            <p>• Update guest status (limited options)</p>
            <p>• Mark target goals as completed</p>
            <p>• Cannot see other volunteers' guests</p>
            <p>• Cannot access reports, users, or settings</p>
          </div>
        </div>
      </div>
    </HelpSection>
  );
}

function NotificationsSection() {
  return (
    <HelpSection title="Notifications">
      <p>The system sends automatic notifications via email and WhatsApp.</p>
      <p className="font-medium text-church-900">When notifications are sent:</p>
      <div className="space-y-1 pl-4">
        <p>📧📱 <strong>New Guest Form Submitted</strong> — emails and WhatsApp messages go to the recipients configured in Settings</p>
        <p>📧📱 <strong>Guest Assigned</strong> — the assigned person receives an email and WhatsApp with the guest's details and a link to their profile</p>
      </div>
      <p className="font-medium text-church-900 mt-3">Notification Log:</p>
      <p>Every notification attempt is logged on the guest's detail page (visible to Admins and Leaders). Statuses are SENT, FAILED, or QUEUED.</p>
      <Tip>Make sure all team members have their phone numbers entered in international format (e.g. +12025551234) in their user profile for WhatsApp notifications to work.</Tip>
    </HelpSection>
  );
}

function FAQSection() {
  return (
    <HelpSection title="Frequently Asked Questions">
      <div className="space-y-4">
        <FAQ q="How do I share the guest form with visitors?" a="Your guest form is at your app's main URL (e.g. church-guest-followup.vercel.app). Share this link, create a QR code for it, or display it on screens at your welcome desk. No login is needed to fill it out." />
        <FAQ q="What happens when a guest submits the form?" a="The guest sees a thank-you message. Behind the scenes, the system creates a new guest record with 'New Guest' status and sends notifications to the configured email addresses and WhatsApp numbers." />
        <FAQ q="How quickly should I assign a new guest?" a="Best practice is within 24 hours. The Dashboard tracks this metric (Assigned <24h) and flags unassigned guests older than 24 hours in the Operational Alerts section." />
        <FAQ q="What does the 7-return target mean?" a="Research shows that if a first-time visitor returns 7 times, they're very likely to become a regular member. The service return tracker helps you monitor this critical metric for each guest." />
        <FAQ q="Can I use this on my phone?" a="Yes! The app is fully responsive and works on mobile browsers. Just open your Vercel URL in your phone's browser." />
        <FAQ q="What if I forget my password?" a="Ask your admin to reset your password in the Users page. They'll set a temporary password, and you'll be prompted to change it on your next login." />
        <FAQ q="How do I archive vs. delete a guest?" a="Archive is a soft-delete — the guest is hidden from active views but can be restored later. Delete is permanent and removes all data. Use Archive unless you're sure you want to permanently remove someone." />
        <FAQ q="Why am I not seeing some guests?" a="Volunteers only see guests assigned to them. If you need to see all guests, ask your admin to upgrade your role to Leader." />
        <FAQ q="Can I export data to Excel?" a="Yes! Go to Reports → Export Data tab. You can download CSV files for guests, activities, service returns, and volunteer summaries. CSV files open directly in Excel." />
        <FAQ q="How do I change notification recipients?" a="Admins can update this in Settings → Notification Settings. You can add/remove email addresses and WhatsApp numbers at any time." />
      </div>
    </HelpSection>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-church-200 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-church-50 transition-colors">
        <span className="font-medium text-church-900">{q}</span>
        <span className="text-church-400 text-lg ml-2">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-church-600 border-t border-church-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}
