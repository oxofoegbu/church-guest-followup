'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Section {
  id: string;
  icon: string;
  title: string;
  category: string;
  content: React.ReactNode;
}

function Callout({ type, children }: { type: 'tip' | 'warning' | 'info'; children: React.ReactNode }) {
  const styles = {
    tip:     { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: '💡' },
    warning: { bg: 'bg-amber-50 border-amber-200',    text: 'text-amber-800',   icon: '⚠️' },
    info:    { bg: 'bg-blue-50 border-blue-200',       text: 'text-blue-800',    icon: 'ℹ️' },
  }[type];
  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${styles.bg} my-3`}>
      <span className="flex-shrink-0 text-base">{styles.icon}</span>
      <p className={`text-sm ${styles.text} leading-relaxed`}>{children}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-2">
      <div className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
      <p className="text-sm text-church-700 leading-relaxed">{children}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    Admin:          'bg-purple-100 text-purple-700',
    'Senior Leader':'bg-purple-100 text-purple-700',
    Leader:         'bg-blue-100 text-blue-700',
    Volunteer:      'bg-green-100 text-green-700',
  };
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${colors[role] || 'bg-church-100 text-church-600'}`}>
      {role}
    </span>
  );
}

const SECTIONS: Section[] = [
  // ── GETTING STARTED ─────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    icon: '🚀',
    title: 'Getting Started',
    category: 'Overview',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">
          The Grace Life Center Guest Follow-Up App is a full church management platform. It covers everything from capturing a first-time visitor to tracking their journey toward membership, managing Sunday service roles, coordinating your team's calendar, and grouping members into clusters for future small-group ministry.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: '👥', title: 'Guests & Prospects', desc: 'Capture, assign and track every visitor through a 10-stage pipeline toward becoming an active member.' },
            { icon: '⛪', title: 'Sunday Schedule', desc: 'Plan the full year of services, assign speakers and roles, share publicly, and print as PDF.' },
            { icon: '📅', title: 'Calendar', desc: 'Personal action items, recurring events, and meetings with attendees — all in one place.' },
            { icon: '👥', title: 'Clusters', desc: 'Group members for future targeted communications, meetings, and small-group management.' },
            { icon: '📊', title: 'Reports', desc: 'Track guest growth, assignment rates, target goal completion, and volunteer performance.' },
            { icon: '⚙️', title: 'Settings', desc: 'Customise roles, target goals, notification recipients, and schedule coordinators.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-3 p-3 bg-church-50 rounded-lg">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-church-800">{title}</p>
                <p className="text-xs text-church-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Callout type="info">
          Your role determines what you can see and do. Admins have full access. Leaders can see all guests and assign them. Volunteers only see guests assigned to them. The schedule and clusters are visible to everyone.
        </Callout>
      </div>
    ),
  },

  // ── ROLES & PERMISSIONS ──────────────────────────────────────────────────────
  {
    id: 'roles',
    icon: '🔐',
    title: 'Roles & Permissions',
    category: 'Overview',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">The app has four built-in permission levels. Admins can also create custom roles (e.g. Deacon, Elder) and assign them any permission level.</p>
        <div className="space-y-2">
          {[
            { role: 'Admin', perms: ['Full access to everything', 'Create/deactivate users', 'Approve deletion requests', 'Archive guests', 'Manage settings, roles, targets', 'Convert guests to users', 'Create clusters'] },
            { role: 'Senior Leader', perms: ['Same as Admin — a second admin-level role'] },
            { role: 'Leader', perms: ['View all guests and prospects', 'Assign guests to volunteers', 'View reports', 'Edit Sunday schedule roles', 'Create calendar events'] },
            { role: 'Volunteer', perms: ['View only their assigned guests', 'Log activities and update status', 'Manage own calendar', 'View Sunday schedule (read-only)', 'View clusters (read-only)'] },
          ].map(({ role, perms }) => (
            <div key={role} className="p-3 border border-church-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2"><RoleBadge role={role} /><span className="text-sm font-semibold text-church-800">{role}</span></div>
              <ul className="space-y-1">{perms.map(p => <li key={p} className="text-xs text-church-600 flex gap-1.5"><span className="text-emerald-500 flex-shrink-0">✓</span>{p}</li>)}</ul>
            </div>
          ))}
        </div>
        <Callout type="tip">Custom roles are created in Settings → Roles & Permissions. You can also designate specific people as Schedule Coordinators there — they get edit access to the Sunday Schedule regardless of their base role.</Callout>
      </div>
    ),
  },

  // ── LOGIN & ACCOUNTS ─────────────────────────────────────────────────────────
  {
    id: 'accounts',
    icon: '👤',
    title: 'Login & Account Access',
    category: 'Overview',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">Staff accounts are created by the Admin. There are two self-service flows for people who need access.</p>
        <div className="space-y-3">
          <div className="p-3 bg-church-50 rounded-lg">
            <p className="text-sm font-semibold text-church-800 mb-2">🔑 Forgot your password?</p>
            <Step n={1}>Go to the login page and click <strong>Forgot your password?</strong></Step>
            <Step n={2}>Enter your full name and email <em>exactly as they appear in the system</em>.</Step>
            <Step n={3}>If matched, a reset link will be emailed to you (valid for 1 hour).</Step>
            <Step n={4}>Click the link, set a new password, and you're in.</Step>
          </div>
          <div className="p-3 bg-church-50 rounded-lg">
            <p className="text-sm font-semibold text-church-800 mb-2">👤 Don't have an account?</p>
            <Step n={1}>Click <strong>Don't have an account? Request access →</strong> on the login page.</Step>
            <Step n={2}>Fill in your name, email, phone, and a short message about your role.</Step>
            <Step n={3}>The admin is automatically notified by email and will set up your account.</Step>
            <Step n={4}>You'll receive a welcome email with a temporary password — change it on first login.</Step>
          </div>
        </div>
        <Callout type="info">Admins can also convert an existing <strong>Guest</strong> into a User directly from the guest's profile page — useful when a first-time visitor officially joins the team.</Callout>
      </div>
    ),
  },

  // ── GUEST INTAKE ─────────────────────────────────────────────────────────────
  {
    id: 'guest-intake',
    icon: '📋',
    title: 'Guest Intake Form',
    category: 'Guests',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">The public guest form lives at the root URL <code className="bg-church-100 px-1 rounded text-xs">/</code>. Anyone can fill it in — no login required. Use a tablet or phone at the welcome desk or share the link via QR code.</p>
        <p className="text-sm text-church-600 leading-relaxed">When someone submits the form, the system automatically:</p>
        <ul className="space-y-1.5 ml-4">
          {[
            'Creates a guest record with status NEW GUEST',
            'Sends an email + WhatsApp notification to all configured recipients (set in Settings)',
            'Logs the submission in the Audit Trail',
          ].map(item => (
            <li key={item} className="text-sm text-church-600 flex gap-2"><span className="text-brand-500">→</span>{item}</li>
          ))}
        </ul>
        <Callout type="tip">Set up your notification recipients in Settings → New Guest Form Submitted before your first Sunday so no guest slips through.</Callout>
      </div>
    ),
  },

  // ── GUEST PIPELINE ───────────────────────────────────────────────────────────
  {
    id: 'guest-pipeline',
    icon: '🔄',
    title: 'Guest Follow-Up Pipeline',
    category: 'Guests',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">Every guest moves through a 10-stage pipeline. The goal is to move each guest from <strong>New Guest</strong> to <strong>Attending Regularly</strong> through intentional follow-up.</p>
        <div className="space-y-1.5">
          {[
            ['NEW_GUEST',          '🆕', 'Just submitted the form — not yet assigned'],
            ['ASSIGNED',           '👤', 'Assigned to a volunteer for follow-up'],
            ['CONTACT_ATTEMPTED',  '📞', 'Volunteer has tried to reach them'],
            ['CONTACTED',          '✅', 'First contact made'],
            ['MEETING_SCHEDULED',  '📅', 'A meeting or visit is planned'],
            ['MET',                '🤝', 'Volunteer has met with them in person'],
            ['ATTENDING_REGULARLY','⛪', 'Coming to services consistently'],
            ['COMPLETED',          '🏆', 'Achieved the 7-visit milestone'],
            ['CLOSED',             '🔒', 'No longer active — no response or moved'],
            ['ARCHIVED',           '📦', 'Archived for record-keeping (Admin only)'],
          ].map(([status, icon, desc]) => (
            <div key={status} className="flex gap-3 items-start p-2 bg-church-50 rounded-lg">
              <span className="text-base">{icon}</span>
              <div>
                <span className="text-xs font-mono font-bold text-church-700">{status}</span>
                <span className="text-xs text-church-500 ml-2">— {desc}</span>
              </div>
            </div>
          ))}
        </div>
        <Callout type="info">The <strong>service return target</strong> is 7 visits by default. Track each visit with the Service Returns section on a guest's profile. When they hit 7, status moves to COMPLETED.</Callout>
      </div>
    ),
  },

  // ── PROSPECTS ────────────────────────────────────────────────────────────────
  {
    id: 'prospects',
    icon: '🎯',
    title: 'Prospects (Pre-Visit Outreach)',
    category: 'Guests',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">Prospects are people <em>you know</em> who haven't visited yet — neighbours, coworkers, family members. Any team member can add a prospect and track outreach before a first visit.</p>
        <p className="text-sm font-semibold text-church-700">Adding a prospect:</p>
        <Step n={1}>Go to Prospects and click <strong>+ Add Prospect</strong>.</Step>
        <Step n={2}>Fill in their name, contact details, your relationship to them, and their spiritual status.</Step>
        <Step n={3}>Log prayer, WhatsApp messages, and invitations in their Activity Timeline.</Step>
        <Step n={4}>When they visit for the first time, click <strong>Convert to Guest</strong> — all history is preserved.</Step>
        <Callout type="tip">The Prospects page is visible to all roles. Volunteers can manage their own prospects independently.</Callout>
      </div>
    ),
  },

  // ── TARGET GOALS ─────────────────────────────────────────────────────────────
  {
    id: 'target-goals',
    icon: '🎯',
    title: 'Target Goals',
    category: 'Guests',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">Target Goals are milestone checkboxes shown on every guest profile. The four built-in goals are:</p>
        <ul className="space-y-1.5 ml-4">
          {['Become Signup (discipleship class)', 'Water Baptism', 'Volunteer in Church', 'Join A Small Group'].map(g => (
            <li key={g} className="text-sm text-church-600 flex gap-2"><span className="text-brand-500">📌</span>{g}</li>
          ))}
        </ul>
        <p className="text-sm text-church-600">Admins can rename, reorder, remove, or add custom targets in <strong>Settings → Target Goals</strong>. Changes appear on all guest profiles immediately after saving.</p>
        <Callout type="warning">Built-in targets are stored as database columns. Custom targets use flexible JSON storage. Both work the same way on guest profiles — the distinction is only technical.</Callout>
      </div>
    ),
  },

  // ── DISCIPLESHIP TRACKS ─────────────────────────────────────────────────────
  {
    id: 'tracks',
    icon: '🌱',
    title: 'Discipleship Tracks',
    category: 'Formation',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">
          The formation pathway — a well, not a fence. People come at their own pace and
          move toward the centre: <strong>Welcome Track</strong> (5 weeks, leading to a decision
          to follow Jesus) → <strong>BECOME®</strong> (12 weeks, leading to water and Holy Spirit
          baptism) → <strong>Leaders Track</strong> (11 weeks, leading to commissioning) →
          <strong> Disciplers Track</strong> (10 weeks + orientation).
        </p>

        <div>
          <h4 className="font-semibold text-church-800 text-sm mb-2">Tracks, cohorts and enrollments</h4>
          <p className="text-sm text-church-600 leading-relaxed mb-2">
            A <strong>track</strong> is the curriculum. A <strong>cohort</strong> is one group walking
            through it together on a schedule. An <strong>enrollment</strong> is one person on a
            track — either a member (User) or a Guest who has no account yet.
          </p>
          <Callout type="info">
            Welcome Track sign-ups become <strong>Guests</strong>, never user accounts. Everyone else
            gets an account with a temporary password they must change at first sign-in.
          </Callout>
        </div>

        <div>
          <h4 className="font-semibold text-church-800 text-sm mb-2">Enrolling someone</h4>
          <Step n={1}>People apply themselves from the public pages — <code>/begin</code> (Welcome),
            <code>/become</code>, <code>/leaders</code>, <code>/discipler</code> — and verify their
            email with a 6-digit code.</Step>
          <Step n={2}>Verified requests land in the queue at <strong>Tracks → 📥 Requests</strong>.
            Review and approve or reject. Approval creates the enrollment and emails them their
            portal link automatically.</Step>
          <Step n={3}>Or add someone directly from the track&apos;s Participants grid — they get the
            same welcome email.</Step>
          <Callout type="warning">
            Nothing enforces prerequisites. Someone can request the Leaders Track without finishing
            BECOME® — the approval queue is where that judgement gets made. Check before approving.
          </Callout>
        </div>

        <div>
          <h4 className="font-semibold text-church-800 text-sm mb-2">The participant portal</h4>
          <p className="text-sm text-church-600 leading-relaxed mb-2">
            Every enrollment has a private portal link (🔗 copy or 📤 send from the Participants
            grid). It needs no password — the link itself is the key — so Guests can use it. Members
            can also reach the same thing at <Link href="/dashboard/my-tracks" className="text-brand-600 hover:underline">📖 My Tracks</Link>.
          </p>
          <Callout type="warning">
            Treat portal links like passwords. Anyone holding one is treated as that participant and
            can read and write their reflections. Send them to the person, never to a group chat.
          </Callout>
        </div>

        <div>
          <h4 className="font-semibold text-church-800 text-sm mb-2">Progress, reflections and disciplers</h4>
          <p className="text-sm text-church-600 leading-relaxed">
            Participants tick off each week themselves by tapping its numbered circle, and write
            reflections inside the week. Only the numbered <strong>CORE</strong> weeks count toward
            progress — 📖 Introduction and 📋 Appendix sections are for reading only. Reflections are
            private to the participant, their assigned discipler, and admins. A discipler can leave
            one comment per week, and the participant is emailed when it is new or changed.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-church-800 text-sm mb-2">Milestones</h4>
          <p className="text-sm text-church-600 leading-relaxed">
            Record the baptism or commissioning on the ✏️ edit-enrollment modal. It shows a 🏆 in the
            grid and a celebration card on the participant&apos;s portal. Recording a BECOME® milestone
            for a Guest also ticks their Water Baptism target goal automatically.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-church-800 text-sm mb-2">Nudges</h4>
          <p className="text-sm text-church-600 leading-relaxed">
            Once a day, any discipler with disciples who have gone quiet — no week completed and no
            reflection saved for 7 days by default — gets a single digest email. Nobody is mentioned
            twice in the same window, and people who have finished every week are never flagged.
            Toggle it or change the window in <strong>⚙️ Settings → 🌱 Discipleship Tracks</strong>.
          </p>
        </div>

        <Callout type="tip">
          <strong>Formation reports</strong> live on Reports → 🌱 Formation: who is on a track now,
          the Welcome → Become → Leaders pathway, per-week completion funnels, and recent milestones.
        </Callout>
      </div>
    ),
  },

  // ── SUNDAY SCHEDULE ──────────────────────────────────────────────────────────
  {
    id: 'sunday-schedule',
    icon: '⛪',
    title: 'Sunday Schedule',
    category: 'Schedule',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">The Sunday Schedule shows all 52 (or 53) Sundays for the year, grouped by month with their theme, topic, scripture, and four service roles.</p>

        <p className="text-sm font-semibold text-church-700">The four service roles on each Sunday:</p>
        <div className="grid grid-cols-2 gap-2">
          {[['🎤','Speaker (Word Minister)'],['📋','Service Coordinator'],['🙏','Prophetic Prayer Minister'],['🎵','Worship Leader']].map(([icon, label]) => (
            <div key={label} className="flex gap-2 items-center text-sm text-church-600 bg-church-50 p-2 rounded-lg">
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>

        <p className="text-sm font-semibold text-church-700 mt-2">Assigning roles:</p>
        <Step n={1}>Click the ✏️ pencil icon on any Sunday card (visible to Admins, Leaders, and designated Schedule Coordinators).</Step>
        <Step n={2}>Select a person from the dropdown to <strong>link a system user</strong> — this sends them an immediate email + WhatsApp notification and adds the service to their My Calendar.</Step>
        <Step n={3}>Or type a name manually (e.g. "TBD", "Young Adults") without linking to a user account.</Step>
        <Step n={4}>Click <strong>Save & Notify</strong>. Linked users are notified instantly.</Step>

        <Callout type="info">7 days before each Sunday, all linked users automatically receive a WhatsApp + email reminder with their role, topic, and scripture.</Callout>

        <p className="text-sm font-semibold text-church-700 mt-2">Multi-year & archiving:</p>
        <Step n={1}>Use the year dropdown to switch between years.</Step>
        <Step n={2}>Click <strong>+ New Year</strong> (Admin only) to auto-generate all Sundays for any future year with blank topics.</Step>
        <Step n={3}>Use <strong>📦 Archive Year</strong> to hide old years — they remain accessible via "Show Archived".</Step>

        <p className="text-sm font-semibold text-church-700 mt-2">Sharing the schedule:</p>
        <div className="space-y-1.5">
          <div className="flex gap-2 text-sm text-church-600"><span>🔗</span><span><strong>Copy Share Link</strong> — copies the public URL to your clipboard for sending via WhatsApp, email or SMS. No login required to view.</span></div>
          <div className="flex gap-2 text-sm text-church-600"><span>🌐</span><span><strong>Open Public Page</strong> — opens the external view with all months, topics, and roles visible to anyone.</span></div>
          <div className="flex gap-2 text-sm text-church-600"><span>🖨️</span><span><strong>Print / Save as PDF</strong> — opens a clean print-optimised landscape table. In Chrome: File → Print → Save as PDF.</span></div>
        </div>
      </div>
    ),
  },

  // ── CALENDAR ────────────────────────────────────────────────────────────────
  {
    id: 'calendar',
    icon: '📅',
    title: 'My Calendar',
    category: 'Calendar',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">My Calendar shows your personal action items alongside any service roles you've been assigned and any meetings you've been invited to. Switch between Calendar view (monthly grid) and List view (filtered by status).</p>

        <p className="text-sm font-semibold text-church-700">Creating an action item:</p>
        <Step n={1}>Click <strong>+ New Action</strong> and choose an action type (Call, Text, WhatsApp, Pray, Visit, Appointment, etc.).</Step>
        <Step n={2}>Optionally link it to a guest or prospect.</Step>
        <Step n={3}>Set a due date, time, and reminder (up to 2 days before).</Step>
        <Step n={4}>Click <strong>Create Action Item</strong>. It appears on your calendar grid.</Step>

        <p className="text-sm font-semibold text-church-700 mt-2">Creating a meeting with attendees:</p>
        <Step n={1}>Check <strong>👥 This is a meeting or event with attendees</strong>.</Step>
        <Step n={2}>Tick the team members you want to invite.</Step>
        <Step n={3}>Each invited person automatically gets the event added to <em>their</em> calendar with an "Invited by [your name]" note.</Step>

        <p className="text-sm font-semibold text-church-700 mt-2">Recurring events:</p>
        <Step n={1}>Check <strong>🔁 Recurring</strong> and choose: Daily, Weekly, Bi-weekly, Monthly, Quarterly, or Custom (set your own day interval).</Step>
        <Step n={2}>Set an end date. A preview shows how many occurrences will be created (max 104).</Step>
        <Step n={3}>To delete a series: click 🗑️ on any occurrence → choose "just this one" or "entire series".</Step>

        <p className="text-sm font-semibold text-church-700 mt-2">Calendar colour coding:</p>
        <div className="grid grid-cols-2 gap-2">
          {[['bg-brand-50 border-brand-200','Your action items'],['bg-purple-100 border-purple-200','⛪ Service role (from Sunday Schedule)'],['bg-blue-100 border-blue-200','👥 Meeting / event you created'],['bg-indigo-100 border-indigo-200','📨 Meeting you were invited to'],['bg-green-100 border-green-200','Completed items']].map(([color, label]) => (
            <div key={label} className={`flex gap-2 items-center p-2 rounded border ${color}`}>
              <span className="text-xs text-church-700">{label}</span>
            </div>
          ))}
        </div>

        <Callout type="tip">Use <strong>📅 Export .ics</strong> to download your calendar items and import them into Apple Calendar, Google Calendar, or Outlook.</Callout>
      </div>
    ),
  },

  // ── CLUSTERS ─────────────────────────────────────────────────────────────────
  {
    id: 'clusters',
    icon: '👥',
    title: 'Clusters',
    category: 'Team',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">Clusters are named groups of team members — the foundation for future small-group ministry, targeted notifications, and group meetings. They are visible to everyone; only Admins can create and edit them.</p>

        <p className="text-sm font-semibold text-church-700">Creating a cluster:</p>
        <Step n={1}>Go to Clusters and click <strong>+ New Cluster</strong> (Admin only).</Step>
        <Step n={2}>Give it a name (e.g. "Young Adults", "Prayer Team", "Ushers") and an optional description.</Step>
        <Step n={3}>Choose a colour to identify it visually.</Step>
        <Step n={4}>Search and tick the members to include, then click <strong>Create Cluster</strong>.</Step>

        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-sm font-semibold text-indigo-800 mb-2">🚀 Coming in future updates:</p>
          <ul className="space-y-1">{['Schedule a meeting for the whole cluster at once','Send a targeted WhatsApp or email blast to a cluster','Set up shared calendar events visible to all cluster members','Manage clusters as formal small groups with their own activity tracking'].map(item => <li key={item} className="text-xs text-indigo-700 flex gap-1.5"><span>→</span>{item}</li>)}</ul>
        </div>
      </div>
    ),
  },

  // ── USERS ────────────────────────────────────────────────────────────────────
  {
    id: 'users',
    icon: '⚙️',
    title: 'User Management',
    category: 'Admin',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">Only Admins can create and manage user accounts. Go to <strong>Users</strong> in the sidebar.</p>

        <p className="text-sm font-semibold text-church-700">Creating a new user:</p>
        <Step n={1}>Click <strong>+ Add User</strong>.</Step>
        <Step n={2}>Enter their name, email, phone, and assign a role.</Step>
        <Step n={3}>Set a temporary password. They will be forced to change it on first login.</Step>
        <Step n={4}>The user receives a welcome email automatically.</Step>

        <p className="text-sm font-semibold text-church-700 mt-2">Converting a guest to a user:</p>
        <Step n={1}>Open any guest's profile page.</Step>
        <Step n={2}>Click the <strong>👤 Convert to User</strong> button (visible to Admins only).</Step>
        <Step n={3}>The guest must have an email address. A user account is created with a temporary password and a welcome email is sent.</Step>

        <p className="text-sm font-semibold text-church-700 mt-2">Account requests:</p>
        <p className="text-sm text-church-600">If someone submits an access request from the login page, the Settings page will show a yellow badge with the count of pending requests. Review them and create accounts manually from the Users page.</p>

        <Callout type="warning">Deactivating a user (toggle Active off) prevents login but preserves all their data, guest assignments, and activity history.</Callout>
      </div>
    ),
  },

  // ── NOTIFICATIONS ────────────────────────────────────────────────────────────
  {
    id: 'notifications',
    icon: '🔔',
    title: 'Notifications',
    category: 'Admin',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">The app sends automatic WhatsApp and email notifications at key moments. All notifications use Resend (email) and Whapi.cloud (WhatsApp).</p>

        <div className="space-y-3">
          {[
            { event: 'New guest form submitted', who: 'Configured email/WhatsApp recipients (Settings)', when: 'Immediately on submission' },
            { event: 'Guest assigned to volunteer', who: 'The assigned volunteer', when: 'Immediately on assignment' },
            { event: 'Sunday service role assigned', who: 'The assigned team member', when: 'Immediately on save' },
            { event: '7-day Sunday reminder', who: 'All linked role holders', when: '7 days before each Sunday (9am UTC cron)' },
            { event: 'New account request', who: 'All Admin users', when: 'Immediately on submission' },
            { event: 'Guest converted to user', who: 'The newly created user', when: 'Immediately with temp password' },
          ].map(({ event, who, when }) => (
            <div key={event} className="p-3 bg-church-50 rounded-lg border border-church-100">
              <p className="text-sm font-semibold text-church-800">📬 {event}</p>
              <p className="text-xs text-church-500 mt-1">→ Sent to: {who}</p>
              <p className="text-xs text-church-400">⏰ {when}</p>
            </div>
          ))}
        </div>

        <Callout type="tip">Configure email and WhatsApp recipients for new guest notifications in <strong>Settings → New Guest Form Submitted</strong>. Toggle notifications on/off there too.</Callout>
      </div>
    ),
  },

  // ── REPORTS ──────────────────────────────────────────────────────────────────
  {
    id: 'reports',
    icon: '📈',
    title: 'Reports',
    category: 'Admin',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">Reports give you a real-time picture of guest growth, volunteer performance, and ministry outcomes. Available to Admins and Leaders.</p>
        <div className="space-y-2">
          {[
            { title: 'Monthly New Guests', desc: 'Bar chart showing new guests per month. Spot busy seasons and growth trends.' },
            { title: 'Pipeline Status Breakdown', desc: 'How many guests are at each stage — identify bottlenecks in the follow-up process.' },
            { title: 'Volunteer Performance', desc: 'How many guests each volunteer has, how many they\'ve contacted, and their completion rate.' },
            { title: 'Target Goal Completion', desc: 'How many guests have hit each milestone (Become Signup, Water Baptism, etc.).' },
            { title: 'Service Return Tracking', desc: 'Average visits per guest and how many guests have reached the 7-visit target.' },
          ].map(({ title, desc }) => (
            <div key={title} className="flex gap-3 p-3 bg-church-50 rounded-lg">
              <span className="text-brand-500 text-lg flex-shrink-0">📊</span>
              <div>
                <p className="text-sm font-semibold text-church-800">{title}</p>
                <p className="text-xs text-church-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Callout type="tip">Use the export button on Reports to download data as a CSV for use in Excel or Google Sheets.</Callout>
      </div>
    ),
  },

  // ── SETTINGS ─────────────────────────────────────────────────────────────────
  {
    id: 'settings',
    icon: '🔔',
    title: 'Settings',
    category: 'Admin',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">Settings is the control centre for Admins. All changes save immediately when you click <strong>Save All Settings</strong>.</p>
        <div className="space-y-3">
          {[
            { icon: '⛪', title: 'Schedule Coordinators', desc: 'Designate specific people as Pastor, Coordination Leader, Prayer Coordinator, or Worship Team Coordinator. They get edit access to the Sunday Schedule.' },
            { icon: '🔐', title: 'Roles & Permissions', desc: 'Create custom roles (e.g. Deacon, Elder) and assign them Volunteer, Leader, or Admin access levels.' },
            { icon: '🎯', title: 'Target Goals', desc: 'Add, rename, reorder, or remove milestone targets. Changes appear on every guest profile immediately.' },
            { icon: '🆕', title: 'New Guest Notifications', desc: 'Configure who gets emailed/WhatsApped when a guest form is submitted. Toggle on/off.' },
            { icon: '📋', title: 'Assignment Notifications', desc: 'Toggle whether the assigned volunteer gets notified when a guest is assigned to them.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="p-3 bg-church-50 rounded-lg">
              <p className="text-sm font-semibold text-church-800">{icon} {title}</p>
              <p className="text-xs text-church-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── AUDIT TRAIL ──────────────────────────────────────────────────────────────
  {
    id: 'audit',
    icon: '📜',
    title: 'Audit Trail',
    category: 'Admin',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">The Audit Trail records every significant action taken in the system — who did what, and when. Available to Admins only.</p>
        <p className="text-sm text-church-600">Logged events include: guest created, status changed, assigned, archived, deleted; user created, password reset, deactivated; settings changed; login events; deletion requests submitted and approved.</p>
        <Callout type="info">The Audit Trail cannot be edited or deleted. It is your complete accountability record.</Callout>
      </div>
    ),
  },

  // ── DELETION REQUESTS ────────────────────────────────────────────────────────
  {
    id: 'deletion',
    icon: '🗑️',
    title: 'Deletion Requests',
    category: 'Admin',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-church-600 leading-relaxed">Non-admin users cannot delete guests directly. They can submit a <strong>deletion request</strong> which an Admin must approve.</p>
        <Step n={1}>Volunteer or Leader opens a guest profile and clicks <strong>Request Deletion</strong>.</Step>
        <Step n={2}>They provide a reason. The request is logged and visible to Admins.</Step>
        <Step n={3}>Admin reviews the request on the guest's profile and either <strong>approves</strong> (permanently deletes) or <strong>dismisses</strong> the request.</Step>
        <Callout type="warning">Permanent deletion removes all associated activities, notifications, and service return history. Consider archiving instead — it hides the guest but preserves all data.</Callout>
      </div>
    ),
  },

  // ── TIPS & TRICKS ────────────────────────────────────────────────────────────
  {
    id: 'tips',
    icon: '💡',
    title: 'Tips & Best Practices',
    category: 'Overview',
    content: (
      <div className="space-y-3">
        {[
          { icon: '📱', title: 'WhatsApp requires a country code', body: 'Always store phone numbers with the country code (e.g. +12025551234 for US). Without it, WhatsApp notifications will fail silently.' },
          { icon: '🔗', title: 'Link users to schedule roles', body: 'When assigning Sunday roles, always pick from the user dropdown rather than typing a name. Only linked users get calendar entries, email + WhatsApp reminders, and 7-day advance notifications.' },
          { icon: '📅', title: 'Use recurring events for regular meetings', body: 'Weekly prayer team meetings, monthly leadership reviews — set them up once with a recurring calendar event and all attendees see every occurrence on their calendars.' },
          { icon: '🎯', title: 'Update target goals before Sunday', body: 'When a guest gets baptised, joins a small group, or completes a discipleship class — tick it off on their profile that same day so your reports stay accurate.' },
          { icon: '📦', title: 'Archive, don\'t delete', body: 'If a guest stops attending, archive them rather than delete. Their history is preserved and they can be restored if they return.' },
          { icon: '🔁', title: 'Run the 7-day cron manually', body: 'The reminder cron runs daily at 9am UTC. To send reminders immediately, call POST /api/cron/schedule-reminders from Settings or Postman with your CRON_SECRET.' },
          { icon: '🌐', title: 'Share the schedule publicly', body: 'The public schedule page (no login needed) is perfect for sending in the church WhatsApp group before each month. Use "Copy Share Link" on the Schedule page.' },
          { icon: '🖨️', title: 'Print the schedule for meetings', body: 'Use Print / Save as PDF from the Schedule page to get a clean A4 landscape printout for leadership planning meetings.' },
        ].map(({ icon, title, body }) => (
          <div key={title} className="flex gap-3 p-3 bg-church-50 rounded-lg border border-church-100">
            <span className="text-xl flex-shrink-0">{icon}</span>
            <div>
              <p className="text-sm font-semibold text-church-800">{title}</p>
              <p className="text-xs text-church-500 mt-0.5 leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

const CATEGORIES = ['Overview', 'Guests', 'Formation', 'Schedule', 'Calendar', 'Team', 'Admin'];

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [openCategory, setOpenCategory] = useState<string | null>('Overview');
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? SECTIONS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const current = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  return (
    <div className="fade-in max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-header">❓ Help & Tutorial</h1>
        <p className="text-church-500 text-sm mt-1">Everything you need to know about the Grace Life Center staff app.</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar nav */}
        <aside className="w-56 flex-shrink-0 sticky top-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search topics…"
            className="input-field text-sm mb-3 w-full"
          />

          {search.trim() ? (
            <div className="space-y-1">
              {(filtered || []).length === 0 ? (
                <p className="text-xs text-church-400 px-2">No results</p>
              ) : (filtered || []).map(s => (
                <button key={s.id}
                  onClick={() => { setActiveSection(s.id); setSearch(''); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-church-600 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                  <span>{s.icon}</span>{s.title}
                </button>
              ))}
            </div>
          ) : (
            CATEGORIES.map(cat => {
              const catSections = SECTIONS.filter(s => s.category === cat);
              const isOpen = openCategory === cat;
              return (
                <div key={cat} className="mb-1">
                  <button
                    onClick={() => setOpenCategory(isOpen ? null : cat)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-church-500 uppercase tracking-wide hover:text-church-700 transition-colors"
                  >
                    {cat}
                    <span className="text-church-300">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div className="space-y-0.5 ml-1">
                      {catSections.map(s => (
                        <button key={s.id}
                          onClick={() => setActiveSection(s.id)}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            activeSection === s.id
                              ? 'bg-brand-500/10 text-brand-700 font-medium'
                              : 'text-church-600 hover:bg-church-100 hover:text-church-800'
                          }`}>
                          <span>{s.icon}</span>{s.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="card">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-church-100">
              <span className="text-3xl">{current.icon}</span>
              <div>
                <h2 className="text-xl font-display font-bold text-church-900">{current.title}</h2>
                <span className="text-xs text-church-400 uppercase tracking-wide">{current.category}</span>
              </div>
            </div>
            {current.content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
            {(() => {
              const idx = SECTIONS.findIndex(s => s.id === activeSection);
              const prev = SECTIONS[idx - 1];
              const next = SECTIONS[idx + 1];
              return (
                <>
                  {prev ? (
                    <button onClick={() => setActiveSection(prev.id)}
                      className="flex items-center gap-2 text-sm text-church-500 hover:text-church-700 transition-colors">
                      ← {prev.icon} {prev.title}
                    </button>
                  ) : <div />}
                  {next ? (
                    <button onClick={() => setActiveSection(next.id)}
                      className="flex items-center gap-2 text-sm text-church-500 hover:text-church-700 transition-colors">
                      {next.icon} {next.title} →
                    </button>
                  ) : <div />}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
