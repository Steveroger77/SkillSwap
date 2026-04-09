import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Navbar() {
  const { profile } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 py-4 glass-nav transition-opacity">
      <Link to="/" className="text-2xl font-black text-white uppercase tracking-widest font-headline">
        SkillSwap
      </Link>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-neutral-400 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest">Feed</Link>
          <Link to="/swap" className="text-neutral-400 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest">Swap</Link>
          <Link to="/search" className="text-neutral-400 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest">Search</Link>
          <Link to="/requests" className="text-neutral-400 hover:text-white transition-colors font-bold uppercase text-xs tracking-widest">Requests</Link>
        </div>
        
        <Link to="/profile" className="flex items-center gap-2">
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.name} 
              className="w-8 h-8 rounded-full border border-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="w-8 h-8 text-white" />
          )}
        </Link>
      </div>
    </nav>
  );
}
