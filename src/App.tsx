import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages
const Auth = lazy(() => import('./pages/Auth'));
const Feed = lazy(() => import('./pages/Feed'));
const Search = lazy(() => import('./pages/Search'));
const Swap = lazy(() => import('./pages/Swap'));
const Profile = lazy(() => import('./pages/Profile'));
const Messages = lazy(() => import('./pages/Messages'));
const Requests = lazy(() => import('./pages/Requests'));
const Hashtag = lazy(() => import('./pages/Hashtag'));

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-surface" />}>
        <Auth />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/search" element={<Search />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/hashtag/:tag" element={<Hashtag />} />
          <Route path="*" element={<Navigate to="/" replace />} />
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
