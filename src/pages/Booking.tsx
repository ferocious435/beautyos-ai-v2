import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const masterId = searchParams.get('masterId');
  
  const [master, setMaster] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // 1. Загрузка данных мастера
  useEffect(() => {
    const loadMaster = async () => {
      if (!masterId) return;
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', masterId)
        .single();
      setMaster(data);
    };
    loadMaster();
  }, [masterId]);

  // 2. Загрузка доступных слотов через RPC
  useEffect(() => {
    const loadSlots = async () => {
      if (!masterId || !selectedDate) return;
      setLoading(true);
      // RPC get_available_slots ожидает m_id (bigint) и select_date (date)
      const { data, error } = await supabase.rpc('get_available_slots', {
        m_id: parseInt(masterId),
        select_date: selectedDate
      });
      if (!error) setSlots(data || []);
      else console.error('BOOKING: RPC Error:', error);
      setLoading(false);
    };
    loadSlots();
  }, [masterId, selectedDate]);

  const handleBook = async (slotTime: string) => {
    const tg = (window as any).Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    
    // В продакшене используем реальный ID, в деве — заглушку
    const clientTelegramId = user?.id || 12345678;

    if (!masterId) return;

    setBookingStatus('loading');
    
    try {
      const response = await fetch(`/api/services?action=create-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterTelegramId: parseInt(masterId),
          clientTelegramId: clientTelegramId,
          startTime: slotTime
        })
      });

      if (response.ok) {
        setBookingStatus('success');
        setTimeout(() => navigate('/'), 2500);
      } else {
        const errorData = await response.json();
        console.error('BOOKING: API Error:', errorData);
        setBookingStatus('error');
      }
    } catch (err) {
      console.error('BOOKING: Fetch Error:', err);
      setBookingStatus('error');
    }
  };

  if (!masterId) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">Мастер не выбран</h2>
        <p className="text-zinc-500 text-sm">Пожалуйста, выберите мастера на странице поиска, чтобы увидеть расписание.</p>
      </div>
      <button 
        onClick={() => navigate('/discovery')}
        className="gold-gradient px-8 py-4 rounded-2xl text-black font-black"
      >
        К поиску мастеров
      </button>
    </div>
  );

  if (!master) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Запись на визит 🗓️</h1>
        <p className="text-zinc-400">К специалисту: <span className="text-white font-medium">{master.business_name || master.full_name}</span></p>
      </div>

      {/* Date Picker */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Выберите дату</label>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-white/10"
        />
      </div>

      {/* Slots Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Доступное время</h3>
        <div className="grid grid-cols-3 gap-3">
          {loading ? (
             [1,2,3,4,5,6].map(i => <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse border border-white/5" />)
          ) : slots.length > 0 ? (
            slots.map((slot) => {
              const time = new Date(slot.slot_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
              return (
                <button
                  key={slot.slot_time}
                  onClick={() => handleBook(slot.slot_time)}
                  className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 hover:border-yellow-500/50 py-3 rounded-xl text-white font-medium transition-all active:scale-95 text-lg"
                >
                  {time}
                </button>
              );
            })
          ) : (
            <div className="col-span-3 text-center py-10 text-zinc-600 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
              На этот день свободного времени нет
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {bookingStatus === 'success' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center space-y-4 shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full mx-auto flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Запись подтверждена!</h2>
              <p className="text-zinc-400">Мы уведомили мастера. До встречи!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Booking;
