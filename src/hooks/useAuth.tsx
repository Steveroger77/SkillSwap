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
  try {
    // Try to get existing profile
    const { data: existing, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) return existing as Profile;

    // Build from auth metadata
    const meta = user.user_metadata ?? {};
    const email = user.email ?? '';
    const rawName =
      meta.name ?? meta.full_name ?? meta.display_name ??
      email.split('@')[0] ?? 'User';
    const rawBase =
      meta.preferred_username ?? meta.user_name ?? meta.username ??
      email.split('@')[0] ?? 'user';

    let base = rawBase.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 24);
    if (base.length < 2) base = 'user';

    // Find unique username
    let username = base;
    let n = 0;
    while (n < 100) {
      const { data: clash } = await supabase
        .from('profiles').select('id').eq('username', username).maybeSingle();
      if (!clash) break;
      n++;
      username = `${base}${n}`;
    }

    const { data: created, error: createErr } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: String(rawName).trim().slice(0, 80),
        username,
        email,
        bio: '',
        avatar_url: meta.avatar_url ?? meta.picture ?? meta.avatar ?? null,
        location: 'Remote',
      }, { onConflict: 'id' })
      .select()
      .single();

    if (createErr) { console.error('Profile upsert error:', createErr); return null; }
    return created as Profile;
  } catch (err) {
    console.error('ensureProfile error:', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const ready = useRef(false);

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const p = await ensureProfile(u);
    if (p) setProfile(p);
  }, []);

  useEffect(() => {
    // Hard timeout — never stay loading more than 8 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s }, error }) => {
      if (error) console.error('getSession error:', error);
      clearTimeout(timeout);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await ensureProfile(s.user);
        setProfile(p);
      }
      setLoading(false);
      ready.current = true;
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        clearTimeout(timeout);
        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          const p = await ensureProfile(s.user);
          setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
        ready.current = true;
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
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
