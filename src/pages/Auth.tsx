import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';

const ease = "easeOut" as const;

export default function Auth() {
  const [mode, setMode]         = useState<'login' | 'signup'>('login');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [username, setUsername] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (username.length < 3) throw new Error('Username must be at least 3 characters');
        const clean = username.toLowerCase().replace(/[^a-z0-9_.]/g, '');
        const { data: ex } = await supabase.from('profiles').select('id').eq('username', clean).maybeSingle();
        if (ex) throw new Error('Username already taken');
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name.trim(), username: clean } },
        });
        if (error) throw error;
        setSuccess('Account created! You can sign in now.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) { setError('Enter your email first'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) setError(error.message);
    else setSuccess('Reset email sent! Check your inbox.');
  };

  return (
    <div className="min-h-svh flex items-center justify-center relative overflow-hidden px-5 py-10">
      {/* Orbs */}
      <div className="aurora-orb w-[550px] h-[550px] bg-white/[0.025] -top-40 -left-40" />
      <div className="aurora-orb w-[450px] h-[450px] bg-white/[0.018] -bottom-32 -right-32" style={{ animationDelay: '7s' }} />
      <div className="liquid-orb  w-[280px] h-[280px] bg-white/[0.012] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Left branding */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as any }}
          className="hidden md:flex flex-col gap-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-white/35 text-[10px] font-black uppercase tracking-[0.25em]">Live Network</span>
            </div>
            <h1 className="font-headline text-[5rem] font-black tracking-[-0.05em] text-white leading-[0.9] mb-6">
              Skill<br /><span className="text-white/38">Swap</span>
            </h1>
            <p className="text-white/42 text-lg font-light leading-relaxed max-w-xs">
              Exchange expertise. Build real skills through community-powered learning.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { icon: '⚡', text: 'Match with complementary skill partners' },
              { icon: '🔄', text: 'Trade expertise — zero money needed' },
              { icon: '💬', text: 'Real-time feed, chat & skill tracking' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] as any }}
                className="flex items-center gap-4 px-5 py-4 glass rounded-2xl"
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-white/62 text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as any }}
        >
          <div className="glass-card p-8 rounded-[28px]">
            {/* Mobile logo */}
            <div className="md:hidden text-center mb-8">
              <h1 className="font-headline text-4xl font-black tracking-[-0.04em] text-white">SkillSwap</h1>
              <p className="text-white/35 text-sm mt-1">Exchange talent. Grow together.</p>
            </div>

            {/* Mode tabs */}
            <div className="relative flex p-1 glass rounded-full mb-7">
              <motion.div
                layoutId="auth-pill"
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-[0_4px_16px_rgba(255,255,255,.22)]"
                animate={{ left: mode === 'login' ? '4px' : 'calc(50%)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-full capitalize transition-colors duration-200 ${
                    mode === m ? 'text-black' : 'text-white/42 hover:text-white/72'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 glass rounded-2xl text-white font-semibold text-sm mb-5 hover:bg-white/[0.12] transition-all duration-200 active:scale-[.98] disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white/60" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-white/22 text-[10px] font-bold uppercase tracking-[0.2em]">or</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] as any }}
                    className="flex flex-col gap-4 overflow-hidden"
                  >
                    <div>
                      <label className="block text-white/38 text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ml-1">Full Name</label>
                      <input required className="glass-input px-4 py-3.5 rounded-2xl text-sm" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-white/38 text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ml-1">Username</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/28 text-sm font-medium">@</span>
                        <input required className="glass-input pl-7 pr-4 py-3.5 rounded-2xl text-sm" placeholder="handle" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-white/38 text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ml-1">Email</label>
                <input required type="email" className="glass-input px-4 py-3.5 rounded-2xl text-sm" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="text-white/38 text-[10px] font-black uppercase tracking-[0.18em]">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={handleForgot} className="text-white/28 text-[10px] hover:text-white/55 transition-colors">Forgot?</button>
                  )}
                </div>
                <div className="relative">
                  <input required type={showPw ? 'text' : 'password'} className="glass-input px-4 py-3.5 pr-12 rounded-2xl text-sm" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/32 hover:text-white/65 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-red-400 text-xs px-4 py-3 bg-red-500/10 border border-red-500/18 rounded-xl leading-snug">
                    {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-green-400 text-xs px-4 py-3 bg-green-500/10 border border-green-500/18 rounded-xl leading-snug">
                    {success}
                  </motion.p>
                )}
              </AnimatePresence>

              <button type="submit" disabled={loading} className="btn-primary w-full py-4 rounded-2xl text-sm mt-1 flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><Zap className="w-4 h-4" /> {mode === 'login' ? 'Sign In' : 'Create Account'}</>
                }
              </button>
            </form>

            <p className="mt-7 text-center text-[10px] text-white/18 leading-relaxed">
              By continuing you agree to our{' '}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Terms</span>
              {' & '}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Privacy Policy</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
