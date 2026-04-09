import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, ArrowLeftRight, Search, Layers, MessageSquare, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

const navItems = [
  { icon: LayoutGrid, label: 'Feed', path: '/' },
  { icon: ArrowLeftRight, label: 'Swap', path: '/swap' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Layers, label: 'Requests', path: '/requests' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center pb-8 pt-2 pointer-events-none">
      <div className="glass-bottom-nav rounded-full mx-auto mb-6 w-[90%] max-w-md flex justify-around items-center p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center px-4 py-2 transition-all duration-300 rounded-full",
                isActive ? "bg-white text-black scale-110 shadow-[0_4px_20px_rgba(255,255,255,0.3)]" : "text-neutral-400 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 mb-1", isActive && "fill-current")} />
              <span className="font-sans text-[10px] font-bold uppercase tracking-tighter">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
