#!/usr/bin/env node
/**
 * run5-smoke.mjs
 *
 * Optional helper. Triggers the drip executor against a deployed instance
 * and prints the JSON summary. Intended for local curl-replacement, not
 * run by the installer.
 *
 * Usage:
 *   CRON_SECRET=... APP_URL=https://harvest.gracelifecenter.com \
 *     node scripts/run5-smoke.mjs
 */

const appUrl = process.env.APP_URL || 'https://harvest.gracelifecenter.com';
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error('Set CRON_SECRET env var before running.');
  process.exit(1);
}

const url = `${appUrl}/api/cron/drip-executor`;
console.log(`GET ${url}`);

try {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  try {
    const json = JSON.parse(text);
    console.log(JSON.stringify(json, null, 2));
    if (json.banner) {
      console.log('');
      console.log(json.banner);
    }
  } catch {
    console.log(text);
  }
} catch (e) {
  console.error('Request failed:', e.message);
  process.exit(2);
}
