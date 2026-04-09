import { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import * as Lucide from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { PortfolioImage } from '../types/database';

const { Camera, Sparkles, LoaderCircle } = Lucide;

const Portfolio = () => {
  const { user } = useTelegram();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchImages() {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('portfolio')
          .select('*')
          .eq('user_id', user.id.toString())
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setImages(data);
      } catch (err) {
        console.error('Error fetching portfolio:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchImages();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center font-luxury">
        <LoaderCircle className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
        <span className="text-yellow-500 tracking-[0.3em] font-light text-xs uppercase">BeautyOS Gallery</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#050508] min-h-screen text-white text-right pb-24" style={{ direction: 'rtl' }}>
      <header className="mb-10 pt-4">
        <h1 className="text-4xl font-black mb-2 tracking-tight">הגלריה שלי</h1>
        <p className="text-zinc-500 font-light">כל היצירות שנולדו ב-AI Creative</p>
      </header>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {images.map((img, idx) => (
            <div key={img.id || idx} className="aspect-square bg-white/5 rounded-3xl overflow-hidden border border-white/5 shadow-2xl transition-transform active:scale-95">
              <img src={img.image_url} alt="Portfolio" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
            <Sparkles size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">עוד אין עבודות בגלריה</h2>
          <p className="text-sm max-w-[200px]">התחילי ליצור בסטודיו החכם והן יופיעו כאן!</p>
        </div>
      )}

      <button onClick={() => window.location.href = '/'} className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-500">
        <Camera size={16} /> מעבר к סטודיו
      </button>
    </div>
  );
};

export default Portfolio;
