import { Camera, ArrowLeft, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Portfolio = () => {
  // Заглушка данных (в будущем — fetch из Supabase)
  const works = [
    { id: 1, title: 'Нюдовый маникюр', date: 'Сегодня', img: 'https://images.unsplash.com/photo-1604654894611-6973b376cbde?q=80&w=400' },
    { id: 2, title: 'Вечерний макияж', date: 'Вчера', img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc5493c?q=80&w=400' },
    { id: 3, title: 'Укладка волос', date: '21.03', img: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=400' },
  ];

  return (
    <div className="min-h-screen p-4 pb-20">
      <header className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 glass-card"><ArrowLeft className="w-5 h-5 text-yellow-500" /></Link>
        <h1 className="text-2xl font-bold gradient-text">Мои Работы</h1>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {works.map((work) => (
          <motion.div 
            key={work.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
          >
            <img src={work.img} alt={work.title} className="w-full h-32 object-cover" />
            <div className="p-3">
              <h3 className="text-xs font-semibold truncate">{work.title}</h3>
              <p className="text-[10px] text-zinc-500">{work.date}</p>
              <button className="mt-2 text-yellow-500"><Share2 className="w-4 h-4" /></button>
            </div>
          </motion.div>
        ))}
        
        <div className="glass-card border-dashed border-2 border-zinc-700 flex flex-col items-center justify-center h-48 opacity-50">
          <Camera className="w-8 h-8 mb-2" />
          <span className="text-[10px]">Добавить</span>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
