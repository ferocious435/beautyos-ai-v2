import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAppStore } from '../store/useAppStore';
import * as Lucide from 'lucide-react';

const { 
  Clock 
} = Lucide as any;

const MasterCalendar = () => {
  const appUser = useAppStore(state => state.user);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Hours to display (08:00 to 22:00)
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDayBookings = async () => {
      if (!appUser.id) return;
      setLoading(true);
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, client:client_id (full_name, phone)')
          .eq('master_id', appUser.id)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .order('start_time', { ascending: true });

        if (error) throw error;
        setBookings(data || []);
      } catch (err) {
        console.error('CALENDAR: Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDayBookings();
  }, [appUser.id, selectedDate]);

  const getDateStrip = () => {
    const dates = [];
    for (let i = -2; i < 12; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) => d.toDateString() === selectedDate.toDateString();

  const getMinuteOffset = (dateStr: string) => {
    const d = new Date(dateStr);
    return (d.getHours() - 8) * 60 + d.getMinutes();
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white RTL" style={{ direction: 'rtl' }}>
      {/* Date Strip */}
      <div className="sticky top-0 z-50 bg-[#0c0c0e]/80 backdrop-blur-xl border-b border-white/5 pt-6 pb-4">
        <div className="px-4 mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">היומן שלי 🗓️</h2>
          <div className="text-sm font-bold text-yellow-500">
            {selectedDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        
        <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar pb-2">
          {getDateStrip().map((date, i) => (
            <button
              key={i}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 w-14 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                isSelected(date) 
                ? 'bg-yellow-500 text-black font-black scale-105 shadow-lg shadow-yellow-500/20' 
                : 'bg-white/5 text-zinc-500 border border-white/5'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-tighter">
                {date.toLocaleDateString('he-IL', { weekday: 'short' })}
              </span>
              <span className="text-xl font-black">{date.getDate()}</span>
              {isToday(date) && !isSelected(date) && <div className="w-1 h-1 bg-yellow-500 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline View */}
      <div className="p-4 relative pb-32">
        <div className="relative">
          {/* Hour Lines */}
          {hours.map(hour => (
            <div key={hour} className="flex items-start h-[80px] border-t border-white/5 relative">
              <div className="w-12 -mt-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-[#050508] pr-2">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1" />
            </div>
          ))}

          {/* Bookings Overlay */}
          <div className="absolute top-0 right-12 left-0 h-full">
            <AnimatePresence>
              {!loading && bookings.map(booking => {
                const top = (getMinuteOffset(booking.start_time) / 60) * 80;
                const duration = 60; // Default 1h for now
                const height = (duration / 60) * 80;

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ top, height }}
                    className="absolute right-2 left-2 p-3 rounded-2xl bg-gradient-to-l from-zinc-800 to-zinc-900 border border-white/10 shadow-xl overflow-hidden flex flex-col justify-center"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold text-white truncate max-w-[70%]">{booking.client?.full_name || 'לקוח/ה'}</div>
                      <div className="bg-green-500/20 text-green-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-green-500/20 uppercase tracking-widest">מאושר</div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <Clock size={10} />
                      <span>
                        {new Date(booking.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Current Time Indicator (Only if today) */}
            {isToday(selectedDate) && getMinuteOffset(currentTime.toISOString()) >= 0 && getMinuteOffset(currentTime.toISOString()) <= 14 * 60 && (
              <div 
                className="absolute right-0 left-0 flex items-center z-10"
                style={{ top: (getMinuteOffset(currentTime.toISOString()) / 60) * 80 }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -mr-1 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <div className="flex-1 h-[1px] bg-red-500/50" />
              </div>
            )}
          </div>
        </div>

        {!loading && bookings.length === 0 && (
          <div className="mt-10 py-20 text-center glass-premium rounded-[40px] border border-dashed border-zinc-800">
             <div className="w-16 h-16 bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-4">
                <Clock size={24} className="text-zinc-600" />
             </div>
             <h3 className="text-lg font-bold">אין תורים להיום</h3>
             <p className="text-zinc-500 text-sm">זמן מעולה לנוח или לעבוד על תוכן!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterCalendar;
