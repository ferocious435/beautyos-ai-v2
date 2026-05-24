import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { telegramAuthHeaders } from '../lib/telegramAuth';
import { useAppStore, useEffectiveRole } from '../store/useAppStore';
import type { Booking } from '../types/database';

const {
  ChevronLeft,
  ChevronRight,
  Clock,
  Move,
  Trash2,
} = Lucide as any;

const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const MasterCalendar = () => {
  const navigate = useNavigate();
  const appUser = useAppStore((state) => state.user);
  const effectiveRole = useEffectiveRole();
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const hours = Array.from({ length: 15 }, (_, index) => index + 8);

  useEffect(() => {
    const fetchBookings = async () => {
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
          body: JSON.stringify({
            role: effectiveRole === 'admin' ? 'admin' : 'master',
            date: selectedDate.toISOString(),
            viewMode,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'לא הצלחנו לטעון את היומן');
        setBookings(data.bookings || []);
      } catch (error) {
        console.error('CALENDAR: Fetch error:', error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [appUser.id, effectiveRole, selectedDate, viewMode]);

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('לבטל את התור הזה?')) return;

    const response = await fetch('/api/services?action=cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
      body: JSON.stringify({ bookingId, userId: appUser.id, role: 'master' }),
    });

    if (response.ok) {
      setBookings((current) => current.map((booking) => (
        booking.id === bookingId ? { ...booking, status: 'cancelled_by_master' } : booking
      )));
    }
  };

  const handleReschedule = (booking: Booking) => {
    navigate(`/order?masterId=${booking.master?.telegram_id}&rescheduleId=${booking.id}`);
  };

  const getDateStrip = () => {
    const dates = [];
    for (let index = -2; index < 12; index += 1) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + index);
      dates.push(nextDate);
    }
    return dates;
  };

  const isSelected = (date: Date) => date.toDateString() === selectedDate.toDateString();

  const getMinuteOffset = (dateStr: string) => {
    const date = new Date(dateStr);
    return (date.getHours() - 8) * 60 + date.getMinutes();
  };

  const getBookingDurationMinutes = (booking: Booking) => {
    const start = new Date(booking.start_time).getTime();
    const end = new Date(booking.end_time).getTime();

    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return Math.max(Math.round((end - start) / 60000), 15);
    }

    return Math.max(booking.service?.duration_mins || 60, 15);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const moveMonth = (direction: -1 | 1) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const renderMonthGrid = () => {
    const daysCount = getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    const firstDay = getFirstDayOfMonth(selectedDate.getFullYear(), selectedDate.getMonth());
    const days: Array<Date | null> = [];

    for (let index = 0; index < firstDay; index += 1) days.push(null);
    for (let day = 1; day <= daysCount; day += 1) {
      days.push(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day));
    }

    return (
      <div className="grid grid-cols-7 gap-1 p-2">
        {dayNames.map((dayName) => (
          <div key={dayName} className="py-2 text-center text-[10px] font-bold text-zinc-600">
            {dayName}
          </div>
        ))}

        {days.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="aspect-square" />;

          const dayBookings = bookings.filter((booking) => new Date(booking.start_time).toDateString() === day.toDateString());
          const isSelectedDay = day.toDateString() === selectedDate.toDateString();

          return (
            <button
              key={`${day.toISOString()}-${index}`}
              onClick={() => {
                setSelectedDate(day);
                setViewMode('day');
              }}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-all ${
                isSelectedDay ? 'border-yellow-500 bg-yellow-500 text-black' : 'border-white/5 bg-zinc-900/50 text-zinc-400'
              }`}
            >
              <span className="text-sm font-bold">{day.getDate()}</span>
              {dayBookings.length > 0 ? (
                <div className={`absolute bottom-1.5 h-1 w-1 rounded-full ${isSelectedDay ? 'bg-black' : 'bg-yellow-500 animate-pulse'}`} />
              ) : null}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="telegram-safe-page min-h-screen bg-[#050508] px-4 pb-32 text-white" dir="rtl">
      <header className="mb-6 space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
          <h1 className="text-2xl font-black">
            {effectiveRole === 'admin' ? 'יומן המערכת' : 'יומן התורים'}
          </h1>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            כאן רואים את התורים לפי שעה אמיתית, כולל משך הטיפול שנבחר.
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-zinc-900/80 p-1">
          <button
            onClick={() => setViewMode('day')}
            className={`min-h-11 rounded-xl px-4 py-2 text-sm font-black transition-all ${viewMode === 'day' ? 'bg-white text-black shadow-lg' : 'text-zinc-400'}`}
          >
            יום
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`min-h-11 rounded-xl px-4 py-2 text-sm font-black transition-all ${viewMode === 'month' ? 'bg-white text-black shadow-lg' : 'text-zinc-400'}`}
          >
            חודש
          </button>
        </div>
      </header>

      {viewMode === 'month' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-premium overflow-hidden rounded-3xl border border-white/5">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-4">
            <button aria-label="החודש הקודם" onClick={() => moveMonth(-1)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/20">
              <ChevronRight size={20} />
            </button>
            <div className="font-bold">{selectedDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</div>
            <button aria-label="החודש הבא" onClick={() => moveMonth(1)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/20">
              <ChevronLeft size={20} />
            </button>
          </div>
          {renderMonthGrid()}
        </motion.div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto py-2">
            {getDateStrip().map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex h-16 w-12 flex-shrink-0 flex-col items-center justify-center rounded-2xl transition-all ${
                  isSelected(date) ? 'scale-110 bg-yellow-500 font-black text-black shadow-xl' : 'border border-white/5 bg-zinc-900 text-zinc-500'
                }`}
              >
                <span className="text-[8px] font-bold uppercase">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                <span className="text-lg font-black">{date.getDate()}</span>
              </button>
            ))}
          </div>

          <div className="relative pt-4">
            {hours.map((hour) => (
              <div key={hour} className="flex h-[80px] border-t border-white/5">
                <div className="w-12 -mt-2.5 text-[10px] font-bold text-zinc-600">{hour.toString().padStart(2, '0')}:00</div>
                <div className="flex-1" />
              </div>
            ))}

            <div className="absolute left-0 right-12 top-4 h-full">
              {!loading && bookings.map((booking) => {
                const top = (getMinuteOffset(booking.start_time) / 60) * 80;
                const durationMinutes = getBookingDurationMinutes(booking);
                const height = Math.max((durationMinutes / 60) * 80, 56);
                const startLabel = new Date(booking.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                const endLabel = new Date(booking.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ top, height, zIndex: 10 }}
                    className={`absolute left-1 right-1 flex flex-col justify-between rounded-2xl border p-3 ${
                      booking.status === 'confirmed' ? 'border-green-500/30 bg-zinc-900' : 'border-white/10 bg-zinc-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="truncate text-xs font-bold">{booking.client?.full_name || 'לקוחה'}</div>
                        <div className="text-[9px] text-zinc-500">
                          {effectiveRole === 'admin'
                            ? `מאסטר: ${booking.master?.full_name || 'ללא שם'}`
                            : (booking.service?.name || 'טיפול אישי')}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button aria-label="הזזת תור" onClick={() => handleReschedule(booking)} className="rounded-lg bg-white/5 p-1.5 text-zinc-400 hover:text-white">
                          <Move size={12} />
                        </button>
                        <button aria-label="ביטול תור" onClick={() => handleCancel(booking.id)} className="rounded-lg bg-red-500/10 p-1.5 text-red-500 hover:bg-red-500/20">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-yellow-500">
                      <Clock size={10} />
                      {startLabel} - {endLabel}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && viewMode === 'day' && bookings.length === 0 ? (
        <div className="glass-premium mt-10 rounded-[40px] border border-dashed border-zinc-800 py-20 text-center">
          <h3 className="font-bold text-zinc-500">אין תורים רשומים ביום הזה</h3>
        </div>
      ) : null}
    </div>
  );
};

export default MasterCalendar;
