// Run 13 — shared helpers for public self-enrollment (Become & Leaders Track)
import { randomInt, createHash } from 'crypto';
import { z } from 'zod';

// Only these tracks are open for public self-enrollment. Welcome Track has
// its own intake flow; Ministry Track does not exist yet.
export const SELF_ENROLL_TRACK_SLUGS = ['become', 'leaders-track'];

export const enrollRequestSchema = z.object({
  trackId: z.string().min(1),
  cohortId: z.string().min(1).nullable().optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  // Run 24 -- optional extras sent by the /become landing page (the DB
  // columns have existed since Run 19; /enroll's own form simply omits them)
  audience: z.enum(['WELCOME_GRAD', 'GLC_MEMBER', 'OTHER_CHURCH', 'NEW_TO_FAITH', 'BECOME_DONE', 'BECOME_NOW', 'PATH_OTHER']).nullable().optional(),
  shareNote: z.string().trim().max(1000).optional().or(z.literal('')),
  // Run 27 -- optional extras sent by the /discipler landing page.
  // invitedBy: Door 1 "who tapped your shoulder" / Door 2 "who has walked
  // with you". intent 'INTEREST' marks Door 2 (a conversation request that
  // must never become an enrollment); enrollment doors simply omit it.
  invitedBy: z.string().trim().max(200).optional().or(z.literal('')),
  intent: z.enum(['INTEREST']).nullable().optional(),
  website: z.string().optional(), // honeypot -- humans never fill this
});

// Readable temporary password, e.g. "Harvest-K7RM4XPT".
// Unambiguous alphabet (no 0/O/1/I/L) — the user must change it on first
// sign-in anyway (User.mustChangePassword defaults to true).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateTempPassword(): string {
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `Harvest-${suffix}`;
}

// --- Run 14: email OTP verification ----------------------------------------
export const OTP_TTL_MS = 10 * 60 * 1000;          // codes live 10 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;   // one send per minute
export const OTP_MAX_ATTEMPTS = 5;                 // wrong tries per code
export const UNVERIFIED_MAX_AGE_MS = 24 * 60 * 60 * 1000; // sweep after 24h

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000)); // 6 digits, never leading-zero
}

// Codes are short-lived so a salted SHA-256 is appropriate here (bcrypt is
// for long-lived secrets). Salting with the request id makes each hash
// unique even for identical codes.
export function hashOtpCode(requestId: string, code: string): string {
  return createHash('sha256').update(`${requestId}:${code}`).digest('hex');
}

// --- Run 19: Welcome Track "Begin" page (/begin) ----------------------------
// The Welcome Track deliberately has its own warmer public flow, separate
// from /enroll (which stays Become & Leaders only).
export const WELCOME_TRACK_SLUG = 'welcome-track';
export const BECOME_TRACK_SLUG = 'become';

// "Which best describes you?" options -- stored as codes on
// EnrollmentRequest.audience, rendered with these labels.
export const BEGIN_AUDIENCES: { code: string; label: string }[] = [
  { code: 'FIRST_TIME', label: "This is my first time / I'm new here" },
  { code: 'RETURNING', label: "I'm coming back after a while" },
  { code: 'MEMBER', label: "I'm a member wanting to re-anchor" },
  { code: 'EXPLORING', label: "I'm just exploring \u2014 not sure yet" },
];

// Run 24 -- "Where are you on the path?" options for the /become page.
// Same EnrollmentRequest.audience column; disjoint code set.
export const BECOME_AUDIENCES: { code: string; label: string }[] = [
  { code: 'WELCOME_GRAD', label: "I've completed the Welcome Track" },
  { code: 'GLC_MEMBER', label: "I'm a Grace Life Center member / regular" },
  { code: 'OTHER_CHURCH', label: "I'm part of another church family" },
  { code: 'NEW_TO_FAITH', label: "I'm fairly new to all of this" },
];

// Run 27 -- the Disciplers Track's public page (/discipler). The track is
// deliberately NOT in SELF_ENROLL_TRACK_SLUGS (it never appears on /enroll);
// only the /discipler page reaches it, and every acceptance still lands in
// the same admin approval queue where the inviter is verified by a human.
export const DISCIPLER_TRACK_SLUG = 'disciplers';

// "Where are you on the path?" options for /discipler.
// Same EnrollmentRequest.audience column; third disjoint code set.
export const DISCIPLER_AUDIENCES: { code: string; label: string }[] = [
  { code: 'BECOME_DONE', label: "I've completed Become\u00AE" },
  { code: 'BECOME_NOW', label: "I'm completing Become\u00AE now" },
  { code: 'PATH_OTHER', label: 'Other' },
];

export function beginAudienceLabel(code?: string | null): string | null {
  if (!code) return null;
  return (
    BEGIN_AUDIENCES.find(a => a.code === code)?.label ||
    BECOME_AUDIENCES.find(a => a.code === code)?.label ||
    DISCIPLER_AUDIENCES.find(a => a.code === code)?.label ||
    null
  );
}

// Begin form: warmer and leaner than /enroll -- last name is optional
// (stored as '' when omitted), plus the optional audience + share/prayer note.
export const beginRequestSchema = z.object({
  cohortId: z.string().min(1).nullable().optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional().or(z.literal('')),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  audience: z.enum(['FIRST_TIME', 'RETURNING', 'MEMBER', 'EXPLORING']).nullable().optional(),
  shareNote: z.string().trim().max(1000).optional().or(z.literal('')),
  website: z.string().optional(), // honeypot -- humans never fill this
});
