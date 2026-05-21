import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, ArrowLeftRight, Search, Layers, MessageSquare, User } from 'lucide-react';
import { motion } from 'motion/react';

const items = [
  { icon: LayoutGrid,    label: 'Feed',     path: '/' },
  { icon: ArrowLeftRight,label: 'Swap',     path: '/swap' },
  { icon: Search,        label: 'Explore',  path: '/search' },
  { icon: Layers,        label: 'Requests', path: '/requests' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: User,          label: 'Profile',  path: '/profile' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center pb-4 pt-1 pointer-events-none">
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32, delay: 0.2 }}
        className="glass-bottom-nav rounded-[26px] mx-3 w-full max-w-[420px] flex items-center justify-around px-2 py-2 pointer-events-auto"
      >
        {items.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center px-2.5 py-2 rounded-[18px] transition-colors duration-200 min-w-[48px]"
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-white rounded-[18px]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <item.icon
                className={`relative z-10 w-[18px] h-[18px] transition-all duration-200 ${
                  active ? 'text-black stroke-[2.5]' : 'text-white/35 stroke-[1.5]'
                }`}
              />
              <span className={`relative z-10 text-[8.5px] font-black uppercase tracking-[0.06em] mt-0.5 leading-none transition-colors duration-200 ${
                active ? 'text-black' : 'text-white/28'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}
