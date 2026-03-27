import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const user = useAppStore((state) => state.user);
  const userRole = user.role;
  const tier = user.subscriptionTier;

  const navItems = [
    { 
      path: '/', 
      label: 'סטודיו',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      ),
      roles: ['master', 'admin']
    },
    { 
      path: '/discovery', 
      label: 'רדאר',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4h8Z"/><path d="m12 16V8"/></svg>
      ),
      roles: ['client', 'master', 'admin']
    },
    { 
      path: '/booking', 
      label: 'תורים',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
      ),
      roles: ['client', 'master', 'admin'],
      minTier: 'essential'
    },
    { 
      path: '/portfolio', 
      label: 'גלריה',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      ),
      roles: ['master', 'admin']
    },
    { 
      path: '/settings', 
      label: 'הגדרות',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      ),
      roles: ['master', 'admin']
    }
  ];

  // Fallback: if role is not set (e.g. browser testing without Telegram), default to 'master'
  const effectiveRole = userRole || 'master';

  const filteredItems = navItems.filter(item => {
    if (effectiveRole === 'admin') return true;
    if (!item.roles.includes(effectiveRole)) return false;
    return true;
  });

  console.log('[Nav] Rendering with role:', effectiveRole, 'tier:', tier, 'items:', filteredItems.length);

  return (
    <div className="min-h-screen relative bg-[#050505] overflow-x-hidden text-white" dir="rtl" data-testid="main-layout" data-role={effectiveRole}>
      {/* Content */}
      <main className="w-full">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0c0c0e]/95 backdrop-blur-3xl border-t border-white/5 px-2 py-4 flex justify-around items-center z-[100] pb-8">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              onClick={() => console.log('[Nav] Clicking:', item.path)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${isActive ? 'text-yellow-500' : 'text-zinc-500 hover:text-zinc-300'}`}
              style={{ minWidth: '60px', minHeight: '44px', display: 'flex', justifyContent: 'center' }}
            >
              <div className={`w-6 h-6 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100 opacity-70'}`}>
                {item.icon(isActive)}
              </div>
              <span className={`text-[9px] font-bold tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-glow"
                  className="absolute -bottom-2 w-5 h-1 bg-yellow-500 rounded-full blur-[2px] opacity-50" 
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MainLayout;
