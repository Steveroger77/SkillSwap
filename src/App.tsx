import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden">
      <div className="aurora-orb w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-white/[0.025] top-[-20%] left-[-20%]" />
      <div className="aurora-orb w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-white/[0.02] bottom-[-20%] right-[-20%]" style={{ animationDelay: '5s' }} />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
          <div className="w-9 h-9 border-2 border-white/15 border-t-white rounded-full animate-spin" />
        </div>
        <p className="text-white/30 text-[10px] font-bold tracking-[0.28em] uppercase">Loading</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="*" element={<Auth />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-surface relative overflow-x-hidden">
      {/* Global ambient orbs */}
      <div className="aurora-orb w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] bg-white/[0.022] top-[-15%] left-[-18%] opacity-55" />
      <div className="aurora-orb w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-white/[0.018] top-[40%] right-[-16%] opacity-45" style={{ animationDelay: '6s' }} />
      <div className="liquid-orb w-[35vw] h-[35vw] max-w-[380px] max-h-[380px] bg-white/[0.012] bottom-[15%] left-[25%] opacity-35" style={{ animationDelay: '2s' }} />

      <Navbar />

      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/"           element={<Feed />} />
          <Route path="/search"     element={<Search />} />
          <Route path="/swap"       element={<Swap />} />
          <Route path="/profile"    element={<Profile />} />
          <Route path="/messages"   element={<Messages />} />
          <Route path="/requests"   element={<Requests />} />
          <Route path="/hashtag/:tag" element={<Hashtag />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
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
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
