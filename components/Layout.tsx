import React, { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import PillNav from './PillNav';
import { User } from 'lucide-react';
import { supabase } from '../services/supabase';

// Updated Logo to be White circle with Black text for visibility on dark header
const logoSvg = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" fill="#ffffff"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="12" font-family="sans-serif" fill="#000" dy=".1em">SS</text></svg>')}`;

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const navItems = [
    { label: 'Feed', href: '/' },
    { label: 'Swap', href: '/swap' },
    { label: 'Search', href: '/search' },
    { label: 'Requests', href: '/requests' },
    { label: 'Messages', href: '/messages' },
  ];

  return (
    <div className="bg-black text-white min-h-screen flex flex-col font-sans relative overflow-x-hidden selection:bg-white selection:text-black">
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          <div onClick={() => navigate('/')} className="text-xl font-bold tracking-wider uppercase flex items-center gap-2 cursor-pointer">
            <img src={logoSvg} alt="SS" className="w-8 h-8" />
            SkillSwap
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center border border-white/10">
                <User className="w-6 h-6" />
              </button>
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-black border border-white/20 rounded-xl shadow-2xl py-1 z-50 overflow-hidden">
                  <button onClick={() => { navigate('/profile'); setIsProfileMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors">Profile</button>
                  <button className="block w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors">Settings</button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 transition-colors">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-24 pb-32 container mx-auto px-4 w-full max-w-2xl">
        <Outlet />
      </main>
      
      {/* 
        Explicit color configuration for Dark Mode:
        - baseColor (Active Pill Background): #ffffff (White)
        - pillColor (Inactive Pill Background): rgba(255,255,255,0.1) (Translucent White)
        - hoveredPillTextColor (Text inside Active Pill): #000000 (Black) - Vital for contrast against baseColor
        - pillTextColor (Text inside Inactive Pill): #ffffff (White)
      */}
      <PillNav
        logo={logoSvg}
        logoAlt="SkillSwap Logo"
        items={navItems}
        activeHref={location.pathname}
        ease="power2.inOut"
        baseColor="#ffffff"
        pillColor="rgba(255, 255, 255, 0.1)"
        hoveredPillTextColor="#000000"
        pillTextColor="#ffffff"
      />
    </div>
  );
};

export default Layout;