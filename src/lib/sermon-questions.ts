// Run 59 — Ask a Question: shared helpers for the anonymous live sermon Q&A
// feature. Date handling mirrors src/lib/teaching-admin.ts's toDbDate/
// toDateStr/todayEastern exactly (an America/New_York CALENDAR DATE stored at
// UTC midnight in an @db.Date column) -- kept as a small local copy here
// rather than importing teaching-admin.ts, so this feature has no dependency
// on the Teaching content system.
import { z } from 'zod';

/** Today, in the church's timezone. 'en-CA' locale renders as YYYY-MM-DD. */
export function todayEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** DB value -> 'yyyy-mm-dd'. */
export function toDateStr(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

/** 'yyyy-mm-dd' -> the Date Prisma should store for an @db.Date column. */
export function toDbDate(s: string): Date {
  return new Date(s + 'T00:00:00.000Z');
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isDateStr(s: unknown): s is string {
  return typeof s === 'string' && DATE_RE.test(s);
}

export const SERMON_QUESTION_STATUSES = ['NEW', 'ANSWERED', 'DISMISSED'] as const;
export type SermonQuestionStatus = (typeof SERMON_QUESTION_STATUSES)[number];

export const MAX_QUESTION_LENGTH = 500;

// Honeypot mirrors the /enroll pattern (src/lib/enroll.ts): bots fill hidden
// fields, humans never see them. No email/OTP here -- verifying an emailed
// code would require collecting an email, which breaks the point of an
// anonymous question. The moderation queue (a human reading every question
// before it's addressed) is the real spam gate, not a rate limiter.
export const sermonQuestionSchema = z.object({
  text: z.string().trim().min(1, 'Please write a question.').max(MAX_QUESTION_LENGTH, 'That\u2019s a bit long -- please shorten it.'),
  website: z.string().optional(), // honeypot
});
