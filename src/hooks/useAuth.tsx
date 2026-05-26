import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '../types';

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

// Profile fetch/create — runs in background, never blocks loading
async function getOrCreateProfile(user: User): Promise<Profile | null> {
  try {
    // First try to get existing profile
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) return existing as Profile;

    // Build new profile from OAuth/email metadata
    const m = user.user_metadata ?? {};
    const email = user.email ?? '';
    const name = String(
      m.name ?? m.full_name ?? m.display_name ?? email.split('@')[0] ?? 'User'
    ).trim().slice(0, 80);

    let base = String(
      m.preferred_username ?? m.user_name ?? m.username ?? email.split('@')[0] ?? 'user'
    ).toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 24);
    if (base.length < 2) base = 'user';

    // Find unique username
    let username = base;
    for (let i = 1; i <= 50; i++) {
      const { data: clash } = await supabase
        .from('profiles').select('id').eq('username', username).maybeSingle();
      if (!clash) break;
      username = `${base}${i}`;
    }

    const { data: created, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name,
        username,
        email,
        bio: '',
        location: 'Remote',
        avatar_url: m.avatar_url ?? m.picture ?? m.avatar ?? null,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[Auth] profile upsert error:', error.message);
      return null;
    }
    return created as Profile;
  } catch (err) {
    console.error('[Auth] getOrCreateProfile failed:', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const p = await getOrCreateProfile(u);
    if (p) setProfile(p);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Absolute fallback — never stay loading more than 6 seconds
    const fallback = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 6000);

    // Subscribe to auth changes FIRST (catches OAuth redirect callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;

        setSession(s);
        setUser(s?.user ?? null);

        // ── KEY FIX: stop loading immediately, fetch profile in background ──
        setLoading(false);
        clearTimeout(fallback);

        if (s?.user) {
          // Background profile fetch — doesn't block the UI
          getOrCreateProfile(s.user).then(p => {
            if (mounted && p) setProfile(p);
          });
        } else {
          setProfile(null);
        }
      }
    );

    // Then check for existing session (logged-in user refreshing the page)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;

      // onAuthStateChange already fired or will fire — just ensure loading stops
      if (!s) {
        // Definitely no session — stop loading right away
        setLoading(false);
        clearTimeout(fallback);
      }
      // If there IS a session, onAuthStateChange handles it
    });

    return () => {
      mounted = false;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
