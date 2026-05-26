import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';

export default function Auth() {
  const [mode, setMode]           = useState<'login' | 'signup'>('login');
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [name, setName]           = useState('');
  const [username, setUsername]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
    // On success browser redirects — no need to setLoading(false)
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Auth state change in useAuth will handle the rest
      } else {
        if (!name.trim())     throw new Error('Please enter your name');
        if (username.length < 3) throw new Error('Username must be at least 3 characters');
        const clean = username.toLowerCase().replace(/[^a-z0-9_.]/g, '');
        // Check uniqueness
        const { data: ex } = await supabase
          .from('profiles').select('id').eq('username', clean).maybeSingle();
        if (ex) throw new Error('That username is already taken');

        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name.trim(), username: clean, full_name: name.trim() } },
        });
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm, then sign in.');
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
      redirectTo: window.location.origin,
    });
    if (error) setError(error.message);
    else setSuccess('Password reset email sent!');
  };

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m); setError(null); setSuccess(null);
  };

  return (
    <div className="min-h-svh flex items-center justify-center relative overflow-hidden px-5 py-12">
      {/* Background orbs */}
      <div className="aurora-orb w-[600px] h-[600px] bg-white/[0.022] -top-52 -left-52" />
      <div className="aurora-orb w-[500px] h-[500px] bg-white/[0.016] -bottom-40 -right-40" style={{ animationDelay: '8s' }} />
      <div className="liquid-orb  w-[300px] h-[300px] bg-white/[0.01] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

        {/* Left — branding */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16,1,0.3,1] as any }}
          className="hidden md:flex flex-col gap-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-white/32 text-[10px] font-black uppercase tracking-[0.28em]">Live Network</span>
            </div>
            <h1 className="font-headline text-[5.5rem] font-black tracking-[-0.05em] text-white leading-[0.88] mb-6">
              Skill<br /><span className="text-white/32">Swap</span>
            </h1>
            <p className="text-white/40 text-lg leading-relaxed max-w-xs">
              Exchange expertise. Build real skills through community-powered learning.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { e: '⚡', t: 'Match with complementary skill partners' },
              { e: '🔄', t: 'Trade expertise — zero money needed' },
              { e: '💬', t: 'Real-time feed, chat & skill tracking' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: [0.16,1,0.3,1] as any }}
                className="flex items-center gap-4 px-5 py-4 glass rounded-2xl"
              >
                <span className="text-xl">{item.e}</span>
                <span className="text-white/58 text-sm">{item.t}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right — auth card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16,1,0.3,1] as any }}
        >
          <div className="glass-card p-7 rounded-[28px]">
            {/* Mobile logo */}
            <div className="md:hidden text-center mb-7">
              <h1 className="font-headline text-4xl font-black tracking-[-0.04em] text-white">SkillSwap</h1>
              <p className="text-white/32 text-sm mt-1">Exchange talent. Grow together.</p>
            </div>

            {/* Tab switcher */}
            <div className="relative flex p-1 glass rounded-full mb-6">
              <motion.div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-[0_2px_12px_rgba(255,255,255,0.2)]"
                animate={{ left: mode === 'login' ? '4px' : 'calc(50%)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
              {(['login','signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-bold rounded-full capitalize transition-colors duration-200 ${mode === m ? 'text-black' : 'text-white/40 hover:text-white/70'}`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 glass rounded-2xl text-white font-semibold text-sm mb-5 hover:bg-white/[0.10] active:scale-[.98] transition-all duration-200 disabled:opacity-50"
            >
              {googleLoading
                ? <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                : <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
              }
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">or</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16,1,0.3,1] as any }}
                    className="flex flex-col gap-4 overflow-hidden"
                  >
                    <div>
                      <label className="block text-white/32 text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ml-0.5">Full Name</label>
                      <input required className="glass-input rounded-2xl px-4 py-3.5 text-sm" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-white/32 text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ml-0.5">Username</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-sm">@</span>
                        <input required className="glass-input rounded-2xl pl-8 pr-4 py-3.5 text-sm" placeholder="handle" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,''))} minLength={3} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-white/32 text-[10px] font-black uppercase tracking-[0.18em] mb-1.5 ml-0.5">Email</label>
                <input required type="email" className="glass-input rounded-2xl px-4 py-3.5 text-sm" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5 ml-0.5">
                  <label className="text-white/32 text-[10px] font-black uppercase tracking-[0.18em]">Password</label>
                  {mode === 'login' && <button type="button" onClick={handleForgot} className="text-white/25 text-[10px] hover:text-white/50 transition-colors">Forgot?</button>}
                </div>
                <div className="relative">
                  <input required type={showPw ? 'text' : 'password'} className="glass-input rounded-2xl px-4 py-3.5 pr-12 text-sm" placeholder="••••••••" minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/28 hover:text-white/60 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {(error || success) && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`text-xs px-4 py-3 rounded-xl leading-snug ${error ? 'text-red-400 bg-red-500/10 border border-red-500/18' : 'text-green-400 bg-green-500/10 border border-green-500/18'}`}
                  >
                    {error || success}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 rounded-2xl text-sm mt-1 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><Zap className="w-4 h-4" />{mode === 'login' ? 'Sign In' : 'Create Account'}</>
                }
              </motion.button>
            </form>

            <p className="mt-6 text-center text-[10px] text-white/16 leading-relaxed">
              By continuing you agree to our Terms & Privacy Policy
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
