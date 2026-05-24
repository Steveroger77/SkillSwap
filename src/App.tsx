import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';

const Auth     = lazy(() => import('./pages/Auth'));
const Feed     = lazy(() => import('./pages/Feed'));
const Search   = lazy(() => import('./pages/Search'));
const Swap     = lazy(() => import('./pages/Swap'));
const Profile  = lazy(() => import('./pages/Profile'));
const Messages = lazy(() => import('./pages/Messages'));
const Requests = lazy(() => import('./pages/Requests'));
const Hashtag  = lazy(() => import('./pages/Hashtag'));

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface z-[999]">
      <div className="flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-white/15 border-t-white rounded-full animate-spin" />
        </div>
        <p className="text-white/25 text-[10px] font-black uppercase tracking-[0.3em]">Loading</p>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"             element={<PageShell><Feed /></PageShell>} />
        <Route path="/search"       element={<PageShell><Search /></PageShell>} />
        <Route path="/swap"         element={<PageShell><Swap /></PageShell>} />
        <Route path="/profile"      element={<PageShell><Profile /></PageShell>} />
        <Route path="/messages"     element={<PageShell><Messages /></PageShell>} />
        <Route path="/requests"     element={<PageShell><Requests /></PageShell>} />
        <Route path="/hashtag/:tag" element={<PageShell><Hashtag /></PageShell>} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function AppShell() {
  const { user, loading } = useAuth();

  // Show spinner while checking auth — but max 8s (timeout in useAuth)
  if (loading) return <Spinner />;

  // Not logged in — show auth page
  if (!user) {
    return (
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="*" element={<Auth />} />
        </Routes>
      </Suspense>
    );
  }

  // Logged in — show app
  return (
    <div className="min-h-svh relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="aurora-orb w-[550px] h-[550px] bg-white/[0.018] -top-48 -left-48 pointer-events-none" />
      <div className="aurora-orb w-[450px] h-[450px] bg-white/[0.013] top-[40%] -right-36 pointer-events-none" style={{ animationDelay: '7s' }} />
      <div className="liquid-orb  w-[300px] h-[300px] bg-white/[0.009]  bottom-[20%] left-[28%] pointer-events-none" style={{ animationDelay: '3s' }} />

      <Navbar />
      <Suspense fallback={<Spinner />}>
        <AnimatedRoutes />
      </Suspense>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <AppShell />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
