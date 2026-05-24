import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '../types';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function ensureProfile(user: User): Promise<Profile | null> {
  // Try fetching existing profile first
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing as Profile;

  // Build profile from auth metadata (works for Google + email)
  const meta = user.user_metadata ?? {};
  const email = user.email ?? '';
  const rawName =
    meta.name ?? meta.full_name ?? meta.display_name ?? email.split('@')[0] ?? 'User';
  const rawUsername =
    meta.preferred_username ??
    meta.user_name ??
    email.split('@')[0] ??
    'user';

  // Sanitise username and make unique
  let base = rawUsername.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 28);
  if (base.length < 2) base = 'user';
  let username = base;
  let attempt = 0;
  while (true) {
    const { data: clash } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (!clash) break;
    attempt++;
    username = `${base}${attempt}`;
  }

  const newProfile = {
    id: user.id,
    name: rawName.trim().slice(0, 80),
    username,
    email,
    bio: '',
    avatar_url:
      meta.avatar_url ?? meta.picture ?? meta.avatar ?? null,
    location: 'Remote',
  };

  const { data: created, error } = await supabase
    .from('profiles')
    .upsert(newProfile, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Profile creation error:', error);
    return null;
  }
  return created as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialised = useRef(false);

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const p = await ensureProfile(u);
    setProfile(p);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await ensureProfile(s.user);
        setProfile(p);
      }
      setLoading(false);
      initialised.current = true;
    });

    // Listen for auth changes (login, logout, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          // Always ensure profile exists — critical for Google OAuth first login
          const p = await ensureProfile(s.user);
          setProfile(p);
        } else {
          setProfile(null);
        }

        if (initialised.current) setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
