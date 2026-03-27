import { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { Camera, Image as ImageIcon } from 'lucide-react';

const Portfolio = () => {
  const { user } = useTelegram();
  const [images] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [user]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#050508] flex items-center justify-center font-luxury text-yellow-500">BEAUTYOS...</div>;
  }

  return (
    <div className="p-6 bg-[#050508] min-h-screen text-white text-right" style={{ direction: 'rtl' }}>
      <header className="mb-10">
        <h1 className="text-4xl font-black mb-2">הגלריה שלי</h1>
        <p className="text-zinc-500">כל היצירות שנולדו ב-AI Creative</p>
      </header>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="aspect-square bg-white/5 rounded-3xl overflow-hidden border border-white/5">
              <img src={img.url} alt="Portfolio" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
            <ImageIcon size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">עוד אין עבודות בגלריה</h2>
          <p className="text-sm max-w-[200px]">התחילי ליצור בסטודיו החכם והן יופיעו כאן!</p>
        </div>
      )}

      <button onClick={() => window.location.href = '/'} className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-500">
        <Camera size={16} /> מעבר לסטודיו
      </button>
    </div>
  );
};

export default Portfolio;
