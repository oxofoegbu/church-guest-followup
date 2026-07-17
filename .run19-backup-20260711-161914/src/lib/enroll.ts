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
