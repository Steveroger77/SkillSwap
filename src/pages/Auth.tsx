import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [name, setName]           = useState('');
  const [username, setUsername]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (username.length < 3) { setError('Username must be at least 3 characters.'); return; }
        const { data: existing } = await supabase
          .from('profiles').select('id').eq('username', username.toLowerCase().trim()).maybeSingle();
        if (existing) { setError('Username already taken.'); return; }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name.trim(), username: username.toLowerCase().trim() } },
        });
        if (error) throw error;
        setSuccess('Account created! Check your email to verify, or sign in now if email confirmation is disabled.');
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-6 py-12">
      {/* Aurora orbs */}
      <div className="aurora-orb w-[65vw] h-[65vw] max-w-[680px] max-h-[680px] bg-white/[0.028] top-[-22%] left-[-22%]" />
      <div className="aurora-orb w-[55vw] h-[55vw] max-w-[580px] max-h-[580px] bg-white/[0.022] bottom-[-22%] right-[-22%]" style={{ animationDelay: '6s' }} />
      <div className="liquid-orb w-[38vw] h-[38vw] max-w-[360px] max-h-[360px] bg-white/[0.014] top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '3s' }} />

      <main className="z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.34,1.56,0.64,1] }}
          className="hidden md:flex flex-col space-y-10"
        >
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white/38 text-xs font-bold uppercase tracking-[0.22em]">Network Live</span>
            </div>
            <h1 className="font-headline text-[4.5rem] font-black tracking-[-0.04em] text-white leading-none">
              Skill<br /><span className="text-white/45">Swap</span>
            </h1>
            <p className="text-white/45 text-xl font-light leading-relaxed max-w-xs">
              Exchange talent. Build bridges. Master your craft through community.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: '⚡', text: 'Match with complementary skill partners' },
              { icon: '🔄', text: 'Trade expertise — zero money required' },
              { icon: '🌐', text: 'Real-time feed and instant messaging' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-4 p-4 glass rounded-2xl"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-white/68 text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.34,1.56,0.64,1] }}
        >
          <div className="glass-card p-8 md:p-10 rounded-3xl w-full">
            <div className="md:hidden text-center mb-8">
              <h1 className="font-headline text-4xl font-black tracking-[-0.04em] text-white">SkillSwap</h1>
            </div>

            {/* Tabs */}
            <div className="flex p-1 glass rounded-full mb-8">
              {['Login', 'Sign Up'].map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => { setIsLogin(i === 0); setError(null); setSuccess(null); }}
                  className={`flex-1 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                    (i === 0) === isLogin
                      ? 'bg-white text-black shadow-[0_4px_16px_rgba(255,255,255,0.22)]'
                      : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              {/* Google */}
              <button
                onClick={handleGoogle}
                className="w-full py-4 rounded-2xl glass-card text-white font-semibold flex items-center justify-center gap-3 hover:bg-white/[0.13] transition-all duration-200 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/[0.055]" />
                <span className="text-white/22 text-xs font-bold uppercase tracking-[0.16em]">or</span>
                <div className="h-px flex-1 bg-white/[0.055]" />
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      key="signup-extra"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div>
                        <label className="text-white/38 text-[10px] font-bold uppercase tracking-[0.16em] ml-1 mb-1.5 block">Full Name</label>
                        <input required className="glass-input w-full rounded-2xl px-5 py-3.5 text-sm" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-white/38 text-[10px] font-bold uppercase tracking-[0.16em] ml-1 mb-1.5 block">Username</label>
                        <input required className="glass-input w-full rounded-2xl px-5 py-3.5 text-sm" placeholder="@handle" value={username} onChange={e => setUsername(e.target.value)} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="text-white/38 text-[10px] font-bold uppercase tracking-[0.16em] ml-1 mb-1.5 block">Email</label>
                  <input required className="glass-input w-full rounded-2xl px-5 py-3.5 text-sm" placeholder="name@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div>
                  <div className="flex justify-between items-center ml-1 mb-1.5">
                    <label className="text-white/38 text-[10px] font-bold uppercase tracking-[0.16em]">Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!email) { setError('Enter your email first.'); return; }
                          const { error } = await supabase.auth.resetPasswordForEmail(email);
                          if (error) setError(error.message);
                          else setSuccess('Password reset email sent!');
                        }}
                        className="text-white/28 text-[10px] hover:text-white/58 transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      required
                      className="glass-input w-full rounded-2xl px-5 py-3.5 text-sm pr-12"
                      placeholder="••••••••"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-red-400 text-xs py-2.5 px-4 bg-red-500/10 border border-red-500/18 rounded-xl">
                      {error}
                    </motion.p>
                  )}
                  {success && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-green-400 text-xs py-2.5 px-4 bg-green-500/10 border border-green-500/18 rounded-xl">
                      {success}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button disabled={loading} className="btn-primary w-full py-4 rounded-2xl text-sm" type="submit">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                    </span>
                  ) : isLogin ? 'Enter the Exchange' : 'Join SkillSwap'}
                </button>
              </form>
            </div>

            <p className="mt-8 text-center text-[10px] text-white/18 leading-relaxed">
              By continuing you agree to our{' '}
              <span className="underline hover:text-white/40 cursor-pointer transition-colors">Terms</span>
              {' '}and{' '}
              <span className="underline hover:text-white/40 cursor-pointer transition-colors">Privacy Policy</span>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
