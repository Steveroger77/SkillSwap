import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060606', zIndex: 9999 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.12)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{label}</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const { pathname } = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={useLocation()} key={pathname}>
        <Route path="/"             element={<PageWrap><Feed /></PageWrap>} />
        <Route path="/search"       element={<PageWrap><Search /></PageWrap>} />
        <Route path="/swap"         element={<PageWrap><Swap /></PageWrap>} />
        <Route path="/profile"      element={<PageWrap><Profile /></PageWrap>} />
        <Route path="/messages"     element={<PageWrap><Messages /></PageWrap>} />
        <Route path="/requests"     element={<PageWrap><Requests /></PageWrap>} />
        <Route path="/hashtag/:tag" element={<PageWrap><Hashtag /></PageWrap>} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner label="SkillSwap" />;

  if (!user) return (
    <Suspense fallback={<Spinner />}>
      <Routes><Route path="*" element={<Auth />} /></Routes>
    </Suspense>
  );

  return (
    <div className="min-h-svh relative overflow-x-hidden" style={{ background: '#060606' }}>
      <div className="aurora-orb" style={{ width: 500, height: 500, background: 'rgba(255,255,255,0.018)', top: -200, left: -200 }} />
      <div className="aurora-orb" style={{ width: 400, height: 400, background: 'rgba(255,255,255,0.013)', top: '45%', right: -160, animationDelay: '7s' }} />
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
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
