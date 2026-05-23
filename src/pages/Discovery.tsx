/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { telegramAuthHeaders } from '../lib/telegramAuth';

interface Master {
  id: string;
  telegram_id: number;
  full_name: string;
  business_name: string | null;
  dist_km: number | null;
  portfolio_previews: string[] | null;
}

const Discovery = () => {
  const navigate = useNavigate();
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setError('לא התקבלה גישה למיקום שלך. עדיין אפשר לבחור מומחה ולקבוע תור.');
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    const fetchMasters = async () => {
      setLoading(true);

      try {
        const response = await fetch('/api/services?action=list-masters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
          body: JSON.stringify({ location }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'failed_to_load_masters');
        }

        setMasters(data.masters || []);
      } catch (fetchError) {
        console.error('DISCOVERY: Masters API Error:', fetchError);
        setMasters([]);
        setError('כרגע אי אפשר לטעון את רשימת המומחים. אפשר לנסות שוב בעוד רגע.');
      } finally {
        setLoading(false);
      }
    };

    fetchMasters();
  }, [location]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleMasters = masters.filter((master) => {
    const searchText = `${master.business_name || ''} ${master.full_name || ''}`.toLowerCase();
    return searchText.includes(normalizedQuery);
  });

  return (
    <div className="min-h-screen bg-[#050508] px-4 pt-6 pb-28 text-white" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-[30px] border border-white/10 bg-gradient-to-br from-yellow-500/12 via-white/5 to-transparent p-5">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 text-black">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m16 12-4-4-4 4h8Z" />
              <path d="m12 16V8" />
            </svg>
          </div>
          <h1 className="text-3xl font-black">בחירת מומחה לקביעת תור</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            כאן רואים רק מומחים שאפשר באמת לקבוע אצלם תור כבר עכשיו.
          </p>
        </header>

        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="אפשר לחפש לפי שם העסק או שם המומחה"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-4 pl-5 pr-12 text-sm text-white outline-none transition focus:border-yellow-500/50"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5">
          {loading ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="h-64 rounded-[28px] border border-white/5 bg-white/[0.03] animate-pulse" />
            ))
          ) : (
            <AnimatePresence>
              {visibleMasters.length > 0 ? (
                visibleMasters.map((master) => (
                  <motion.article
                    key={master.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-[30px] border border-white/10 bg-[#101012] shadow-2xl shadow-black/20"
                  >
                    <div className="flex h-40 gap-1 p-2">
                      {master.portfolio_previews && master.portfolio_previews.length > 0 ? (
                        master.portfolio_previews.map((imageUrl, index) => (
                          <div key={`${master.id}-${index}`} className="flex-1 overflow-hidden rounded-2xl bg-zinc-900">
                            <img src={imageUrl} alt="portfolio preview" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-1 items-center justify-center rounded-2xl bg-zinc-900 text-center text-sm text-zinc-500">
                          הגלריה תופיע כאן בקרוב
                        </div>
                      )}
                    </div>

                    <div className="flex items-end justify-between gap-4 p-5">
                      <div className="space-y-2">
                        <h2 className="text-lg font-black text-white">
                          {master.business_name || master.full_name}
                        </h2>
                        <div className="text-sm text-zinc-400">
                          {master.dist_km !== null
                            ? `מרחק משוער: ${master.dist_km.toFixed(1)} ק"מ`
                            : 'המרחק יוצג אחרי אישור מיקום'}
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/booking?masterId=${master.telegram_id}`)}
                        className="rounded-full bg-yellow-500 px-5 py-3 text-sm font-black text-black transition active:scale-95"
                      >
                        לצפייה ביומן
                      </button>
                    </div>
                  </motion.article>
                ))
              ) : (
                <div className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-14 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-zinc-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold">כרגע אין מומחים זמינים במסך הזה</h3>
                  <p className="mt-2 text-sm text-zinc-500">
                    אפשר לנסות חיפוש אחר, או לחזור בעוד מעט כשיתווספו שירותים זמינים.
                  </p>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default Discovery;
