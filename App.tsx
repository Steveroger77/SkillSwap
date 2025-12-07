import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Feed from './pages/Feed';
import Swap from './pages/Swap';
import Search from './pages/Search';
import Requests from './pages/Requests';
import Messages from './pages/Messages';
import Profile from './pages/Profile';

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse">Loading SkillSwap...</div>
      </div>
    );
  }

  // If no session, show Auth page
  // Note: For demo purposes, if you want to bypass auth to see the UI, you can comment out the session check.
  if (!session) {
    return <Auth />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Feed />} />
          <Route path="swap" element={<Swap />} />
          <Route path="search" element={<Search />} />
          <Route path="requests" element={<Requests />} />
          <Route path="messages" element={<Messages />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;