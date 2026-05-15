import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          username: string;
          email: string;
          bio: string;
          avatar_url: string | null;
          location: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      skills: {
        Row: { id: string; name: string; category: string | null };
        Insert: { name: string; category?: string };
        Update: Partial<Database['public']['Tables']['skills']['Row']>;
      };
      user_skills: {
        Row: { id: string; user_id: string; skill_id: string; type: 'know' | 'learn' };
        Insert: { user_id: string; skill_id: string; type: 'know' | 'learn' };
        Update: Partial<Database['public']['Tables']['user_skills']['Row']>;
      };
      posts: {
        Row: { id: string; user_id: string; caption: string; location: string; created_at: string };
        Insert: { user_id: string; caption: string; location?: string };
        Update: Partial<Database['public']['Tables']['posts']['Row']>;
      };
      post_media: {
        Row: { id: string; post_id: string; media_url: string; media_type: 'image' | 'video' };
        Insert: { post_id: string; media_url: string; media_type: 'image' | 'video' };
        Update: Partial<Database['public']['Tables']['post_media']['Row']>;
      };
      post_likes: {
        Row: { user_id: string; post_id: string };
        Insert: { user_id: string; post_id: string };
        Update: never;
      };
      comments: {
        Row: { id: string; post_id: string; user_id: string; content: string; parent_id: string | null; created_at: string };
        Insert: { post_id: string; user_id: string; content: string; parent_id?: string };
        Update: Partial<Database['public']['Tables']['comments']['Row']>;
      };
      saved_posts: {
        Row: { user_id: string; post_id: string };
        Insert: { user_id: string; post_id: string };
        Update: never;
      };
      swap_requests: {
        Row: { id: string; from_user: string; to_user: string; skill_id: string | null; status: 'pending' | 'accepted' | 'rejected'; created_at: string };
        Insert: { from_user: string; to_user: string; skill_id?: string; status?: string };
        Update: Partial<Database['public']['Tables']['swap_requests']['Row']>;
      };
      chats: {
        Row: { id: string; created_at: string };
        Insert: Record<string, never>;
        Update: never;
      };
      chat_participants: {
        Row: { chat_id: string; user_id: string };
        Insert: { chat_id: string; user_id: string };
        Update: never;
      };
      messages: {
        Row: { id: string; chat_id: string; sender_id: string; content: string; attachment_url: string | null; created_at: string; edited_at: string | null };
        Insert: { chat_id: string; sender_id: string; content: string; attachment_url?: string };
        Update: Partial<Database['public']['Tables']['messages']['Row']>;
      };
    };
  };
};

// ── Media upload helper ──────────────────────────────────────────────────────
export async function uploadPostMedia(userId: string, file: File): Promise<{ media_url: string; media_type: 'image' | 'video' }> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `posts/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return {
    media_url: data.publicUrl,
    media_type: file.type.startsWith('video') ? 'video' : 'image',
  };
}

// ── Avatar upload helper ─────────────────────────────────────────────────────
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `avatars/${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
