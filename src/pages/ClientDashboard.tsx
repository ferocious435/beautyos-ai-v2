import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAppStore } from '../store/useAppStore';
import * as Lucide from 'lucide-react';

const { 
  Calendar, 
  MapPin, 
  Bell, 
  Clock, 
  Navigation 
} = Lucide as any;

const ClientDashboard = () => {
  const navigate = useNavigate();
  const appUser = useAppStore(state => state.user);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyBookings = async () => {
      if (!appUser.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*, master:master_id (business_name, full_name, address, latitude, longitude)')
          .eq('client_id', appUser.id)
          .order('start_time', { ascending: true });

        if (error) throw error;
        setBookings(data || []);
      } catch (err) {
        console.error('CLIENT DASHBOARD: Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyBookings();
  }, [appUser.id]);

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('האם את/ה בטוח/ה שברצונך לבטל את התור? המאסטר יקבל הודעה על כך.')) return;
    
    try {
      const response = await fetch('/api/services?action=cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, userId: appUser.id, role: 'client' })
      });
      
      if (response.ok) {
        setBookings(prev => prev.filter(b => b.id !== bookingId));
      } else {
        throw new Error('Cancel failed');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      alert('שגיאה בביטול התור');
    }
  };

  const upcoming = bookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && new Date(b.start_time) > new Date())[0];
  const others = bookings.filter(b => b.id !== upcoming?.id);

  const getDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 pb-24 RTL" style={{ direction: 'rtl' }}>
      <header className="py-8 text-right">
        <h1 className="text-3xl font-black mb-1">היי, <span className="gold-text">{appUser.name.split(' ')[0]}</span></h1>
        <p className="text-zinc-500">הנה התורים שלך ב-BeautyOS</p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 bg-zinc-900 rounded-3xl animate-pulse" />
          <div className="h-20 bg-zinc-900 rounded-2xl animate-pulse" />
        </div>
      ) : upcoming ? (
        <section className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">התור הקרוב ביותר ✨</h3>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-premium p-6 rounded-[32px] border border-white/5 bg-gradient-to-br from-yellow-500/10 to-transparent"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black">{upcoming.master.business_name || upcoming.master.full_name}</h2>
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <MapPin size={14} />
                  <span>{upcoming.master.address || 'לא צוינה כתובת'}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-yellow-500">
                <Calendar size={24} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Clock size={10} /> שעה
                </div>
                <div className="text-xl font-black">
                  {new Date(upcoming.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <Bell size={10} /> סטטוס
                </div>
                <div className={`text-xs font-bold ${upcoming.status === 'confirmed' ? 'text-green-500' : 'text-yellow-500'}`}>
                   {upcoming.status === 'confirmed' ? 'מאושר' : 'ממתין לאישור מאסטר'}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => upcoming.status === 'confirmed' && getDirections(upcoming.master.latitude, upcoming.master.longitude)}
                style={{ opacity: upcoming.status === 'confirmed' ? 1 : 0.5 }}
                className="flex-[2] bg-white text-black py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all text-sm disabled:opacity-50"
              >
                <Navigation size={18} /> {upcoming.status === 'confirmed' ? 'ניווט' : 'ממתין'}
              </button>
              <button 
                onClick={() => navigate(`/order?masterId=${upcoming.master.telegram_id}&rescheduleId=${upcoming.id}`)}
                className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-black active:scale-95 transition-all text-sm border border-white/5"
              >
                הזזה
              </button>
              <button 
                onClick={() => handleCancel(upcoming.id)}
                className="px-4 bg-red-500/10 text-red-500 py-4 rounded-2xl font-black active:scale-95 transition-all text-sm border border-red-500/20"
              >
                ביטול
              </button>
            </div>
          </motion.div>
        </section>
      ) : (
        <section className="mb-8 text-center py-20 bg-zinc-900/20 rounded-[40px] border border-dashed border-zinc-800">
            <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-4">
              <Calendar size={32} className="text-zinc-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">אין לך תורים פעילים</h3>
            <p className="text-zinc-500 text-sm mb-6">רוצה להזמין טיפול חדש בסטייל?</p>
            <button 
              onClick={() => navigate('/discovery')}
              className="gold-gradient px-8 py-4 rounded-full text-black font-black"
            >
              מצא מאסטר קרוב 📍
            </button>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">כל התורים שלי</h3>
          <div className="space-y-3">
            {others.map(booking => (
              <div key={booking.id} className="glass-premium p-4 rounded-2xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-zinc-500">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{booking.master.business_name || booking.master.full_name}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(booking.start_time).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} • {new Date(booking.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className={`text-[10px] font-black uppercase px-2 py-1 rounded ${booking.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-400'}`}>
                  {booking.status === 'confirmed' ? 'מאושר' : 'עבר'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ClientDashboard;
