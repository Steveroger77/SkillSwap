import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'skillswap-auth',
  },
  realtime: { params: { eventsPerSecond: 10 } },
  global: {
    headers: { 'x-client-info': 'skillswap/1.0' },
  },
});

// ── Media helpers ────────────────────────────────────────────────────────────
export async function uploadPostMedia(
  userId: string,
  file: File
): Promise<{ media_url: string; media_type: 'image' | 'video' }> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `posts/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return { media_url: data.publicUrl, media_type: file.type.startsWith('video') ? 'video' : 'image' };
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `avatars/${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl + `?t=${Date.now()}`;
}
