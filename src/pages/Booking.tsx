import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAppStore } from '../store/useAppStore';

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const masterId = searchParams.get('masterId');
  
  const [master, setMaster] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Load Master and Services
  useEffect(() => {
    const loadMasterAndServices = async () => {
      if (!masterId) return;
      
      const { data: masterData } = await supabase
        .from('users')
        .select('id, full_name, business_name')
        .eq('telegram_id', masterId)
        .single();
        
      setMaster(masterData);

      if (masterData) {
        setLoadingServices(true);
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('master_id', masterData.id)
          .eq('is_active', true);
        
        setServices(servicesData || []);
        setLoadingServices(false);
      }
    };
    loadMasterAndServices();
  }, [masterId]);

  // Load Slots via RPC
  useEffect(() => {
    const loadSlots = async () => {
      if (!masterId || !selectedDate || !selectedService) return;
      
      setLoadingSlots(true);
      const { data, error } = await supabase.rpc('get_available_slots', {
        m_id: parseInt(masterId),
        select_date: selectedDate
      });
      
      if (!error) setSlots(data || []);
      else console.error('BOOKING: RPC Error:', error);
      
      setLoadingSlots(false);
    };
    loadSlots();
  }, [masterId, selectedDate, selectedService]);

  const handleBook = async (slotTime: string) => {
    const tg = (window as any).Telegram?.WebApp;
    const tgId = tg?.initDataUnsafe?.user?.id || 12345678;

    if (!masterId || !selectedService) return;

    setBookingStatus('loading');
    
    try {
      const initData = tg?.initData || '';
      
      const response = await fetch(`/api/services?action=create-booking`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData 
        },
        body: JSON.stringify({
          masterTelegramId: parseInt(masterId),
          clientTelegramId: tgId,
          serviceId: selectedService.id,
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
        <h2 className="text-xl font-bold text-white">לא נבחר מומחה ❌</h2>
        <p className="text-zinc-500 text-sm">אנא בחר/י מומחה מרשימת המומחים על מנת להציג את היומן ולקבוע תור.</p>
      </div>
      <button onClick={() => navigate('/')} className="gold-gradient px-8 py-4 rounded-2xl text-black font-black">
        חזרה לדף הבית
      </button>
    </div>
  );

  if (!master) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 space-y-8 pb-20 RTL" style={{ direction: 'rtl' }}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">הזמנת תור 🗓️</h1>
        <p className="text-zinc-400">מומחה: <span className="text-white font-medium">{master.business_name || master.full_name}</span></p>
      </div>

      {!selectedService ? (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest">בחר/י טיפול</h3>
            {loadingServices ? (
              <div className="h-20 bg-zinc-900 rounded-xl animate-pulse" />
            ) : services.length > 0 ? (
              services.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => setSelectedService(svc)}
                  className="w-full text-right bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:border-yellow-500/50 transition flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-lg">{svc.name}</div>
                    <div className="text-zinc-500 text-sm">{svc.duration_mins} דקות</div>
                  </div>
                  <div className="text-yellow-500 font-black">₪{svc.price}</div>
                </button>
              ))
            ) : (
              <div className="text-center py-10 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                המומחה טרם הוסיף טיפולים
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <div className="text-sm text-yellow-500 font-bold mb-1">טיפול שנבחר</div>
                <div className="font-bold">{selectedService.name} (₪{selectedService.price})</div>
              </div>
              <button onClick={() => setSelectedService(null)} className="text-xs bg-zinc-800 px-3 py-1.5 rounded-lg text-white">שנה</button>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-500 uppercase tracking-widest">בחר/י תאריך</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest">שעות פנויות</h3>
              <div className="grid grid-cols-3 gap-3">
                {loadingSlots ? (
                   [1,2,3].map(i => <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse" />)
                ) : slots.length > 0 ? (
                  slots.map((slot) => {
                    const time = new Date(slot.slot_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
                    return (
                      <button
                        key={slot.slot_time}
                        onClick={() => handleBook(slot.slot_time)}
                        disabled={bookingStatus === 'loading'}
                        className="bg-zinc-900 border border-zinc-800 hover:border-yellow-500 py-3 rounded-xl text-white font-medium active:scale-95 disabled:opacity-50"
                      >
                        {time}
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-3 text-center py-10 text-zinc-600 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                    אין תורים פנויים ביום זה
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {bookingStatus === 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center space-y-4">
              <div className="w-20 h-20 bg-green-500/20 rounded-full mx-auto flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="text-2xl font-bold text-white">התור אושר בהצלחה!</h2>
              <p className="text-zinc-400">שלחנו לו הודעה. נתראה!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Booking;
