import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Discovery from './pages/Discovery';
import { supabase } from './lib/supabaseClient';
import { useAppStore } from './store/useAppStore';

function App() {
  useEffect(() => {
    const fetchUser = async () => {
      console.log('App: Fetching user...');
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser?.id) {
        try {
          const { data } = await supabase
            .from('users')
            .select('role')
            .eq('telegram_id', tgUser.id)
            .single();
          if (data) {
            console.log('App: User role detected:', data.role);
            useAppStore.setState({ user: { ...useAppStore.getState().user, role: data.role } });
          }
        } catch (e) {
          console.error('App: Supabase error', e);
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
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/settings" element={<div className="text-white p-8 text-center mt-20">⚙️ הגדרות מערכת...</div>} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
