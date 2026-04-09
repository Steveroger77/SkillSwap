import { useState } from 'react';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { motion } from 'motion/react';
import { User, Mail, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: name
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-6">
      {/* Background Decoration */}
      <div className="absolute top-[-30%] left-[-15%] w-[70vw] h-[70vw] bg-white/[0.08] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-15%] w-[70vw] h-[70vw] bg-white/[0.08] blur-[100px] rounded-full pointer-events-none" />

      <main className="z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Side: Branding */}
        <div className="hidden md:flex flex-col space-y-8">
          <div className="space-y-4">
            <h1 className="font-headline text-6xl font-extrabold tracking-tighter text-white leading-none">
              SkillSwap
            </h1>
            <p className="text-on-surface-variant text-xl font-light leading-relaxed max-w-sm">
              Exchange talent. Build bridges. Master your craft through community.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
              <img 
                src="https://picsum.photos/seed/skillswap-user/200" 
                alt="Testimonial" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">"The best way to learn UI design is by teaching it."</p>
              <p className="text-on-surface-variant text-xs">Alex Chen • Senior Designer</p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="w-full flex justify-center">
          <div className="glass-card p-10 rounded-xl w-full max-w-md relative overflow-hidden">
            <div className="md:hidden flex flex-col items-center mb-8">
              <h1 className="font-headline text-3xl font-extrabold tracking-widest text-white uppercase">SkillSwap</h1>
            </div>

            <div className="flex items-center space-x-6 mb-10 border-b border-white/5">
              <button 
                onClick={() => setIsLogin(true)}
                className={cn(
                  "pb-4 text-lg transition-all",
                  isLogin ? "text-white font-bold border-b-2 border-white" : "text-on-surface-variant font-medium hover:text-white"
                )}
              >
                Login
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={cn(
                  "pb-4 text-lg transition-all",
                  !isLogin ? "text-white font-bold border-b-2 border-white" : "text-on-surface-variant font-medium hover:text-white"
                )}
              >
                Signup
              </button>
            </div>

            <div className="space-y-6">
              <button 
                onClick={handleGoogleLogin}
                className="w-full py-4 rounded-full bg-white text-black font-bold flex items-center justify-center space-x-3 hover:bg-neutral-200 active:scale-[0.98] transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center space-x-4 py-2">
                <div className="h-[1px] flex-grow bg-white/10"></div>
                <span className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">or email</span>
                <div className="h-[1px] flex-grow bg-white/10"></div>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-tighter text-on-surface-variant ml-4">Full Name</label>
                      <input 
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder-white/20 focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-all outline-none" 
                        placeholder="John Doe" 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-tighter text-on-surface-variant ml-4">Username</label>
                      <input 
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder-white/20 focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-all outline-none" 
                        placeholder="@handle" 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-tighter text-on-surface-variant ml-4">Email Address</label>
                  <input 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder-white/20 focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-all outline-none" 
                    placeholder="name@example.com" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-4">
                    <label className="text-xs font-bold uppercase tracking-tighter text-on-surface-variant">Password</label>
                    {isLogin && <a className="text-[10px] uppercase font-bold text-white/60 hover:text-white transition-colors" href="#">Forgot?</a>}
                  </div>
                  <input 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white placeholder-white/20 focus:bg-white/10 focus:ring-1 focus:ring-white/20 transition-all outline-none" 
                    placeholder="••••••••" 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {error && <p className="text-red-500 text-xs px-4">{error}</p>}

                <button 
                  disabled={loading}
                  className="w-full py-4 mt-4 rounded-full bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50" 
                  type="submit"
                >
                  {loading ? 'Processing...' : isLogin ? 'Enter the Exchange' : 'Join SkillSwap'}
                </button>
              </form>
            </div>

            <p className="mt-8 text-center text-[10px] text-on-surface-variant/60 leading-relaxed px-4 uppercase tracking-tighter">
              By continuing, you agree to SkillSwap's <a className="underline hover:text-white" href="#">Terms of Service</a> and <a className="underline hover:text-white" href="#">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </main>

      <div className="fixed top-12 right-12 hidden lg:block">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
          <span className="text-xs font-bold text-white uppercase tracking-widest">Network Live</span>
        </div>
      </div>
    </div>
  );
}
