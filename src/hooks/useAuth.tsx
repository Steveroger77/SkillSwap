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

async function upsertProfile(user: User): Promise<Profile | null> {
  try {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) return data as Profile;

    const m = user.user_metadata ?? {};
    const email = user.email ?? '';
    const name = (m.name ?? m.full_name ?? m.display_name ?? email.split('@')[0] ?? 'User').trim().slice(0, 80);
    let base = (m.preferred_username ?? m.user_name ?? m.username ?? email.split('@')[0] ?? 'user')
      .toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 24);
    if (base.length < 2) base = 'user';

    let username = base, n = 0;
    while (n < 50) {
      const { data: clash } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
      if (!clash) break;
      username = `${base}${++n}`;
    }

    const { data: created } = await supabase.from('profiles').upsert({
      id: user.id, name, username, email,
      bio: '', location: 'Remote',
      avatar_url: m.avatar_url ?? m.picture ?? m.avatar ?? null,
    }, { onConflict: 'id' }).select().single();

    return created as Profile ?? null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) { const p = await upsertProfile(u); if (p) setProfile(p); }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Hard timeout — show auth page after 5s no matter what
    const timer = setTimeout(() => { if (mounted) setLoading(false); }, 5000);

    // Auth state listener — this fires for EVERYTHING including OAuth redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      clearTimeout(timer);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const p = await upsertProfile(s.user);
        if (mounted) setProfile(p);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    // Also call getSession to handle already-logged-in users on refresh
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      // onAuthStateChange will handle this — but if it doesn't fire, handle here
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        upsertProfile(s.user).then(p => { if (mounted) { setProfile(p); setLoading(false); clearTimeout(timer); } });
      } else {
        // No session — show auth immediately
        setLoading(false);
        clearTimeout(timer);
      }
    });

    return () => { mounted = false; clearTimeout(timer); subscription.unsubscribe(); };
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
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
