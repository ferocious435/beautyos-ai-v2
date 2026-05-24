import { useCallback, useEffect, useState } from 'react';
import { Check, Sparkles, User } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { telegramAuthHeaders } from '../lib/telegramAuth';
import { useAppStore, useEffectiveRole } from '../store/useAppStore';

interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_mins: number;
  is_active: boolean;
}

interface ServiceDraft {
  id: string | null;
  name: string;
  description: string;
  price: string;
  durationMins: string;
  isActive: boolean;
}

const emptyDraft: ServiceDraft = {
  id: null,
  name: '',
  description: '',
  price: '',
  durationMins: '60',
  isActive: true,
};

const Settings = () => {
  const { haptic } = useTelegram();
  const appUser = useAppStore((state) => state.user);
  const effectiveRole = useEffectiveRole();
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyDraft);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [screenMessage, setScreenMessage] = useState('');

  const isManager = effectiveRole === 'master' || effectiveRole === 'admin';

  const loadProfile = useCallback(async () => {
    const response = await fetch('/api/services?action=get-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
    });

    if (!response.ok) {
      throw new Error('profile_load_failed');
    }

    const { profile } = await response.json();
    setBusinessName(profile.business_name || '');
    setAddress(profile.address || '');
  }, []);

  const loadServices = useCallback(async () => {
    if (!isManager) {
      setServices([]);
      return;
    }

    const response = await fetch('/api/services?action=get-my-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
    });

    if (!response.ok) {
      throw new Error('services_load_failed');
    }

    const { services: nextServices } = await response.json();
    setServices(nextServices || []);
  }, [isManager]);

  useEffect(() => {
    const loadData = async () => {
      if (!appUser.id) {
        return;
      }

      try {
        await loadProfile();
        await loadServices();
      } catch (error) {
        console.error('SETTINGS: load error', error);
        setScreenMessage('לא הצלחנו לטעון את ההגדרות כרגע. אפשר לנסות שוב בעוד רגע.');
      }
    };

    loadData();
  }, [appUser.id, isManager, loadProfile, loadServices]);

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    setScreenMessage('');
    haptic('heavy');

    try {
      const response = await fetch('/api/services?action=save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
        body: JSON.stringify({ businessName, address }),
      });

      if (!response.ok) {
        throw new Error('profile_save_failed');
      }

      setScreenMessage('פרטי העסק נשמרו בהצלחה.');
    } catch (error) {
      console.error('SETTINGS: profile save error', error);
      setScreenMessage('לא הצלחנו לשמור את פרטי העסק. אפשר לנסות שוב.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleServiceSave = async () => {
    if (!serviceDraft.name.trim()) {
      setScreenMessage('כדאי לתת שם לשירות לפני ששומרים אותו.');
      return;
    }

    setIsSavingService(true);
    setScreenMessage('');
    haptic('light');

    try {
      const response = await fetch('/api/services?action=save-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
        body: JSON.stringify(serviceDraft),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'service_save_failed');
      }

      await loadServices();
      setServiceDraft(emptyDraft);
      setScreenMessage(serviceDraft.id ? 'השירות עודכן בהצלחה.' : 'השירות נוסף בהצלחה.');
    } catch (error) {
      console.error('SETTINGS: service save error', error);
      setScreenMessage('לא הצלחנו לשמור את השירות. שווה לבדוק שם, מחיר וזמן טיפול.');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleServiceDelete = async (id: string) => {
    setScreenMessage('');

    try {
      const response = await fetch('/api/services?action=delete-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('service_delete_failed');
      }

      if (serviceDraft.id === id) {
        setServiceDraft(emptyDraft);
      }

      await loadServices();
      setScreenMessage('השירות הוסר מהרשימה.');
    } catch (error) {
      console.error('SETTINGS: service delete error', error);
      setScreenMessage('לא הצלחנו להסיר את השירות כרגע.');
    }
  };

  const startEditing = (service: ServiceItem) => {
    setServiceDraft({
      id: service.id,
      name: service.name,
      description: service.description || '',
      price: String(service.price),
      durationMins: String(service.duration_mins),
      isActive: service.is_active,
    });
  };

  return (
    <div className="min-h-screen bg-[#050508] px-5 pt-8 pb-28 text-white" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-[30px] border border-white/10 bg-gradient-to-br from-yellow-500/12 via-white/5 to-transparent p-6">
          <h1 className="text-3xl font-black">הגדרות הסטודיו</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            כאן מעדכנים את פרטי העסק ואת רשימת השירותים שהלקוחות יראו לפני קביעת תור.
          </p>
        </header>

        {screenMessage ? (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            {screenMessage}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-5">
              <h2 className="text-xl font-black">פרטי העסק</h2>
              <p className="mt-1 text-sm text-zinc-500">
                זה מה שיעזור ללקוח להבין אצל מי הוא מזמין.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-400">שם העסק</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none transition focus:border-yellow-500/50"
                  placeholder="למשל: Beauty Art Studio"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-400">כתובת</label>
                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none transition focus:border-yellow-500/50"
                  placeholder="למשל: הרצל 10, תל אביב"
                />
              </div>

              <button
                onClick={handleProfileSave}
                disabled={isSavingProfile}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-200 px-4 py-4 font-black text-black transition active:scale-[0.98] disabled:opacity-70"
              >
                {isSavingProfile ? <Sparkles className="animate-spin" size={18} /> : <Check size={18} />}
                שמירת פרטי העסק
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-5 flex items-center gap-3 text-yellow-500">
              <User size={18} />
              <span className="text-xs font-black uppercase tracking-[0.25em]">Studio note</span>
            </div>
            <p className="text-sm leading-7 text-zinc-400">
              ככל שרשימת השירותים תהיה ברורה יותר, כך ללקוח יהיה קל יותר להבין מה הוא מקבל וכמה זמן צריך לשמור עבורו ביומן.
            </p>
            <div className="mt-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
              השדות החשובים באמת הם שם השירות, המחיר ומשך הזמן.
              תיאור קצר הוא לא חובה, אבל הוא עוזר ללקוחה להבין מה היא תקבל.
            </div>
          </div>
        </section>

        {isManager ? (
          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-5">
                <h2 className="text-xl font-black">הוספה או עריכה של שירות</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  זה מה שהלקוח בוחר לפני שהוא רואה שעות פנויות.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-300">
                  כדי שלקוחה תבחר בקלות, מספיק למלא שם שירות, מחיר ומשך זמן.
                  תיאור קצר הוא רשות, אבל הוא יכול לעזור לה להבין מה מיוחד בשירות הזה.
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-400">שם השירות</label>
                  <input
                    type="text"
                    value={serviceDraft.name}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none transition focus:border-yellow-500/50"
                    placeholder="למשל: עיסוי, איפור ערב או טיפול פנים"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-400">תיאור קצר (לא חובה)</label>
                  <textarea
                    value={serviceDraft.description}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, description: event.target.value.slice(0, 240) }))}
                    className="min-h-[112px] w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none transition focus:border-yellow-500/50"
                    placeholder="למשל: כולל ייעוץ קצר, התאמה אישית וסיום עדין. הלקוחה תראה את זה לפני קביעת התור."
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    התיאור עוזר ללקוחה להבין מה בדיוק היא עומדת לבחור.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-400">מחיר</label>
                    <input
                      type="number"
                      min="0"
                      value={serviceDraft.price}
                      onChange={(event) => setServiceDraft((current) => ({ ...current, price: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none transition focus:border-yellow-500/50"
                      placeholder="150"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-400">משך טיפול בדקות</label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={serviceDraft.durationMins}
                      onChange={(event) => setServiceDraft((current) => ({ ...current, durationMins: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none transition focus:border-yellow-500/50"
                      placeholder="60"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                  <span className="font-medium text-zinc-200">להציג את השירות ללקוחות</span>
                  <input
                    type="checkbox"
                    checked={serviceDraft.isActive}
                    onChange={(event) => setServiceDraft((current) => ({ ...current, isActive: event.target.checked }))}
                    className="h-5 w-5 accent-yellow-500"
                  />
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={handleServiceSave}
                    disabled={isSavingService}
                    className="flex-1 rounded-2xl bg-yellow-500 px-4 py-4 font-black text-black transition active:scale-[0.98] disabled:opacity-70"
                  >
                    {isSavingService ? 'שומר...' : (serviceDraft.id ? 'עדכון שירות' : 'הוספת שירות')}
                  </button>

                  <button
                    onClick={() => setServiceDraft(emptyDraft)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-bold text-zinc-200 transition active:scale-[0.98]"
                  >
                    חדש
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">השירותים שמוצגים כרגע</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    כאן רואים בדיוק מה יופיע ללקוח במסך הבחירה.
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-500 text-lg font-black text-black">
                  +
                </div>
              </div>

              {services.length > 0 ? (
                <div className="space-y-3">
                  {services.map((service) => (
                    <article key={service.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-white">{service.name}</h3>
                          <p className="mt-1 text-sm text-zinc-400">
                            {service.duration_mins} דקות • ₪{service.price}
                          </p>
                          {service.description ? (
                            <p className="mt-2 text-sm leading-6 text-zinc-400">{service.description}</p>
                          ) : null}
                          <p className={`mt-2 text-xs font-bold ${service.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {service.is_active ? 'מוצג ללקוחות' : 'מוסתר כרגע מהלקוחות'}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditing(service)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-zinc-200 transition active:scale-95"
                            aria-label="edit service"
                          >
                            עריכה
                          </button>
                          <button
                            onClick={() => handleServiceDelete(service.id)}
                            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300 transition active:scale-95"
                            aria-label="delete service"
                          >
                            מחיקה
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <h3 className="text-lg font-bold">עדיין לא הוספת שירותים</h3>
                  <p className="mt-2 text-sm text-zinc-500">
                    ברגע שיופיע כאן לפחות שירות אחד, יהיה ללקוח הרבה יותר קל לקבוע תור כמו שצריך.
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-black">המסך הזה מיועד למאסטר</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-400">
              כאן מנהלים את השירותים והפרטים של העסק. בחשבון לקוח אין צורך לגעת בזה.
            </p>
          </section>
        )}
      </div>
    </div>
  );
};

export default Settings;
