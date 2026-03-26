import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { supabase } from './lib/supabaseClient';
import { useAppStore } from './store/useAppStore';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Discovery = lazy(() => import('./pages/Discovery'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Booking = lazy(() => import('./pages/Booking'));
const Pricing = lazy(() => import('./pages/Pricing'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh] text-zinc-500">
    טוען... ⏳
  </div>
);

function App() {
  useEffect(() => {
    const fetchUser = async () => {
      console.log('App: Fetching user...');
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      
      if (tgUser?.id) {
        try {
          const { data } = await supabase
            .from('users')
            .select('full_name, role, subscription_tier')
            .eq('telegram_id', tgUser.id)
            .single();
          
          if (data) {
            console.log('App: User detected role:', data.role);
            useAppStore.setState({ 
              user: { 
                name: data.full_name, 
                role: data.role,
                subscriptionTier: data.subscription_tier || 'free'
              } 
            });
          }
        } catch (err) {
          console.error('App: Supabase fetch error:', err);
        }
      }
    };
    fetchUser();
  }, []);

  const userRole = useAppStore((state) => state.user.role);

  return (
    <Router>
      <MainLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={userRole === 'client' ? <Discovery /> : <Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/discovery" element={<Discovery />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/settings" element={<div className="text-white p-8 text-center mt-20">⚙️ הגדרות מערכת - בפיתוח...</div>} />
          </Routes>
        </Suspense>
      </MainLayout>
    </Router>
  );
}

export default App;
