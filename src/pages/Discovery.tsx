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
    if (!navigator.geolocation) return;

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        console.error('Geo error:', err);
        setError('Location access was denied. Showing available masters without distance sorting.');
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
        if (!response.ok) throw new Error(data.error || 'Failed to load masters');
        setMasters(data.masters || []);
      } catch (err) {
        console.error('Masters API Error:', err);
        setMasters([]);
        setError('Could not load masters right now. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMasters();
  }, [location]);

  const visibleMasters = masters.filter((master) => {
    const searchText = `${master.business_name || ''} ${master.full_name || ''}`.toLowerCase();
    return searchText.includes(query.trim().toLowerCase());
  });

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Masters near you</h1>
          <p className="text-zinc-400 text-sm">Find an available beauty professional</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by business or master name..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl text-amber-100 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-zinc-900 animate-pulse border border-zinc-800" />
          ))
        ) : (
          <AnimatePresence>
            {visibleMasters.length > 0 ? (
              visibleMasters.map((master) => (
                <motion.div
                  key={master.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0f0f0f] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl group"
                >
                  <div className="flex h-40 gap-1 p-2">
                    {master.portfolio_previews && master.portfolio_previews.length > 0 ? (
                      master.portfolio_previews.map((img, idx) => (
                        <div key={idx} className="flex-1 rounded-xl overflow-hidden bg-zinc-800">
                          <img src={img} alt="work" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex items-center justify-center bg-zinc-900 text-zinc-600 rounded-xl font-medium">
                        No portfolio yet
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex justify-between items-end">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white leading-tight">
                        {master.business_name || master.full_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                        <span>{master.dist_km !== null ? `${master.dist_km.toFixed(1)} km` : 'Distance unavailable'}</span>
                        <span className="text-zinc-700">-</span>
                        <span className="text-zinc-300">5.0</span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/booking?masterId=${master.telegram_id}`)}
                      className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold active:scale-95 transition-transform"
                    >
                      Book
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 space-y-4">
                <div className="p-4 bg-zinc-900 w-16 h-16 rounded-full mx-auto flex items-center justify-center border border-zinc-800">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <h3 className="text-zinc-400">No masters found</h3>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Discovery;
