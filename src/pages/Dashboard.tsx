import { Link } from 'react-router-dom';
import { Sparkles, Camera, Instagram, Facebook, MessageCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  
  return (
    <div className="min-h-screen p-4 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">BeautyOS AI</h1>
        <p className="text-zinc-500">Ваш профессиональный SMM-ассистент</p>
      </header>

      {/* Основной функционал */}
      <div className="grid gap-6">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="glass-card p-6 flex flex-col items-center justify-center border-dashed border-2 border-zinc-700 min-h-[200px]"
        >
          <Camera className="w-12 h-12 text-zinc-500 mb-4" />
          <p className="text-center text-zinc-400">Нажмите, чтобы загрузить фото работы<br/>или просто отправьте его боту</p>
        </motion.div>

        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Умная ретушь</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Сглаживание кожи</span>
              <input type="range" className="w-1/2 accent-yellow-500" />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Коррекция света</span>
              <input type="checkbox" className="w-5 h-5 rounded border-zinc-700 bg-zinc-800" />
            </div>
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Предпросмотр постов</h2>
          <div className="flex gap-4 mb-4">
            <button className="p-2 rounded-lg bg-zinc-800 text-pink-500"><Instagram /></button>
            <button className="p-2 rounded-lg bg-zinc-800 text-blue-500"><Facebook /></button>
            <button className="p-2 rounded-lg bg-zinc-800 text-green-500"><MessageCircle /></button>
          </div>
          <textarea 
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm min-h-[120px] focus:outline-none focus:border-yellow-500"
            placeholder="Текст поста появится здесь после генерации..."
          />
        </section>

        <button className="btn-primary flex items-center justify-center gap-2 w-full mt-4">
          <Send className="w-5 h-5" />
          Опубликовать везде
        </button>
      </div>

      {/* Bottom Nav (Mobile style) */}
      <nav className="fixed bottom-0 left-0 right-0 glass-card bg-black/80 m-4 p-4 flex justify-around">
        <Link to="/" className="text-yellow-500 flex flex-col items-center gap-1">
          <Sparkles className="w-6 h-6" />
          <span className="text-[10px]">Студия</span>
        </Link>
        <Link to="/portfolio" className="text-zinc-500 flex flex-col items-center gap-1">
          <Camera className="w-6 h-6" />
          <span className="text-[10px]">Работы</span>
        </Link>
        <button className="text-zinc-500 flex flex-col items-center gap-1">
          <Send className="w-6 h-6" />
          <span className="text-[10px]">Посты</span>
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
