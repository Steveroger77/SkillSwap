import { createClient } from '@supabase/supabase-js';

// Public anon credentials — safe to ship in frontend
const SUPABASE_URL      = 'https://gsgftpmlhvwrmzhznylj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ2Z0cG1saHZ3cm16aHpueWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTExMTYsImV4cCI6MjA5MTA2NzExNn0.Yyw8mKpLo463XDRtmwacR0GoLMzQU3-pkkqdidUxm_w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,   // Required: exchanges ?code= from Google OAuth
    storageKey:         'skillswap-auth',
    flowType:           'pkce', // Required for SPAs with Google OAuth
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

/** Upload post image/video → { media_url, media_type } */
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

/** Upload avatar → public URL */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `avatars/${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
