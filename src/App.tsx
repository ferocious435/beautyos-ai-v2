import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppStore } from './store/useAppStore';
import { supabase } from './lib/supabaseClient';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Discovery = lazy(() => import('./pages/Discovery'));
const Pricing = lazy(() => import('./pages/Pricing'));

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
        if (!tg) {
          console.warn('APP: Telegram WebApp API not found (running outside Telegram?)');
        } else {
          console.log('APP: Telegram WebApp version:', tg.version);
          tg.ready();
          tg.expand();
        }

        const tgUser = tg?.initDataUnsafe?.user;
        const tgId = tgUser?.id || 12345678; // Fallback for local testing
        console.log('APP: Processing user ID:', tgId);

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', tgId)
          .single();

        if (error) {
          console.error('APP: Supabase fetch error:', error.message);
        }

        if (data) {
          console.log('APP: User loaded from Supabase:', data.full_name);
          useAppStore.setState({ 
            user: {
              name: data.full_name,
              role: data.role,
              subscriptionTier: data.subscription_tier,
              avatar: data.avatar_url
            }
          });
        } else {
          console.warn('APP: User not found in database, using defaults');
        }
      } catch (err) {
        console.error('APP: Critical error in fetchUser:', err);
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
              <Route path="/" element={userRole === 'client' ? <Discovery /> : <Dashboard />} />
              <Route path="/discovery" element={<Discovery />} />
              <Route path="/pricing" element={<Pricing />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
