import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore, useEffectiveRole } from '../store/useAppStore';
import type { AppRole } from '../store/useAppStore';

type NavRole = AppRole;

const roleMeta: Record<NavRole, { label: string; subtitle: string; homePath: string }> = {
  client: {
    label: 'לקוח',
    subtitle: 'מקבל שירות',
    homePath: '/',
  },
  master: {
    label: 'מאסטר',
    subtitle: 'נותן שירות',
    homePath: '/dashboard/master',
  },
  admin: {
    label: 'אדמין',
    subtitle: 'ניהול מלא',
    homePath: '/',
  },
};

const routeAccess: Array<{ match: RegExp; roles: NavRole[] }> = [
  { match: /^\/$/, roles: ['client', 'master', 'admin'] },
  { match: /^\/dashboard\/master$/, roles: ['master', 'admin'] },
  { match: /^\/dashboard\/client$/, roles: ['client', 'admin'] },
  { match: /^\/calendar$/, roles: ['client', 'master', 'admin'] },
  { match: /^\/booking$/, roles: ['client', 'master', 'admin'] },
  { match: /^\/order$/, roles: ['client', 'master', 'admin'] },
  { match: /^\/discovery$/, roles: ['client', 'master', 'admin'] },
  { match: /^\/pricing$/, roles: ['master', 'admin'] },
  { match: /^\/messages$/, roles: ['master', 'admin'] },
  { match: /^\/portfolio$/, roles: ['master', 'admin'] },
  { match: /^\/settings$/, roles: ['master', 'admin'] },
];

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const previewRole = useAppStore((state) => state.previewRole);
  const setPreviewRole = useAppStore((state) => state.setPreviewRole);
  const userRole = useEffectiveRole() as NavRole;
  const actualRole = (user.role || 'client') as NavRole;
  const isAdmin = actualRole === 'admin';

  useEffect(() => {
    const currentRoute = routeAccess.find((route) => route.match.test(location.pathname));
    if (!currentRoute || currentRoute.roles.includes(userRole)) {
      return;
    }

    navigate(roleMeta[userRole].homePath, { replace: true });
  }, [location.pathname, navigate, userRole]);

  const navItems = [
    {
      path: userRole === 'client' ? '/' : '/dashboard/master',
      label: userRole === 'client' ? 'התורים שלי' : 'הסטודיו',
      roles: ['client', 'master', 'admin'] as NavRole[],
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      path: '/calendar',
      label: userRole === 'client' ? 'היומן שלי' : 'תורים',
      roles: ['client', 'master', 'admin'] as NavRole[],
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      ),
    },
    {
      path: '/discovery',
      label: 'קביעת תור',
      roles: ['client'] as NavRole[],
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
      ),
    },
    {
      path: '/discovery',
      label: 'מומחים',
      roles: ['admin'] as NavRole[],
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m16 12-4-4-4 4h8Z" />
          <path d="m12 16V8" />
        </svg>
      ),
    },
    {
      path: '/pricing',
      label: 'מנוי',
      roles: ['master', 'admin'] as NavRole[],
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" x2="12" y1="2" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      path: '/messages',
      label: 'הודעות',
      roles: ['master', 'admin'] as NavRole[],
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      ),
    },
    {
      path: '/portfolio',
      label: 'גלריה',
      roles: ['master', 'admin'] as NavRole[],
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      ),
    },
    {
      path: '/settings',
      label: 'שירותים',
      roles: ['master', 'admin'] as NavRole[],
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
  ];

  const dailyNavPathsByRole: Record<NavRole, string[]> = {
    client: ['/', '/discovery'],
    master: ['/dashboard/master', '/calendar', '/messages', '/settings'],
    admin: ['/dashboard/master', '/calendar', '/discovery', '/settings'],
  };

  const filteredItems = navItems
    .filter((item) => item.roles.includes(userRole))
    .filter((item) => dailyNavPathsByRole[userRole].includes(item.path));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-white" dir="rtl" data-testid="main-layout" data-role={userRole}>
      <main className={isAdmin ? 'pt-24' : ''}>{children}</main>

      {isAdmin ? (
        <div className="fixed left-3 right-3 top-3 z-[110]">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-3xl border border-yellow-500/20 bg-[#0b0b0d]/92 p-3 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-500">מצב בדיקה</div>
              <div className="truncate text-xs text-zinc-400">
                {previewRole
                  ? `מוצג עכשיו: ${roleMeta[userRole].label} - ${roleMeta[userRole].subtitle}`
                  : 'מוצג עכשיו: אדמין - ניהול מלא'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {([
                { role: 'client', label: 'לקוח' },
                { role: 'master', label: 'מאסטר' },
                { role: 'admin', label: 'אדמין' },
              ] as Array<{ role: NavRole; label: string }>).map((item) => {
                const isActive = userRole === item.role;
                const nextPreview = item.role === 'admin' ? null : item.role;

                return (
                  <button
                    key={item.role}
                    onClick={() => setPreviewRole(nextPreview)}
                    className={`min-h-10 rounded-2xl px-3 py-2 text-xs font-black transition-all ${
                      isActive ? 'bg-yellow-500 text-black' : 'bg-white/5 text-zinc-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-[100] overflow-x-auto border-t border-white/5 bg-[#0c0c0e]/95 px-2 py-3 pb-7 backdrop-blur-3xl no-scrollbar">
        <div className="mx-auto flex min-w-max max-w-3xl items-center justify-around gap-2">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={`${item.path}-${item.label}`}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-2 transition-all duration-300 ${
                  isActive ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                style={{ minWidth: '68px', minHeight: '48px' }}
              >
                <div className={`h-6 w-6 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100 opacity-70'}`}>
                  {item.icon(isActive)}
                </div>
                <span className={`text-[9px] font-bold tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
                {isActive ? <div className="absolute -bottom-1 h-1 w-5 rounded-full bg-yellow-500 opacity-50 blur-[2px]" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MainLayout;
