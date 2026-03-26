import { Camera, ArrowLeft, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

declare global {
  interface Window {
    Telegram: any;
  }
}

const Portfolio = () => {
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setWorks(data);
      }
      setLoading(false);
    };

    fetchPortfolio();
  }, []);

  return (
    <div className="min-h-screen p-4 pb-20">
      <header className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 glass-card">
          <ArrowLeft className="w-5 h-5 text-yellow-500 scale-x-[-1]" />
        </Link>
        <h1 className="text-2xl font-bold gradient-text">העבודות שלי</h1>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : works.length === 0 ? (
          <div className="col-span-2 text-center py-20 opacity-50">
            <p>אין עדיין עבודות בפורטפוליו.</p>
            <p className="text-xs">הוסיפו עבודות דרך הבוט!</p>
          </div>
        ) : works.map((work) => (
          <motion.div 
            key={work.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card overflow-hidden"
          >
            <img src={work.image_url} alt="Portfolio Work" className="w-full h-32 object-cover" />
            <div className="p-3">
              <h3 className="text-[10px] font-semibold truncate">עבודת סטודיו</h3>
              <p className="text-[10px] text-zinc-500">{new Date(work.created_at).toLocaleDateString()}</p>
              <button className="mt-2 text-yellow-500"><Share2 className="w-4 h-4" /></button>
            </div>
          </motion.div>
        ))}
        
        {!loading && (
          <div className="glass-card border-dashed border-2 border-zinc-700 flex flex-col items-center justify-center h-48 opacity-50">
            <Camera className="w-8 h-8 mb-2" />
            <span className="text-[10px]">הוספה</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
