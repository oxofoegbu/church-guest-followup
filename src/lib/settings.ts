import prisma from './db';

/**
 * Tiny wrapper around the AppSetting model.
 *
 * Keeps the callsite intent clear ("get the church name") rather than
 * spilling `prisma.appSetting.findUnique` into every file that needs a
 * runtime setting.
 *
 * Introduced Run 6 so the drip executor can read `church_name` without
 * hardcoding. Future settings (anchor_hour_utc, per-tenant branding, etc.)
 * can reuse the same helpers.
 */

export async function getAppSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * getAppSettingOr: read a setting or return a sensible default.
 * Useful for config that is optional — avoids null-plumbing through
 * callers that always want *some* value.
 */
export async function getAppSettingOr(key: string, fallback: string): Promise<string> {
  const v = await getAppSetting(key);
  return v ?? fallback;
}
