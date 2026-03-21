import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Send, User, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const PostPreview = ({ type, imageUrl, userName = "Beauty_Artist", caption = "" }: any) => {
  return (
    <div className="glass-card overflow-hidden w-full max-w-sm mx-auto border-zinc-700/50">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-500 p-0.5">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
               <User className="w-6 h-6 text-zinc-500" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold">{userName}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{type}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-zinc-600" />
          <div className="w-1 h-1 rounded-full bg-zinc-600" />
          <div className="w-1 h-1 rounded-full bg-zinc-600" />
        </div>
      </div>

      {/* Image */}
      <div className="aspect-square bg-zinc-900 flex items-center justify-center relative group">
        {imageUrl ? (
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-12 h-12 text-zinc-700" />
        )}
      </div>

      {/* Caption Area */}
      <div className="p-4 space-y-3">
        <div className="flex gap-4">
          <Sparkles className="w-6 h-6 text-white" />
          <MessageCircle className="w-6 h-6 text-white" />
          <Send className="w-6 h-6 text-white" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold">{userName}</p>
          <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">
            {caption || "הטקסט של הפוסט המעוצב שלך יופיע כאן... ✨"}
          </p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeSocial, setActiveSocia  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-['Outfit'] antialiased overflow-x-hidden">
      {/* Контент с ЧЕТКИМИ отступами 20px (4mm) от краев */}
      <div className="flex-1 w-full max-w-md mx-auto px-[20px] pt-16 pb-48">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-right"
        >
          <h1 className="text-5xl font-black gradient-text mb-4 leading-[1.2]">BeautyOS AI</h1>
          <p className="text-zinc-500 font-semibold text-xl leading-relaxed">השותף הדיגיטלי המושלם שלך</p>
        </motion.header>

        <motion.div className="space-y-16"> {/* Огромные зазоры между блоками */}
          {/* Upload Card */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            className="glass-card p-14 flex flex-col items-center justify-center border-dashed border-2 border-zinc-800/80 cursor-pointer group hover:border-yellow-500/40 transition-all"
          >
            <div className="w-24 h-24 bg-zinc-900 rounded-[32px] flex items-center justify-center mb-8 group-hover:bg-yellow-500/10 transition-colors shadow-2xl">
              <Camera className="w-12 h-12 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
            </div>
            <p className="text-center text-zinc-200 font-black text-xl leading-[1.8]">
              העלאת תמונה<br/>
              <span className="text-xs font-bold text-zinc-600 mt-4 block tracking-widest uppercase">לחצו כאן לעיבוד</span>
            </p>
          </motion.div>

          {/* Social Tabs - Используем Grid для стабильности */}
          <div className="grid grid-cols-3 gap-3 bg-zinc-900/40 p-2 rounded-[24px] border border-zinc-800/50">
            {['Instagram', 'Facebook', 'WhatsApp'].map(s => (
              <button 
                key={s}
                onClick={() => setActiveSocial(s)}
                className={`py-4 px-1 rounded-[18px] text-[10px] font-black transition-all text-center ${activeSocial === s ? 'bg-yellow-500 text-black shadow-[0_10px_20px_rgba(234,179,8,0.3)] scale-105' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Preview Section */}
          <div className="space-y-8">
            <h2 className="text-2xl font-black flex items-center justify-end gap-3 pr-4 border-r-4 border-yellow-500 leading-tight">
              תצוגה מקדימה
            </h2>
            <div className="py-4">
              <PostPreview type={activeSocial} />
            </div>
          </div>

          {/* Action Button */}
          <motion.button 
            whileTap={{ scale: 0.94 }}
            className="btn-primary flex items-center justify-center gap-4 w-full py-8 text-2xl"
          >
            <Send className="w-8 h-8 rotate-[15deg]" />
            פרסום עכשיו
          </motion.button>
        </motion.div>
      </div>

      {/* Низовая навигация - Бронированная сетка */}
      <nav className="fixed bottom-0 left-0 right-0 p-8 z-50 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="glass-card bg-[#0a0a0c]/90 backdrop-blur-3xl p-3 shadow-[0_-25px_60px_-15px_rgba(0,0,0,0.9)] border-white/10 m-0">
            <div className="nav-grid">
              <Link to="/" className="p-5 bg-yellow-500/10 text-yellow-500 rounded-[22px] flex items-center justify-center transition-transform active:scale-90">
                <Sparkles className="w-7 h-7" />
              </Link>
              <Link to="/portfolio" className="p-5 text-zinc-700 hover:text-zinc-200 flex items-center justify-center transition-transform active:scale-90">
                <Camera className="w-7 h-7" />
              </Link>
              <button className="p-5 text-zinc-700 hover:text-zinc-200 flex items-center justify-center transition-transform active:scale-90">
                <User className="w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
