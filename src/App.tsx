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

const spring = { type: 'spring', stiffness: 380, damping: 30 };

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Spinner() {
  return (
    <div className="min-h-svh flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center">
          <div className="w-8 h-8 border-[2.5px] border-white/15 border-t-white rounded-full animate-spin" />
        </div>
        <p className="text-white/28 text-[10px] font-bold tracking-[0.3em] uppercase">Loading</p>
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
  if (loading) return <Spinner />;
  if (!user) return (
    <Suspense fallback={<Spinner />}>
      <Routes><Route path="*" element={<Auth />} /></Routes>
    </Suspense>
  );
  return (
    <div className="min-h-svh relative overflow-x-hidden">
      {/* Ambient background orbs */}
      <div className="aurora-orb w-[600px] h-[600px] bg-white/[0.018] -top-40 -left-40 opacity-60" />
      <div className="aurora-orb w-[500px] h-[500px] bg-white/[0.014] top-[45%] -right-36 opacity-45" style={{ animationDelay: '7s' }} />
      <div className="liquid-orb  w-[320px] h-[320px] bg-white/[0.01]  bottom-[20%] left-[30%] opacity-30" style={{ animationDelay: '3s' }} />
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
