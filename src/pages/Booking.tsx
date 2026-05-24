import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getTelegramInitData, getTelegramUserId, telegramAuthHeaders } from '../lib/telegramAuth';

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const masterId = searchParams.get('masterId');
  const rescheduleId = searchParams.get('rescheduleId');

  const [master, setMaster] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bookingErrorMessage, setBookingErrorMessage] = useState('לא הצלחנו להשלים את הפעולה. אפשר לנסות שוב בעוד רגע.');

  useEffect(() => {
    if (!masterId) {
      navigate('/discovery', { replace: true });
    }
  }, [masterId, navigate]);

  useEffect(() => {
    const loadMasterAndServices = async () => {
      if (!masterId) {
        setLoadingServices(false);
        return;
      }

      setLoadingServices(true);
      setLoadError(null);

      try {
        const response = await fetch('/api/services?action=get-master-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
          body: JSON.stringify({
            masterTelegramId: Number(masterId),
            rescheduleId,
          }),
        });

        if (!response.ok) throw new Error('לא הצלחנו לטעון את פרטי המומחה');

        const data = await response.json();
        setMaster(data.master);
        setServices(data.services || []);

        if (data.selectedServiceId) {
          const found = (data.services || []).find((service: any) => service.id === data.selectedServiceId);
          if (found) setSelectedService(found);
        }
      } catch (err) {
        console.error('BOOKING: Load master error:', err);
        setLoadError('master_not_found');
      } finally {
        setLoadingServices(false);
      }
    };
    loadMasterAndServices();
  }, [masterId, rescheduleId]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!masterId || !selectedDate || !selectedService) return;

      setLoadingSlots(true);
      try {
        const response = await fetch('/api/services?action=get-available-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
          body: JSON.stringify({
            masterTelegramId: Number(masterId),
            date: selectedDate,
            serviceId: selectedService.id,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'לא הצלחנו לטעון שעות פנויות');
        const now = Date.now();
        setSlots((data.slots || []).filter((slot: any) => {
          const slotTime = new Date(slot.slot_time).getTime();
          return Number.isFinite(slotTime) && slotTime > now;
        }));
      } catch (err) {
        console.error('BOOKING: Slots API Error:', err);
        setSlots([]);
      }

      setLoadingSlots(false);
    };
    loadSlots();
  }, [masterId, selectedDate, selectedService]);

  const handleBook = async (slotTime: string) => {
    const tgId = getTelegramUserId() || (import.meta.env.DEV ? 12345678 : null);

    if (!masterId || !selectedService) return;
    if (!tgId) {
      setBookingStatus('error');
      return;
    }

    setBookingStatus('loading');
    setBookingErrorMessage('לא הצלחנו להשלים את הפעולה. אפשר לנסות שוב בעוד רגע.');

    try {
      const action = rescheduleId ? 'update-booking' : 'create-booking';

      const response = await fetch(`/api/services?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': getTelegramInitData(),
        },
        body: JSON.stringify({
          bookingId: rescheduleId,
          masterTelegramId: parseInt(masterId),
          clientTelegramId: tgId,
          serviceId: selectedService.id,
          startTime: slotTime,
        }),
      });

      if (response.ok) {
        setBookingStatus('success');
        setTimeout(() => navigate('/calendar'), 2500);
      } else {
        const errorData = await response.json();
        console.error('BOOKING: API Error:', errorData);
        if (typeof errorData?.error === 'string' && errorData.error.includes('passed')) {
          setBookingErrorMessage('השעה הזאת כבר עברה. בחרו מועד מאוחר יותר.');
        } else if (typeof errorData?.error === 'string' && errorData.error.includes('no longer available')) {
          setBookingErrorMessage('המועד הזה כבר לא פנוי. בחרו שעה אחרת.');
        }
        setBookingStatus('error');
      }
    } catch (err) {
      console.error('BOOKING: Fetch Error:', err);
      setBookingStatus('error');
    }
  };

  if (!masterId) return (
    <div className="telegram-safe-page flex min-h-screen flex-col items-center justify-center space-y-6 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 text-3xl text-yellow-500">!</div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">לא נבחר מומחה</h2>
        <p className="text-sm text-zinc-500">בחרו מומחה מתוך הרשימה כדי לראות שעות פנויות ולקבוע תור.</p>
      </div>
      <button onClick={() => navigate('/discovery')} className="gold-gradient rounded-2xl px-8 py-4 font-black text-black">
        בחירת מומחה
      </button>
    </div>
  );

  if (loadingServices) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
    </div>
  );

  if (!master || loadError) return (
    <div className="telegram-safe-page flex min-h-screen flex-col items-center justify-center space-y-6 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-3xl text-red-400">!</div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-white">המומחה לא נמצא</h2>
        <p className="text-sm text-zinc-500">יכול להיות שהקישור ישן או שהפרופיל עדיין לא פעיל.</p>
      </div>
      <button onClick={() => navigate('/discovery')} className="gold-gradient rounded-2xl px-8 py-4 font-black text-black">
        חיפוש מומחה אחר
      </button>
    </div>
  );

  return (
    <div className="telegram-safe-page space-y-8 px-4 pb-24 text-white" dir="rtl">
      <div className="space-y-2">
        <h1 className="text-2xl font-black">{rescheduleId ? 'שינוי מועד תור' : 'קביעת תור'}</h1>
        <p className="text-zinc-400">מומחה: <span className="font-medium text-white">{master.business_name || master.full_name}</span></p>
      </div>

      {rescheduleId && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">↻</span>
          <span>בחרו מועד חדש לתור הקיים.</span>
        </div>
      )}

      {!selectedService ? (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-sm font-bold tracking-widest text-zinc-500">בחרו טיפול</h3>
            {loadingServices ? (
              <div className="h-20 animate-pulse rounded-xl bg-zinc-900" />
            ) : services.length > 0 ? (
              services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => setSelectedService(svc)}
                  className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-right transition active:scale-[0.98]"
                >
                  <div>
                    <div className="text-lg font-bold">{svc.name}</div>
                    <div className="text-sm text-zinc-500">{svc.duration_mins} דקות</div>
                  </div>
                  <div className="font-black text-yellow-500">₪{svc.price}</div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 py-10 text-center text-zinc-500">
                המומחה עדיין לא הוסיף טיפולים.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="flex items-center justify-between rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <div>
                <div className="mb-1 text-sm font-bold text-yellow-500">הטיפול שנבחר</div>
                <div className="font-bold">{selectedService.name} (₪{selectedService.price})</div>
              </div>
              {!rescheduleId && <button onClick={() => setSelectedService(null)} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-white">שינוי</button>}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold tracking-widest text-zinc-500">בחרו תאריך</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold tracking-widest text-zinc-500">שעות פנויות</h3>
              <div className="grid grid-cols-3 gap-3">
                {loadingSlots ? (
                  [1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-zinc-900" />)
                ) : slots.length > 0 ? (
                  slots.map((slot) => {
                    const time = new Date(slot.slot_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
                    return (
                      <button
                        key={slot.slot_time}
                        onClick={() => handleBook(slot.slot_time)}
                        disabled={bookingStatus === 'loading'}
                        className="rounded-xl border border-zinc-800 bg-zinc-900 py-3 font-medium text-white active:scale-95 disabled:opacity-50"
                      >
                        {time}
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-3 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 py-10 text-center text-zinc-600">
                    אין תורים פנויים ביום הזה.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {bookingStatus === 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-4xl text-green-400">✓</div>
              <h2 className="text-2xl font-bold text-white">{rescheduleId ? 'התור הוזז בהצלחה' : 'בקשת התור נשלחה'}</h2>
              <p className="text-zinc-400">נשלחה הודעה למאסטר. נעדכן אותך כשהתור יאושר.</p>
            </motion.div>
          </motion.div>
        )}

        {bookingStatus === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} title={bookingErrorMessage} className="fixed inset-x-4 bottom-28 z-[100] rounded-2xl border border-red-500/30 bg-red-500/15 p-4 text-center text-sm text-red-100">
            לא הצלחנו להשלים את הפעולה כרגע. נסו שוב בעוד רגע.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Booking;
