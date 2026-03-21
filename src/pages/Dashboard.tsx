import { Link } from 'react-router-dom';
import { Sparkles, Camera, Instagram, Facebook, MessageCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  
import { useState } from 'react';

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
  const [activeSocial, setActiveSocial] = useState('Instagram');
  
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-['Outfit'] antialiased overflow-x-hidden">
      {/* Контент */}
      <div className="flex-1 w-full max-w-md mx-auto px-6 pt-10 pb-40">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-right"
        >
          <h1 className="text-4xl font-black gradient-text mb-2 leading-tight">BeautyOS AI</h1>
          <p className="text-zinc-500 font-medium text-lg">עוזר ה-SMM המקצועי שלך</p>
        </motion.header>

        <motion.div className="space-y-10">
          {/* Upload Card */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            className="glass-card p-12 flex flex-col items-center justify-center border-dashed border-2 border-zinc-800/50 cursor-pointer group"
          >
            <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-yellow-500/10 transition-colors shadow-xl">
              <Camera className="w-10 h-10 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
            </div>
            <p className="text-center text-zinc-300 font-bold text-lg leading-relaxed">
              העלאת תמונה<br/>
              <span className="text-xs font-medium text-zinc-500 mt-2 block">גררו או לחצו כאן</span>
            </p>
          </motion.div>

          {/* Social Tabs */}
          <div className="flex justify-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50">
            {['Instagram', 'Facebook', 'WhatsApp'].map(s => (
              <button 
                key={s}
                onClick={() => setActiveSocial(s)}
                className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all ${activeSocial === s ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 pr-2 border-r-2 border-yellow-500">
              תצוגה מקדימה
            </h2>
            <PostPreview type={activeSocial} />
          </div>

          {/* Action Button */}
          <motion.button 
            whileTap={{ scale: 0.96 }}
            className="btn-primary flex items-center justify-center gap-3 w-full py-6 text-xl"
          >
            <Send className="w-6 h-6" />
            פרסום עכשיו
          </motion.button>
        </motion.div>
      </div>

      {/* Низовая навигация - Полный рестайл */}
      <nav className="fixed bottom-0 left-0 right-0 p-6 z-50 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="glass-card bg-[#0a0a0c]/80 backdrop-blur-3xl p-2 flex justify-around items-center border-white/5 shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.8)]">
            <Link to="/" className="p-4 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center flex-1">
              <Sparkles className="w-6 h-6" />
            </Link>
            <Link to="/portfolio" className="p-4 text-zinc-600 hover:text-zinc-200 transition-colors flex items-center justify-center flex-1">
              <Camera className="w-6 h-6" />
            </Link>
            <button className="p-4 text-zinc-600 hover:text-zinc-200 transition-colors flex items-center justify-center flex-1">
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
