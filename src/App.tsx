import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import TestPage from './pages/TestPage';
import Discovery from './pages/Discovery';
import Booking from './pages/Booking';
import Pricing from './pages/Pricing';
import { supabase } from './lib/supabaseClient';
import { useAppStore } from './store/useAppStore';

function App() {
  useEffect(() => {
    const fetchUser = async () => {
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser?.id) {
        const { data } = await supabase
          .from('users')
          .select('full_name, role, subscription_tier')
          .eq('telegram_id', tgUser.id)
          .single();
        
        if (data) {
          useAppStore.setState({ 
            user: { 
              name: data.full_name, 
              role: data.role, // Use raw role for logic
              subscriptionTier: data.subscription_tier || 'free'
            } 
          });
        }
      }
    };
    fetchUser();
  }, []);

  const userRole = useAppStore((state) => state.user.role);

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={userRole === 'client' ? <Discovery /> : <Dashboard />} />
          <Route path="/test" element={<TestPage />} />
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
