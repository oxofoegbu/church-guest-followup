import { z } from 'zod';

// ─── Status & Activity Type Labels ───────────────────────
export const STATUS_LABELS: Record<string, string> = {
  // Prospect pipeline
  PROSPECT: 'Prospect',
  INVITED: 'Invited',
  FIRST_VISIT: 'First Visit',
  // Guest pipeline
  NEW_GUEST: 'New Guest',
  ASSIGNED: 'Assigned',
  CONTACT_ATTEMPTED: 'Contact Attempted',
  CONTACTED: 'Contacted',
  MEETING_SCHEDULED: 'Meeting Scheduled',
  MET: 'Met',
  ATTENDING_REGULARLY: 'Attending Regularly',
  NOT_INTERESTED: 'Not Interested',
  INACTIVE: 'Inactive',
  BECOME_SIGNED_UP: 'Become Signed Up ✓',
  ARCHIVED: 'Archived',
};

export const STATUS_COLORS: Record<string, string> = {
  PROSPECT: 'bg-orange-100 text-orange-800',
  INVITED: 'bg-pink-100 text-pink-800',
  FIRST_VISIT: 'bg-cyan-100 text-cyan-800',
  NEW_GUEST: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  CONTACT_ATTEMPTED: 'bg-yellow-100 text-yellow-800',
  CONTACTED: 'bg-amber-100 text-amber-800',
  MEETING_SCHEDULED: 'bg-purple-100 text-purple-800',
  MET: 'bg-teal-100 text-teal-800',
  ATTENDING_REGULARLY: 'bg-green-100 text-green-800',
  NOT_INTERESTED: 'bg-red-100 text-red-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  BECOME_SIGNED_UP: 'bg-emerald-100 text-emerald-800',
  ARCHIVED: 'bg-stone-100 text-stone-600',
};

export const PROSPECT_STATUSES = ['PROSPECT', 'INVITED', 'FIRST_VISIT'];
export const GUEST_STATUSES = ['NEW_GUEST', 'ASSIGNED', 'CONTACT_ATTEMPTED', 'CONTACTED', 'MEETING_SCHEDULED', 'MET', 'ATTENDING_REGULARLY', 'NOT_INTERESTED', 'INACTIVE', 'BECOME_SIGNED_UP'];

export const SOURCE_LABELS: Record<string, string> = {
  GUEST_FORM: 'Guest Form',
  PROSPECT: 'Prospect (Added by Member)',
};

export const RELATIONSHIP_OPTIONS = [
  'Neighbor', 'Coworker', 'Friend', 'Family Member', 'Classmate', 'Acquaintance', 'Other',
];

export const SPIRITUAL_STATUS_OPTIONS = [
  { value: 'unsaved', label: 'Not Yet Saved' },
  { value: 'believer_no_church', label: 'Believer – No Church Home' },
  { value: 'new_believer', label: 'New Believer' },
  { value: 'backslider', label: 'Backslider' },
  { value: 'unknown', label: 'Unknown' },
];

export const SPIRITUAL_STATUS_LABELS: Record<string, string> = {
  unsaved: 'Not Yet Saved',
  believer_no_church: 'Believer – No Church Home',
  new_believer: 'New Believer',
  backslider: 'Backslider',
  unknown: 'Unknown',
};

export const ACTIVITY_LABELS: Record<string, string> = {
  PHONE_CALL: 'Phone Call',
  WHATSAPP_MESSAGE: 'WhatsApp Message',
  SMS_TEXT: 'SMS/Text',
  EMAIL: 'Email',
  HOME_VISIT: 'Home Visit',
  INVITED_SMALL_GROUP: 'Invited to Small Group',
  LUNCH_MEETING_PASTOR: 'Lunch/Meeting with Pastor',
  ATTENDED_NEXT_SERVICE: 'Attended Next Service',
  PASTORAL_MEETING: 'Pastoral Meeting',
  OTHER: 'Other',
};

export const ACTIVITY_ICONS: Record<string, string> = {
  PHONE_CALL: '📞',
  WHATSAPP_MESSAGE: '💬',
  SMS_TEXT: '📱',
  EMAIL: '✉️',
  HOME_VISIT: '🏠',
  INVITED_SMALL_GROUP: '👥',
  LUNCH_MEETING_PASTOR: '🍽️',
  ATTENDED_NEXT_SERVICE: '⛪',
  PASTORAL_MEETING: '🙏',
  OTHER: '📝',
};

export const PREFERRED_CONTACT_LABELS: Record<string, string> = {
  CALL: 'Phone Call',
  TEXT: 'SMS/Text',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
};

// Built-in target goals
export const BUILTIN_TARGETS = [
  { key: 'becomeSignup', label: 'Become Signup', dateKey: 'becomeSignupDate' },
  { key: 'waterBaptism', label: 'Water Baptism', dateKey: 'waterBaptismDate' },
  { key: 'volunteerInChurch', label: 'Volunteer in Church', dateKey: 'volunteerInChurchDate' },
  { key: 'joinSmallGroup', label: 'Join A Small Group', dateKey: 'joinSmallGroupDate' },
];

// ─── Action Item Types ──────────────────────────────────────────
export const ACTION_ITEM_TYPES: Record<string, { label: string; icon: string }> = {
  CALL: { label: 'Call', icon: '📞' },
  TEXT: { label: 'Send Text', icon: '💬' },
  WHATSAPP: { label: 'WhatsApp Message', icon: '📱' },
  PRAY: { label: 'Pray for Them', icon: '🙏' },
  VISIT: { label: 'Visit Them', icon: '🏠' },
  APPOINTMENT: { label: 'Set Up Appointment', icon: '📅' },
  PASTOR_MEETING: { label: 'Meeting with Pastor/Leader', icon: '⛪' },
  INVITE: { label: 'Invite to Church', icon: '💌' },
  FOLLOW_UP: { label: 'General Follow-Up', icon: '🔄' },
  OTHER: { label: 'Other', icon: '📝' },
};

export const actionItemSchema = z.object({
  guestId: z.string().optional().nullable(),
  actionType: z.string().min(1),
  customAction: z.string().max(200).optional(),
  title: z.string().min(1, 'Title is required').max(200),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  dueTime: z.string().optional(),
  reminderMinutes: z.number().default(60),
});

// ─── Validation Schemas ──────────────────────────────────────────
export const guestIntakeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  phone: z.string().min(1, 'Phone is required').max(20).trim(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  preferredContactMethod: z.enum(['CALL', 'TEXT', 'WHATSAPP', 'EMAIL']).default('CALL'),
  firstVisitDate: z.string().min(1, 'Visit date is required'),
  serviceAttended: z.string().max(100).optional(),
  howHeardAboutUs: z.string().max(200).optional(),
  prayerRequest: z.string().max(1000).optional(),
  honeypot: z.string().max(0).optional(),
});

export const prospectSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  preferredContactMethod: z.enum(['CALL', 'TEXT', 'WHATSAPP', 'EMAIL']).default('CALL'),
  relationshipToAdder: z.string().max(100).optional(),
  spiritualStatus: z.string().max(50).optional(),
  prospectNotes: z.string().max(2000).optional(),
  assignedVolunteerId: z.string().optional(),
});

export const activitySchema = z.object({
  guestId: z.string().min(1),
  activityType: z.enum([
    'PHONE_CALL', 'WHATSAPP_MESSAGE', 'SMS_TEXT', 'EMAIL',
    'HOME_VISIT', 'INVITED_SMALL_GROUP', 'LUNCH_MEETING_PASTOR',
    'ATTENDED_NEXT_SERVICE', 'PASTORAL_MEETING', 'OTHER',
  ]),
  activityDateTime: z.string().optional(),
  outcome: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  nextFollowUpDate: z.string().optional().nullable(),
});

export const serviceReturnSchema = z.object({
  guestId: z.string().min(1),
  serviceDate: z.string().min(1, 'Service date is required'),
  serviceName: z.string().max(100).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────
export function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function daysAgo(date: Date | string | null): number {
  if (!date) return 0;
  const d = new Date(date);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(nextDate: Date | string | null): boolean {
  if (!nextDate) return false;
  return new Date(nextDate) < new Date();
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const VOLUNTEER_ALLOWED_STATUSES = [
  'ASSIGNED', 'CONTACT_ATTEMPTED', 'CONTACTED',
  'MEETING_SCHEDULED', 'MET', 'ATTENDING_REGULARLY',
];

export function toCSV(data: Record<string, any>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [header, ...rows].join('\n');
}
