import { z } from 'zod';

// ─── Status & Activity Type Labels ───────────────────────
export const STATUS_LABELS: Record<string, string> = {
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
};

export const STATUS_COLORS: Record<string, string> = {
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

// ─── Validation Schemas ──────────────────────────────────
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
  honeypot: z.string().max(0).optional(), // spam trap
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

// ─── Helpers ─────────────────────────────────────────────
export function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-NG', {
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

// ─── Volunteer-allowed statuses ──────────────────────────
export const VOLUNTEER_ALLOWED_STATUSES = [
  'ASSIGNED', 'CONTACT_ATTEMPTED', 'CONTACTED',
  'MEETING_SCHEDULED', 'MET', 'ATTENDING_REGULARLY',
];

// CSV export helper
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
