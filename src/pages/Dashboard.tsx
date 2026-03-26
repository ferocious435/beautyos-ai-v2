import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const Dashboard = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const user = useAppStore((state) => state.user) || { name: 'Гость', role: '', subscriptionTier: 'free' };

  if (!user) {
    console.error('DASHBOARD: User data missing from store!');
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Custom SVGs (Lucide-like but reliable)
  const Icons = {
    Camera: () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
    Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
    TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    ShieldCheck: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>,
    Zap: () => <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.71 13 2l-2 7.29H20L11 22l2-7.29H4Z"/></svg>,
    ImageIcon: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
    ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen pb-24 px-4 pt-6 space-y-6 bg-[#050508]"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {user.name || 'שלום רב'}
          </h1>
          <p className="text-gray-500 text-sm">הכנתי לך כמה רעיונות לתוכן היום ✨</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
          {user.avatar ? <img src={user.avatar} alt="User" className="w-full h-full object-cover" /> : <div className="text-purple-400 font-bold">B</div>}
        </div>
      </motion.div>

      {/* Subscription Banner (Loss Aversion) */}
      {user.subscriptionTier === 'free' && (
        <motion.div variants={itemVariants}>
          <Link to="/pricing" className="block relative group overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Icons.Zap />
            </div>
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm uppercase tracking-wider">
                <Icons.Sparkles />
                <span>שדרוג ל-PRO</span>
              </div>
              <h2 className="text-xl font-bold text-white">הלקוחות שלך מחכים</h2>
              <p className="text-sm text-gray-400 max-w-[240px]">
                בלי חשבון Pro, העסק שלך מופיע פחות вחיפושים בסביבה.
              </p>
              <div className="flex items-center gap-1 text-amber-500 text-sm font-bold mt-4">
                לפרטים נוספים <Icons.ChevronRight />
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Main Action: Content Studio */}
      <motion.div variants={itemVariants} className="relative group overflow-hidden rounded-3xl glass-premium p-8 border-white/5 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 blur-[100px] rounded-full group-hover:bg-purple-500/30 transition-colors" />
        
        <div className="text-center space-y-6 relative z-10">
          <div className="mx-auto w-20 h-20 gold-gradient rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.3)] group-hover:scale-110 transition-transform duration-500 text-black">
            <Icons.Camera />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white font-luxury uppercase tracking-widest">Content Studio</h2>
            <p className="text-gray-400 text-sm">הפוך עבודה לאמנות בתוך שניות</p>
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-white/5"
          >
            <Icons.ImageIcon />
            בחר תמונה להעלאה
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div variants={itemVariants} className="glass-premium p-4 rounded-3xl flex flex-col items-center gap-2 border-white/5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Icons.TrendingUp />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">12</div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">פוסטים השבוע</div>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="glass-premium p-4 rounded-3xl flex flex-col items-center gap-2 border-white/5">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
            <Icons.ShieldCheck />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">Elite</div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">דירוג מאסטר</div>
          </div>
        </motion.div>
      </div>

      {/* Preview Section */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="p-4 glass-premium rounded-3xl space-y-4"
          >
            <img src={imagePreview} className="w-full aspect-square object-cover rounded-2xl shadow-lg" alt="Preview" />
            <button className="w-full py-4 gold-gradient text-black rounded-2xl font-bold animate-pulse">
              שפר עם בינה מלאכותית ✨
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="text-center pb-8 opacity-20 text-[10px] uppercase tracking-tighter font-bold">
        BeautyOS AI Engine v2.5.1
      </footer>
    </motion.div>
  );
};

export default Dashboard;
