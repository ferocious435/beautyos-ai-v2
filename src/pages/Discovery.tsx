import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

interface Master {
  id: string;
  telegram_id: number;
  full_name: string;
  business_name: string;
  dist_km: number;
  portfolio_previews: string[] | null;
}

const Discovery = () => {
  const navigate = useNavigate();
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLoading(false);
        },
        (err) => {
          console.error('Geo error:', err);
          setError('Пожалуйста, разрешите доступ к геолокации для поиска мастеров поблизости.');
          setLoading(false);
        }
      );
    }
  }, []);

  useEffect(() => {
    const fetchNearby = async () => {
      if (!location) return;
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_nearby_masters', {
        user_lat: location.lat,
        user_lng: location.lng,
        dist_limit_km: 10.0
      });

      if (error) {
        console.error('RPC Error:', error);
      } else {
        setMasters(data || []);
      }
      setLoading(false);
    };

    fetchNearby();
  }, [location]);

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Рядом с вами 📍</h1>
          <p className="text-zinc-400 text-sm">Мастера в радиусе 10 км</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <input 
          type="text" 
          placeholder="Поиск услуги или мастера..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Masters List */}
      <div className="grid gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-zinc-900 animate-pulse border border-zinc-800" />
          ))
        ) : (
          <AnimatePresence>
            {masters.length > 0 ? (
              masters.map((master) => (
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
                        Нет фото
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex justify-between items-end">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white leading-tight">
                        {master.business_name || master.full_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>{master.dist_km.toFixed(1)} км</span>
                        <span className="text-zinc-700">•</span>
                        <div className="flex items-center gap-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#eab308" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          <span className="text-zinc-300">5.0</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => navigate(`/booking?masterId=${master.telegram_id}`)}
                      className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold active:scale-95 transition-transform"
                    >
                      Записаться
                    </button>
                  </div>
                </motion.div>
              ))
            ) : !loading && (
              <div className="text-center py-20 space-y-4">
                <div className="p-4 bg-zinc-900 w-16 h-16 rounded-full mx-auto flex items-center justify-center border border-zinc-800">
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <h3 className="text-zinc-400">В радиусе 10 км мастеров не найдено</h3>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Discovery;
