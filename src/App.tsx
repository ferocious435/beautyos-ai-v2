import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppStore } from './store/useAppStore';
import { supabase } from './lib/supabaseClient';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Discovery = lazy(() => import('./pages/Discovery'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Settings = lazy(() => import('./pages/Settings'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Booking = lazy(() => import('./pages/Booking'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const MasterCalendar = lazy(() => import('./pages/MasterCalendar'));

const PageLoader = () => (
  <div className="min-h-screen bg-[#050508] flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-white/10 border-t-yellow-500 rounded-full animate-spin" />
  </div>
);

function App() {
  const userRole = useAppStore((state) => state.user.role);

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

        const tgUser = tg?.initDataUnsafe?.user;
        const tgId = tgUser?.id || 12345678; // Fallback для разработки
        
        console.log(`APP: Fetching profile for TG ID: ${tgId}`);

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', tgId)
          .single();

        if (error) {
          console.warn('APP: Supabase error (expected if DB not seeded):', error.message);
        }

        if (data) {
          console.log('APP: Profile found:', data.business_name || data.full_name);
          useAppStore.setState({ 
            user: {
              id: data.id,
              name: data.full_name,
              role: data.role || 'client',
              subscriptionTier: data.subscription_tier || 'free',
              avatar: data.avatar_url
            }
          });
        } else {
          console.warn('APP: No profile in DB. Auto-registering as client to prevent E2E flow break.');
          const defaultName = tgUser?.first_name ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : `User ${tgId}`;
          
          const { data: newUser, error: insertErr } = await supabase
            .from('users')
            .upsert({ 
              telegram_id: tgId, 
              full_name: defaultName,
              role: 'client' 
            }, { onConflict: 'telegram_id' })
            .select()
            .single();

          if (newUser) {
            useAppStore.setState({ 
              user: {
                id: newUser.id,
                name: newUser.full_name,
                role: 'client',
                subscriptionTier: 'free',
              }
            });
          } else {
            console.error('APP: Auto-registration failed:', insertErr);
            useAppStore.setState(state => ({
              user: { ...state.user, role: 'client' }
            }));
          }
        }
      } catch (err) {
        console.error('APP: Critical initialization error:', err);
      }
    };

    fetchUser();
  }, []);


  return (
    <Router>
      <ErrorBoundary>
        <MainLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Main Entry Points with conditional logic */}
              <Route path="/" element={userRole === 'client' ? <ClientDashboard /> : <Dashboard />} />
              <Route path="/booking" element={userRole === 'client' ? <Booking /> : <MasterCalendar />} />
              
              {/* Explicit Admin/Unified Routes */}
              <Route path="/dashboard/master" element={<Dashboard />} />
              <Route path="/dashboard/client" element={<ClientDashboard />} />
              <Route path="/calendar" element={<MasterCalendar />} />
              <Route path="/order" element={<Booking />} />

              {/* Shared Routes */}
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/pricing" element={<Pricing />} />
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
