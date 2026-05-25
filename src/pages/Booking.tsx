import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getTelegramUserId, telegramAuthHeadersWithPreview } from '../lib/telegramAuth';
import { useAppStore, useEffectiveRole } from '../store/useAppStore';
import { displayProviderName } from '../lib/displayNames';

const defaultBookingError = 'לא הצלחנו להשלים את הפעולה. אפשר לנסות שוב בעוד רגע.';

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const previewRole = useAppStore((state) => state.previewRole);
  const effectiveRole = useEffectiveRole();
  const apiPreviewRole = previewRole || effectiveRole;
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
  const [bookingErrorMessage, setBookingErrorMessage] = useState(defaultBookingError);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);

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
          headers: { 'Content-Type': 'application/json', ...telegramAuthHeadersWithPreview(apiPreviewRole) },
          body: JSON.stringify({
            masterTelegramId: Number(masterId),
            rescheduleId,
            previewRole: apiPreviewRole,
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
  }, [apiPreviewRole, masterId, rescheduleId]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!masterId || !selectedDate || !selectedService) return;

      setLoadingSlots(true);
      try {
        const response = await fetch('/api/services?action=get-available-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...telegramAuthHeadersWithPreview(apiPreviewRole) },
          body: JSON.stringify({
            masterTelegramId: Number(masterId),
            date: selectedDate,
            serviceId: selectedService.id,
            previewRole: apiPreviewRole,
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
      } finally {
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [apiPreviewRole, masterId, selectedDate, selectedService]);

  const handleBook = async (slotTime: string) => {
    const tgId = getTelegramUserId() || (import.meta.env.DEV ? 12345678 : null);

    if (!masterId || !selectedService) return;
    if (!tgId) {
      setBookingErrorMessage(defaultBookingError);
      setBookingStatus('error');
      return;
    }

    setBookingStatus('loading');
    setBookingErrorMessage(defaultBookingError);

    try {
      const action = rescheduleId ? 'update-booking' : 'create-booking';
      const response = await fetch(`/api/services?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...telegramAuthHeadersWithPreview(apiPreviewRole),
        },
        body: JSON.stringify({
          bookingId: rescheduleId,
          masterTelegramId: parseInt(masterId),
          clientTelegramId: tgId,
          serviceId: selectedService.id,
          startTime: slotTime,
          previewRole: apiPreviewRole,
        }),
      });

      if (response.ok) {
        setBookingStatus('success');
        return;
      }

      const errorData = await response.json().catch(() => null);
      console.error('BOOKING: API Error:', errorData);

      if (typeof errorData?.error === 'string' && errorData.error.includes('passed')) {
        setBookingErrorMessage('השעה הזאת כבר עברה. בחרו מועד מאוחר יותר.');
      } else if (typeof errorData?.error === 'string' && errorData.error.includes('no longer available')) {
        setBookingErrorMessage('המועד הזה כבר לא פנוי. בחרו שעה אחרת.');
      } else if (typeof errorData?.error === 'string' && errorData.error.includes('provider')) {
        setBookingErrorMessage('הפרופיל הזה לא זמין לקביעת תור. בחרו בעלת מקצוע אמיתית מהרשימה.');
      }

      setBookingStatus('error');
    } catch (err) {
      console.error('BOOKING: Fetch Error:', err);
      setBookingStatus('error');
    }
  };

  const selectedSlotLabel = selectedSlotTime
    ? new Date(selectedSlotTime).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    : '';

  if (!masterId) {
    return (
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
  }

  if (loadingServices) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  if (!master || loadError) {
    return (
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
  }

  return (
    <div className="telegram-safe-page space-y-8 px-4 pb-24 text-white" dir="rtl">
      <div className="space-y-2">
        <h1 className="text-2xl font-black">{rescheduleId ? 'שינוי מועד תור' : 'קביעת תור'}</h1>
        <p className="text-zinc-400">
          מומחה: <span className="font-medium text-white">{displayProviderName(master)}</span>
        </p>
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
                    {svc.description ? (
                      <div className="mt-2 text-sm leading-6 text-zinc-400">{svc.description}</div>
                    ) : null}
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
                <div className="font-bold">
                  {selectedService.name} (₪{selectedService.price})
                </div>
                {selectedService.description ? (
                  <div className="mt-2 text-sm leading-6 text-zinc-600">{selectedService.description}</div>
                ) : null}
              </div>
              {!rescheduleId && (
                <button onClick={() => setSelectedService(null)} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-white">
                  שינוי
                </button>
              )}
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
                    const time = new Date(slot.slot_time).toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    });

                    return (
                      <button
                        key={slot.slot_time}
                        onClick={() => setSelectedSlotTime(slot.slot_time)}
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
        {selectedSlotTime && bookingStatus !== 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
            <motion.div initial={{ scale: 0.94, y: 18 }} animate={{ scale: 1, y: 0 }} className="max-w-md space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900 p-7 text-right">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">{rescheduleId ? 'לאשר שינוי תור?' : 'לאשר בקשת תור?'}</h2>
                <p className="text-sm leading-6 text-zinc-400">
                  נשלח בקשה ל-{displayProviderName(master)} עבור {selectedService?.name} בתאריך {selectedSlotLabel}.
                  אחרי האישור של המאסטר תקבל/י הודעה בטלגרם.
                </p>
              </div>
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
                זו עדיין לא התחייבות סופית. עד שהמאסטר מאשר, התור יופיע אצלך כממתין לאישור.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => selectedSlotTime && handleBook(selectedSlotTime)}
                  disabled={bookingStatus === 'loading'}
                  className="rounded-2xl bg-white px-5 py-4 font-black text-black active:scale-95 disabled:opacity-50"
                >
                  {bookingStatus === 'loading' ? 'שולחים...' : rescheduleId ? 'אישור שינוי' : 'אישור בקשה'}
                </button>
                <button
                  onClick={() => setSelectedSlotTime(null)}
                  disabled={bookingStatus === 'loading'}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white active:scale-95 disabled:opacity-50"
                >
                  בחירת שעה אחרת
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {bookingStatus === 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="max-w-md space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-4xl text-green-400">✓</div>
              <h2 className="text-2xl font-bold text-white">{rescheduleId ? 'התור הוזז בהצלחה' : 'בקשת התור נשלחה'}</h2>
              <p className="text-zinc-400">
                {rescheduleId
                  ? 'השינוי נשלח למאסטר לאישור מחדש. עד האישור הסופי התור יסומן כממתין.'
                  : 'הבקשה נשלחה למאסטר. עד שהמאסטר יאשר, התור יופיע אצלך כממתין לאישור.'}
              </p>
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-right text-sm leading-6 text-yellow-100">
                <div className="mb-2 font-black">מה קורה עכשיו?</div>
                <div>1. המאסטר מקבל הודעה עם פרטי הבקשה.</div>
                <div>2. אחרי אישור תקבל/י הודעה בטלגרם.</div>
                <div>3. תמיד אפשר לבדוק, להזיז או לבטל מתוך “התורים שלי”.</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => navigate('/calendar')}
                  className="rounded-2xl bg-white px-5 py-4 font-black text-black active:scale-95"
                >
                  התורים שלי
                </button>
                <button
                  onClick={() => navigate('/discovery')}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black text-white active:scale-95"
                >
                  קביעת תור נוסף
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {bookingStatus === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-x-4 bottom-28 z-[100] rounded-2xl border border-red-500/30 bg-red-500/15 p-4 text-center text-sm text-red-100">
            {bookingErrorMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Booking;
