import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function Navbar() {
  const { profile } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/', label: 'Feed' },
    { to: '/swap', label: 'Swap' },
    { to: '/search', label: 'Search' },
    { to: '/requests', label: 'Requests' },
    { to: '/messages', label: 'Messages' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="font-headline text-xl font-black text-white tracking-[-0.03em]">
          Skill<span className="text-white/45">Swap</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 p-1 glass rounded-full">
          {links.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-[0.08em] transition-all duration-200 ${
                  isActive ? 'bg-white text-black shadow-[0_2px_12px_rgba(255,255,255,0.2)]' : 'text-white/40 hover:text-white/80'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <Link to="/profile" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full overflow-hidden glass border border-white/10 transition-all duration-200 group-hover:border-white/25 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-bold bg-white/5">
                {profile?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        </Link>
      </div>
    </nav>
  );
}
