import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAppStore } from '../store/useAppStore';
import * as Lucide from 'lucide-react';

const { 
  Clock,
  ChevronRight,
  ChevronLeft,
  Move,
  Trash2
} = Lucide as any;

const MasterCalendar = () => {
  const navigate = useNavigate();
  const appUser = useAppStore(state => state.user);
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Hours to display (08:00 to 22:00)
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);


  useEffect(() => {
    const fetchBookings = async () => {
      // ✅ ROOT/ADMIN BYPASS (v2.2.1)
      if (!appUser.id) return;
      setLoading(true);
      
      let query = supabase
          .from('bookings')
          .select('*, client:client_id (full_name, phone), master:master_id (full_name, telegram_id)');

      if (viewMode === 'day') {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.gte('start_time', startOfDay.toISOString()).lte('start_time', endOfDay.toISOString());
      } else {
        // Month View: Fetch all for current month
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);
        query = query.gte('start_time', startOfMonth.toISOString()).lte('start_time', endOfMonth.toISOString());
      }

      // Security: If not admin, see only own master bookings
      if (appUser.role !== 'admin') {
        query = query.eq('master_id', appUser.id);
      }

      try {
        const { data, error } = await query.order('start_time', { ascending: true });
        if (error) throw error;
        setBookings(data || []);
      } catch (err) {
        console.error('CALENDAR: Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [appUser.id, selectedDate, viewMode, appUser.role]);

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('האם לבטל את התור?')) return;
    const { error } = await supabase.from('bookings').update({ status: 'cancelled_by_master' }).eq('id', bookingId);
    if (!error) setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled_by_master' } : b));
  };

  const handleReschedule = (booking: any) => {
    navigate(`/order?masterId=${booking.master?.telegram_id}&rescheduleId=${booking.id}`);
  };

  const getDateStrip = () => {
    const dates = [];
    for (let i = -2; i < 12; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();

  const getMinuteOffset = (dateStr: string) => {
    const d = new Date(dateStr);
    return (d.getHours() - 8) * 60 + d.getMinutes();
  };

  // --- MONTH GRID LOGIC ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderMonthGrid = () => {
    const daysCount = getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    const firstDay = getFirstDayOfMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    const days = [];
    
    // Empty cells for alignment
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysCount; i++) days.push(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i));

    return (
      <div className="grid grid-cols-7 gap-1 p-2">
        {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-zinc-600 py-2">{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} className="aspect-square" />;
          const dayBookings = bookings.filter(b => new Date(b.start_time).toDateString() === d.toDateString());
          const isSelectedDay = d.toDateString() === selectedDate.toDateString();
          
          return (
            <button
              key={i}
              onClick={() => { setSelectedDate(d); setViewMode('day'); }}
              className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative transition-all ${
                isSelectedDay ? 'bg-yellow-500 border-yellow-500 text-black' : 'bg-zinc-900/50 border-white/5 text-zinc-400'
              }`}
            >
              <span className="text-sm font-bold">{d.getDate()}</span>
              {dayBookings.length > 0 && (
                <div className={`w-1 h-1 rounded-full absolute bottom-1.5 ${isSelectedDay ? 'bg-black' : 'bg-yellow-500 animate-pulse'}`} />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 pb-32 RTL" style={{ direction: 'rtl' }}>
      <header className="flex justify-between items-center mb-6 pt-4">
        <div>
           <h1 className="text-2xl font-black">יומן {appUser.role === 'admin' ? 'מערכת 🏰' : 'תורים 🗓️'}</h1>
           <p className="text-zinc-500 text-xs">ניהול לו״ז וזמינות בזמן אמת</p>
        </div>
        <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5">
           <button 
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-white text-black shadow-lg' : 'text-zinc-500'}`}
           >
             יום
           </button>
           <button 
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white text-black shadow-lg' : 'text-zinc-500'}`}
           >
             חודש
           </button>
        </div>
      </header>

      {viewMode === 'month' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-premium rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
             <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}><ChevronRight size={20}/></button>
             <div className="font-bold">{selectedDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</div>
             <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}><ChevronLeft size={20}/></button>
          </div>
          {renderMonthGrid()}
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Date Strip */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {getDateStrip().map((date, i) => (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 w-12 h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  isSelected(date) ? 'bg-yellow-500 text-black font-black scale-110 shadow-xl' : 'bg-zinc-900 border border-white/5 text-zinc-500'
                }`}
              >
                <span className="text-[8px] uppercase font-bold">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                <span className="text-lg font-black">{date.getDate()}</span>
              </button>
            ))}
          </div>

          {/* Timeline View */}
          <div className="relative pt-4">
            {hours.map(hour => (
              <div key={hour} className="flex h-[80px] border-t border-white/5">
                <div className="w-12 -mt-2.5 text-[10px] font-bold text-zinc-600">{hour.toString().padStart(2, '0')}:00</div>
                <div className="flex-1" />
              </div>
            ))}

            {/* Bookings Overlay */}
            <div className="absolute top-4 right-12 left-0 h-full">
              {!loading && bookings.map(booking => {
                const top = (getMinuteOffset(booking.start_time) / 60) * 80;
                const height = 80; // Fixed 1h for UI
                
                return (
                  <motion.div
                    key={booking.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ top, height, zIndex: 10 }}
                    className={`absolute right-1 left-1 p-3 rounded-2xl border flex flex-col justify-between ${
                      booking.status === 'confirmed' ? 'bg-zinc-900 border-green-500/30' : 'bg-zinc-900/80 border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold truncate">{booking.client?.full_name || 'לקוח/ה'}</div>
                        <div className="text-[8px] text-zinc-500 uppercase tracking-tighter">
                          {appUser.role === 'admin' ? `מאסטר: ${booking.master?.full_name}` : 'טיפול אישי'}
                        </div>
                      </div>
                      <div className="flex gap-1">
                         <button onClick={() => handleReschedule(booking)} className="p-1.5 bg-white/5 rounded-lg text-zinc-400 hover:text-white"><Move size={12} /></button>
                         <button onClick={() => handleCancel(booking.id)} className="p-1.5 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500/20"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-yellow-500">
                      <Clock size={10} />
                      {new Date(booking.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && viewMode === 'day' && bookings.length === 0 && (
        <div className="mt-10 py-20 text-center glass-premium rounded-[40px] border border-dashed border-zinc-800">
           <h3 className="font-bold text-zinc-500">אין תורים רשומים ליום זה</h3>
        </div>
      )}
    </div>
  );
};

export default MasterCalendar;
