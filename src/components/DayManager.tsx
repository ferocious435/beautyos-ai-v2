import { useEffect, useMemo, useState } from 'react';
import { telegramAuthHeaders } from '../lib/telegramAuth';

interface DayManagerProps {
  date: string;
  onClose: () => void;
  onUpdate: () => void;
}

const normalizeTime = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  return value.slice(0, 5);
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export function DayManager({ date, onClose, onUpdate }: DayManagerProps) {
  const [isWorking, setIsWorking] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selectedDayLabel = useMemo(
    () => new Date(`${date}T00:00:00`).toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' }),
    [date],
  );

  const previewSlots = useMemo(() => {
    const slots = [];
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    for (let hour = 8; hour <= 22; hour += 1) {
      const time = `${String(hour).padStart(2, '0')}:00`;
      const minutes = hour * 60;
      slots.push({ time, isOpen: isWorking && minutes >= start && minutes < end });
    }

    return slots;
  }, [endTime, isWorking, startTime]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/services?action=get-day-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
      body: JSON.stringify({ date }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'schedule_load_failed');
        return data.schedule;
      })
      .then((schedule) => {
        if (cancelled) return;
        setIsWorking(Boolean(schedule?.is_working));
        setStartTime(normalizeTime(schedule?.start_time, '09:00'));
        setEndTime(normalizeTime(schedule?.end_time, '19:00'));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('DAY_MANAGER: Failed to load schedule:', err);
        setMessage('לא הצלחנו לטעון את שעות העבודה. אפשר לנסות שוב בעוד רגע.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const saveSchedule = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/services?action=save-day-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
        body: JSON.stringify({ date, isWorking, startTime, endTime }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'schedule_save_failed');

      setMessage('שעות העבודה נשמרו. הלקוחות יראו שעות פנויות לפי ההגדרה הזו.');
      onUpdate();
      setTimeout(onClose, 700);
    } catch (err) {
      console.error('DAY_MANAGER: Failed to save schedule:', err);
      setMessage('לא הצלחנו לשמור. כדאי לבדוק ששעת הסיום אחרי שעת ההתחלה.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:rounded-3xl" dir="rtl">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-white">שעות עבודה</h2>
            <p className="mt-1 text-sm text-slate-400">
              ההגדרה הזו תחול על כל יום {selectedDayLabel.split(' ')[0]} בשבוע.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/5 px-3 py-2 text-slate-400 hover:text-white">
            סגירה
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center font-bold text-emerald-400">טוען שעות עבודה...</div>
        ) : (
          <div className="space-y-5">
            {message ? (
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                {message}
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-2xl bg-slate-800/60 p-4">
              <div>
                <div className="font-black text-white">היום הזה פתוח ללקוחות?</div>
                <div className="mt-1 text-xs text-slate-500">אם סוגרים אותו, לא יוצגו שעות פנויות ליום השבוע הזה.</div>
              </div>
              <button
                onClick={() => setIsWorking((current) => !current)}
                className={`min-h-11 rounded-full px-5 font-black transition-all ${isWorking ? 'bg-emerald-400 text-slate-950' : 'bg-rose-500 text-white'}`}
              >
                {isWorking ? 'פתוח' : 'סגור'}
              </button>
            </div>

            {isWorking ? (
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="block text-xs font-bold text-slate-500">תחילת יום</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-4 font-bold text-white outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold text-slate-500">סיום יום</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-800 p-4 font-bold text-white outline-none focus:border-emerald-400"
                  />
                </label>
              </div>
            ) : null}

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400">תצוגה מהירה של היום</h3>
              <div className="grid grid-cols-3 gap-2">
                {previewSlots.map((slot) => (
                  <div
                    key={slot.time}
                    className={`rounded-xl border p-2 text-center text-xs font-bold ${
                      slot.isOpen
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-slate-700 bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {slot.time}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={saveSchedule}
              disabled={saving}
              className="min-h-12 w-full rounded-2xl bg-emerald-400 py-4 font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-60"
            >
              {saving ? 'שומר...' : 'שמירת שעות עבודה'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
