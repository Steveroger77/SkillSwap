import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';

const links = [
  { to: '/',         label: 'Feed' },
  { to: '/swap',     label: 'Swap' },
  { to: '/search',   label: 'Explore' },
  { to: '/requests', label: 'Requests' },
  { to: '/messages', label: 'Messages' },
];

export function Navbar() {
  const { profile } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass-nav">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link to="/" className="font-headline text-[1.25rem] font-black tracking-[-0.04em] text-white select-none">
          Skill<span className="text-white/38">Swap</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center p-1 glass rounded-full gap-0.5">
          {links.map(link => {
            const active = pathname === link.to;
            return (
              <Link key={link.to} to={link.to} className="relative px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-200">
                {active && (
                  <motion.div
                    layoutId="desktop-nav-pill"
                    className="absolute inset-0 bg-white rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className={`relative z-10 transition-colors duration-200 ${active ? 'text-black' : 'text-white/42 hover:text-white/75'}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <Link to="/profile">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/12 hover:border-white/28 transition-all duration-200 hover:scale-105 active:scale-95">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/55 text-xs font-black">
                  {profile?.name?.[0]?.toUpperCase() || '?'}
                </div>
            }
          </div>
        </Link>
      </div>
    </header>
  );
}
