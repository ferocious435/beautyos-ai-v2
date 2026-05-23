/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppStore } from './store/useAppStore';
import { telegramAuthHeaders } from './lib/telegramAuth';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Discovery = lazy(() => import('./pages/Discovery'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Settings = lazy(() => import('./pages/Settings'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Booking = lazy(() => import('./pages/Booking'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const MasterCalendar = lazy(() => import('./pages/MasterCalendar'));
const Messages = lazy(() => import('./pages/Messages'));

const PageLoader = () => (
  <div className="min-h-screen bg-[#050508] flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-white/10 border-t-yellow-500 rounded-full animate-spin" />
  </div>
);

function App() {
  const userRole = useAppStore((state) => state.user.role);
  const [bootstrapReady, setBootstrapReady] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      console.log('APP: Initializing user session...');
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          tg.ready();
          tg.expand();
          console.log('APP: Telegram WebApp context ready');
        }

        const tgUser = (tg as any)?.initDataUnsafe?.user;
        
        // Never grant admin outside Telegram in production.
        if (!tgUser) {
          console.warn('APP: Telegram user missing.');
          useAppStore.setState({ 
            user: {
              id: import.meta.env.DEV ? 'local-dev-id-1234' : '',
              name: import.meta.env.DEV ? 'Local Developer' : 'Guest',
              role: import.meta.env.DEV ? 'admin' : 'client',
              subscriptionTier: import.meta.env.DEV ? 'pro' : 'free',
            }
          });
          return;
        }

        console.log(`APP: Fetching profile for TG ID: ${tgUser.id}`);

        const response = await fetch('/api/services?action=get-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
        });

        if (!response.ok) throw new Error('Profile bootstrap failed');

        const { profile } = await response.json();
        console.log('APP: Profile found:', profile.business_name || profile.full_name);
        useAppStore.setState({
          user: {
            id: profile.id,
            name: profile.full_name,
            role: profile.role || 'client',
            subscriptionTier: profile.subscription_tier || 'free',
            avatar: profile.avatar_url,
          },
        });
      } catch (err) {
        console.error('APP: Critical initialization error:', err);
        useAppStore.setState({
          user: {
            id: '',
            name: 'Guest',
            role: 'client',
            subscriptionTier: 'free',
          },
        });
      } finally {
        setBootstrapReady(true);
      }
    };

    fetchUser();
  }, []);

  if (!bootstrapReady) {
    return <PageLoader />;
  }

  return (
    <Router>
      <ErrorBoundary>
        <MainLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Main Entry Points with conditional logic */}
              <Route path="/" element={userRole === 'client' ? <ClientDashboard /> : <Dashboard />} />
              <Route path="/booking" element={<Booking />} />
              
              {/* Explicit Admin/Unified Routes */}
              <Route path="/dashboard/master" element={<Dashboard />} />
              <Route path="/dashboard/client" element={<ClientDashboard />} />
              <Route path="/calendar" element={userRole === 'client' ? <ClientDashboard /> : <MasterCalendar />} />
              <Route path="/order" element={<Booking />} />

              {/* Shared Routes */}
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/portfolio" element={<Portfolio />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
