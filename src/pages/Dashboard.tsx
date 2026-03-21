import { Link } from 'react-router-dom';
import { Sparkles, Camera, Instagram, Facebook, MessageCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  
  return (
    <div className="min-h-screen p-6 pb-28 max-w-lg mx-auto">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-right"
      >
        <h1 className="text-4xl font-extrabold gradient-text mb-1">BeautyOS AI</h1>
        <p className="text-zinc-500 font-medium tracking-tight">השותף הדיגיטלי המושלם שלך</p>
      </motion.header>

      {/* Основной функционал */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
        }}
        className="grid gap-6"
      >
        <motion.div 
          variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
          whileTap={{ scale: 0.98 }}
          className="glass-card p-10 flex flex-col items-center justify-center border-dashed border-2 border-zinc-800 cursor-pointer group"
        >
          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 group-hover:bg-yellow-500/10 transition-colors">
            <Camera className="w-8 h-8 text-zinc-500 group-hover:text-yellow-500" />
          </div>
          <p className="text-center text-zinc-300 font-medium leading-relaxed">
            לחצו להעלאת תמונת עבודה<br/>
            <span className="text-sm text-zinc-500">או פשוט שלחו אותה לבוט</span>
          </p>
        </motion.div>

        <motion.section 
          variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </div>
            <h2 className="text-xl font-bold">ריטוש חכם</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-zinc-400">החלקת עור</span>
                <span className="text-yellow-500">50%</span>
              </div>
              <input type="range" className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
            </div>
          </div>
        </motion.section>

        <motion.button 
          variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
          whileTap={{ scale: 0.95 }}
          className="btn-primary flex items-center justify-center gap-3 w-full shadow-2xl"
        >
          <Send className="w-5 h-5 scale-x-[-1]" />
          פרסום בכל הערוצים
        </motion.button>
      </motion.div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-6 right-6 glass-card p-2 flex justify-around items-center border-white/5 shadow-2xl">
        <Link to="/" className="p-4 bg-yellow-500/10 text-yellow-500 rounded-2xl flex flex-col items-center gap-1">
          <Sparkles className="w-5 h-5" />
        </Link>
        <Link to="/portfolio" className="p-4 text-zinc-500 hover:text-zinc-200 transition-colors rounded-2xl flex flex-col items-center gap-1">
          <Camera className="w-5 h-5" />
        </Link>
        <button className="p-4 text-zinc-500 hover:text-zinc-200 transition-colors rounded-2xl flex flex-col items-center gap-1">
          <Send className="w-5 h-5 scale-x-[-1]" />
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
