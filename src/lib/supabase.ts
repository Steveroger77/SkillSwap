import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:      true,
    autoRefreshToken:    true,
    detectSessionInUrl:  true,  // REQUIRED for OAuth redirect
    storageKey:          'skillswap-auth',
    flowType:            'pkce',   // More secure for SPAs
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

/** Upload a post image/video, returns { media_url, media_type } */
export async function uploadPostMedia(
  userId: string,
  file: File
): Promise<{ media_url: string; media_type: 'image' | 'video' }> {
  const ext  = file.name.split('.').pop() ?? 'bin';
  const path = `posts/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return {
    media_url:  data.publicUrl,
    media_type: file.type.startsWith('video') ? 'video' : 'image',
  };
}

/** Upload avatar, returns public URL */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `avatars/${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
