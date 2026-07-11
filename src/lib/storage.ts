// Supabase Storage helper (server-only) — uses the Storage REST API directly
// so no new npm dependency is needed. Requires two env vars:
//   SUPABASE_URL                e.g. https://xyzcompany.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   (Project Settings → API → service_role secret)
// Files live in one public bucket, auto-created on first use.

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'harvest-files';

const NOT_CONFIGURED =
  'File storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the environment (Vercel + local .env).';

export function storageConfigured(): boolean {
  return !!(SUPABASE_URL && SERVICE_KEY);
}

export function storagePublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function ensureBucket(): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: BUCKET,
        name: BUCKET,
        public: true,
        file_size_limit: 52428800, // 50 MB
      }),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({} as any));
    const msg = String(data.message || data.error || '').toLowerCase();
    if (res.status === 409 || msg.includes('already exists') || msg.includes('duplicate')) return null;
    return data.message || data.error || `Bucket setup failed (${res.status})`;
  } catch (e: any) {
    return e.message || 'Bucket setup failed';
  }
}

// Upload a small file (photos) straight from the server.
export async function uploadBuffer(
  path: string,
  buf: Buffer,
  contentType: string,
): Promise<{ url?: string; error?: string }> {
  if (!storageConfigured()) return { error: NOT_CONFIGURED };
  const bucketError = await ensureBucket();
  if (bucketError) return { error: bucketError };

  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(buf),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({} as any));
      return { error: data.message || data.error || `Upload failed (${res.status})` };
    }
    return { url: storagePublicUrl(path) };
  } catch (e: any) {
    return { error: e.message || 'Upload failed' };
  }
}

// Create a signed URL the BROWSER can upload directly to — this is how large
// PDFs bypass Vercel's ~4.5 MB request body limit. The client PUTs the file
// to uploadUrl, then persists publicUrl on the record.
export async function createSignedUploadUrl(
  path: string,
): Promise<{ uploadUrl?: string; publicUrl?: string; error?: string }> {
  if (!storageConfigured()) return { error: NOT_CONFIGURED };
  const bucketError = await ensureBucket();
  if (bucketError) return { error: bucketError };

  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      return { error: data.message || data.error || `Could not create upload URL (${res.status})` };
    }
    // data.url is a path like /object/upload/sign/<bucket>/<path>?token=…
    const rel = String(data.url || '');
    const uploadUrl = rel.startsWith('http') ? rel : `${SUPABASE_URL}/storage/v1${rel}`;
    return { uploadUrl, publicUrl: storagePublicUrl(path) };
  } catch (e: any) {
    return { error: e.message || 'Could not create upload URL' };
  }
}
