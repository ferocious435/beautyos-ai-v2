import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { telegramAuthHeaders } from '../lib/telegramAuth';
import { useAppStore } from '../store/useAppStore';
import { displayProviderName } from '../lib/displayNames';
import * as Lucide from 'lucide-react';

const { 
  BriefcaseBusiness,
  Calendar, 
  MapPin, 
  Bell, 
  Clock, 
  Navigation 
} = Lucide as any;

const activeStatuses = ['confirmed', 'pending'];

const ClientDashboard = () => {
  const navigate = useNavigate();
  const appUser = useAppStore(state => state.user);
  const previewRole = useAppStore(state => state.previewRole);
  const setUser = useAppStore(state => state.setUser);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [activatingMaster, setActivatingMaster] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');

  useEffect(() => {
    const fetchMyBookings = async () => {
      if (!appUser.id) {
        setBookings([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch('/api/services?action=get-my-bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
          body: JSON.stringify({ role: 'client' }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load bookings');
        setBookings(data.bookings || []);
      } catch (err) {
        console.error('CLIENT DASHBOARD: Fetch error:', err);
        setBookings([]);
      } finally {
        setNow(Date.now());
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
        headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
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

  const isActiveFutureBooking = (booking: any) =>
    activeStatuses.includes(booking.status) && new Date(booking.start_time).getTime() > now;

  const getStatusLabel = (booking: any) => {
    if (booking.status === 'confirmed') return 'מאושר';
    if (booking.status === 'pending') return 'ממתין לאישור';
    if (booking.status === 'cancelled_by_client' || booking.status === 'cancelled_by_master') return 'בוטל';
    if (new Date(booking.start_time).getTime() <= now) return 'עבר';
    return 'לא פעיל';
  };

  const upcoming = bookings.filter(isActiveFutureBooking)[0];
  const otherActiveBookings = bookings.filter(b => b.id !== upcoming?.id && isActiveFutureBooking(b));
  const others = bookings.filter(b => b.id !== upcoming?.id && !isActiveFutureBooking(b));
  const showBusinessInvite = appUser.role === 'client' && !previewRole && !loading && !upcoming && bookings.length === 0;

  const getDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleActivateMaster = async () => {
    if (!window.confirm('לעבור למצב בעל/ת עסק? אפשר יהיה להגדיר שירותים, מחירים ושעות עבודה.')) return;

    setActivatingMaster(true);
    setActivationMessage('');

    try {
      const response = await fetch('/api/services?action=activate-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'master_activation_failed');

      setUser({
        id: data.profile.id,
        name: data.profile.full_name || appUser.name,
        role: data.profile.role || 'master',
        subscriptionTier: data.profile.subscription_tier || appUser.subscriptionTier || 'free',
        avatar: data.profile.avatar_url,
      });
      navigate('/settings');
    } catch (err) {
      console.error('CLIENT DASHBOARD: Master activation error:', err);
      setActivationMessage('לא הצלחנו לפתוח מצב עסק כרגע. אפשר לנסות שוב בעוד רגע.');
    } finally {
      setActivatingMaster(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4 pb-24 RTL" style={{ direction: 'rtl' }}>
      <header className="py-8 text-right">
        <h1 className="text-3xl font-black mb-1">היי, <span className="gold-text">{appUser.name.split(' ')[0]}</span></h1>
        <p className="text-zinc-500">הנה התורים שלך ב-BeautyOS</p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/discovery')}
          className="min-h-20 rounded-[24px] bg-yellow-500 px-4 py-4 text-right text-black shadow-lg shadow-yellow-500/10 transition active:scale-[0.98]"
        >
          <div className="text-sm font-black">קביעת תור</div>
          <div className="mt-1 text-xs font-bold opacity-70">בחירת מומחה ושעה</div>
        </button>
        <button
          onClick={() => navigate('/calendar')}
          className="min-h-20 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-right text-white transition active:scale-[0.98]"
        >
          <div className="text-sm font-black">התורים שלי</div>
          <div className="mt-1 text-xs text-zinc-500">הזזה או ביטול</div>
        </button>
      </section>

      {showBusinessInvite ? (
      <section className="mb-6 rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
            <BriefcaseBusiness size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">יש לך עסק יופי או טיפוח?</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-50/80">
              אפשר לפתוח מצב מאסטר ולהגדיר שירותים, מחירים, שעות עבודה וקבלת תורים.
            </p>
            {activationMessage ? (
              <div className="mt-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
                {activationMessage}
              </div>
            ) : null}
            <button
              onClick={handleActivateMaster}
              disabled={activatingMaster}
              className="mt-4 min-h-11 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition active:scale-95 disabled:opacity-60"
            >
              {activatingMaster ? 'פותח מצב עסק...' : 'אני בעל/ת עסק - להתחיל'}
            </button>
          </div>
        </div>
      </section>
      ) : null}

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
                <h2 className="text-2xl font-black">{displayProviderName(upcoming.master)}</h2>
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

            {upcoming.status === 'pending' ? (
              <div className="mb-6 rounded-2xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
                הבקשה נשלחה למאסטר ומחכה לאישור. ברגע שהתור יאושר תקבל/י הודעה בטלגרם, ועד אז אפשר להזיז או לבטל מכאן.
              </div>
            ) : null}

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

      {otherActiveBookings.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">תורים פעילים נוספים</h3>
          <div className="space-y-3">
            {otherActiveBookings.map(booking => (
              <div key={booking.id} className="glass-premium p-4 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-zinc-500">
                      <Clock size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm">{displayProviderName(booking.master)}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(booking.start_time).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} • {new Date(booking.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded ${
                    booking.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {getStatusLabel(booking)}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/order?masterId=${booking.master.telegram_id}&rescheduleId=${booking.id}`)}
                    className="rounded-xl bg-white/5 py-3 text-xs font-black text-white active:scale-95"
                  >
                    הזזה
                  </button>
                  <button
                    onClick={() => handleCancel(booking.id)}
                    className="rounded-xl bg-red-500/10 py-3 text-xs font-black text-red-500 active:scale-95"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                    <div className="font-bold text-sm">{displayProviderName(booking.master)}</div>
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
