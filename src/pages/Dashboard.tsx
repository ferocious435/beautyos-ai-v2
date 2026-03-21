import { Link } from 'react-router-dom';
import { Sparkles, Camera, Instagram, Facebook, MessageCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-['Outfit'] antialiased overflow-x-hidden rtl">
      {/* Контент с большими отступами */}
      <div className="flex-1 w-full max-w-md mx-auto px-8 pt-12 pb-32">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-right"
        >
          <h1 className="text-4xl font-black gradient-text mb-2 leading-tight">BeautyOS AI</h1>
          <p className="text-zinc-500 font-medium text-lg leading-relaxed">השותף הדיגיטלי המושלם שלך</p>
        </motion.header>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="space-y-8"
        >
          {/* Upload Card */}
          <motion.div 
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            whileTap={{ scale: 0.97 }}
            className="glass-card p-12 flex flex-col items-center justify-center border-dashed border-2 border-zinc-800/50 cursor-pointer group hover:border-yellow-500/30 transition-all"
          >
            <div className="w-20 h-20 bg-zinc-900/80 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-yellow-500/10 transition-colors shadow-inner">
              <Camera className="w-10 h-10 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
            </div>
            <p className="text-center text-zinc-300 font-semibold text-lg leading-relaxed">
              לחצו להעלאת תמונת עבודה<br/>
              <span className="text-sm font-medium text-zinc-500">או פשוט שלחו אותה לבוט</span>
            </p>
          </motion.div>

          {/* Settings Section */}
          <motion.section 
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="glass-card p-8 space-y-8"
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-yellow-500/10 rounded-2xl">
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">ריטוש חכם</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-wider text-zinc-400">
                <span>החלקת עור</span>
                <span className="text-yellow-500">50%</span>
              </div>
              <input 
                type="range" 
                className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-yellow-500" 
              />
            </div>
          </motion.section>

          {/* Action Button */}
          <motion.button 
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex items-center justify-center gap-4 w-full py-6 text-xl shadow-[0_20px_40px_-15px_rgba(234,179,8,0.3)]"
          >
            <Send className="w-6 h-6 rotate-[15deg]" />
            פרסום בכל הערוצים
          </motion.button>
        </motion.div>
      </div>

      {/* Фиксированная навигация - Исправленная версия */}
      <div className="fixed bottom-8 left-0 right-0 px-8 pointer-events-none">
        <nav className="max-w-md mx-auto glass-card p-3 flex justify-between items-center pointer-events-auto border-white/10 shadow-2xl backdrop-blur-2xl">
          <Link to="/" className="flex-1 flex justify-center p-4 bg-yellow-500/10 text-yellow-500 rounded-2xl transition-all">
            <Sparkles className="w-6 h-6" />
          </Link>
          <Link to="/portfolio" className="flex-1 flex justify-center p-4 text-zinc-500 hover:text-zinc-200 transition-all">
            <Camera className="w-6 h-6" />
          </Link>
          <button className="flex-1 flex justify-center p-4 text-zinc-500 hover:text-zinc-200 transition-all">
            <Send className="w-6 h-6 rotate-[15deg]" />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Dashboard;
