import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, ArrowLeftRight, Search, Layers, MessageSquare, User } from 'lucide-react';
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pt-2 pointer-events-none">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="glass-bottom-nav rounded-[28px] mx-4 w-full max-w-md flex justify-around items-center p-2 pointer-events-auto"
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center px-3 py-2.5 rounded-[20px] transition-all duration-300 min-w-[52px] ${
                isActive
                  ? 'bg-white text-black scale-105 shadow-[0_4px_20px_rgba(255,255,255,0.25)]'
                  : 'text-white/35 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              <item.icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className="text-[9px] font-bold uppercase tracking-[0.06em] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
}
