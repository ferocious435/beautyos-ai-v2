import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Discovery from './pages/Discovery';
import Portfolio from './pages/Portfolio';
import Booking from './pages/Booking';
import Pricing from './pages/Pricing';
import { supabase } from './lib/supabaseClient';
import { useAppStore } from './store/useAppStore';

function App() {
  useEffect(() => {
    const fetchUser = async () => {
      console.log('App: Fetching user...');
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      console.log('App: Telegram user found:', !!tgUser);
      
      if (tgUser?.id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('full_name, role, subscription_tier')
            .eq('telegram_id', tgUser.id)
            .single();
          
          if (error) console.error('App: Supabase error:', error);
          
          if (data) {
            console.log('App: User data loaded:', data.role);
            useAppStore.setState({ 
              user: { 
                name: data.full_name, 
                role: data.role,
                subscriptionTier: data.subscription_tier || 'free'
              } 
            });
          }
        } catch (err) {
          console.error('App: Fetch crash:', err);
        }
      } else {
        console.log('App: No Telegram user ID, using default role.');
      }
    };
    fetchUser();
  }, []);

  const userRole = useAppStore((state) => state.user.role);
  console.log('App: Current store role:', userRole);

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={userRole === 'client' ? <Discovery /> : <Dashboard />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/settings" element={<div className="text-white p-8 text-center mt-20">⚙️ הגדרות מערכת - בפיתוח...</div>} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
