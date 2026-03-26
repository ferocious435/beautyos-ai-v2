import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useAppStore } from '../store/useAppStore';

const Dashboard = () => {
  const { tg, haptic, user } = useTelegram();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedVersions, setEnhancedVersions] = useState<string[]>([]);
  const [currentFormatIndex, setCurrentFormatIndex] = useState(0);
  const [generatedResults, setGeneratedResults] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Studio Info (Настройка подписей на иврите)
  const [studioName, setStudioName] = useState(user?.first_name || 'סטודיו ליופי');
  const [address, setAddress] = useState('להזמנת תור ופרטים נוספים'); // Изменил "אזמין" на более нейтральное
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [tg]);

  const handleUploadClick = () => {
    haptic('medium');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setEnhancedVersions([]);
        setGeneratedResults(null);
        haptic('light');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMagicFlow = async () => {
    if (!imagePreview) return;
    setIsEnhancing(true);
    setGeneratedResults(null);
    haptic('heavy');
    
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''; 
      
      // 1. Улучшение и наложение текста [ai-studio-image]
      const enhanceResponse = await fetch(`${baseUrl}/api/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imagePreview,
          studioName,
          address
        }),
      });
      const enhanceData = await enhanceResponse.json();
      
      if (enhanceData.enhancedImages && enhanceData.enhancedImages.length > 0) {
        setEnhancedVersions(enhanceData.enhancedImages);
        setCurrentFormatIndex(0);
      }

      // 2. Генерация текста поста [content-creator]
      const analyzeResponse = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePreview,
          masterName: studioName
        }),
      });
      const analyzeData = await analyzeResponse.json();
      setGeneratedResults(analyzeData);

      haptic('medium');
    } catch (e) {
      console.error(e);
      alert('שגיאה בעיבוד. נסי שוב.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const currentDisplayImage = enhancedVersions.length > 0 ? enhancedVersions[currentFormatIndex] : imagePreview;
  const currentRatio = enhancedVersions.length > 0 
    ? (currentFormatIndex === 2 ? '9/16' : currentFormatIndex === 1 ? '4/5' : '1/1') 
    : '1/1';

  const formats = [
    { id: 'square', name: 'פוסט (1:1)', index: 0 },
    { id: 'portrait', name: 'פורטרט (4:5)', index: 1 },
    { id: 'story', name: 'סטורי (9:16)', index: 2 }
  ];

  return (
    <div className="animate-luxury" style={{ 
      backgroundColor: '#050508', minHeight: '100vh', color: 'white', direction: 'rtl', 
      padding: '0 20px', fontFamily: "'Assistant', sans-serif", width: '100%', overflowX: 'hidden',
      backgroundImage: 'radial-gradient(circle at 50% 10%, #1e1e3f 0%, #050508 100%)'
    }}>
      
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />

      <div style={{ 
        maxWidth: '460px', margin: '0 auto', paddingTop: '40px', paddingBottom: '160px',
        opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease'
      }}>
        
        <header style={{ marginBottom: '40px', textAlign: 'right' }}>
          <div style={{ 
            display: 'inline-block', padding: '6px 12px', background: 'rgba(234,179,8,0.1)',
            borderRadius: '8px', color: '#eab308', fontSize: '10px', fontWeight: '900',
            letterSpacing: '3px', marginBottom: '12px'
          }}>
            BeautyOS v2.3.2 • Magic 🚀
          </div>
          <h1 className="font-luxury" style={{ fontSize: '48px', fontWeight: '900', margin: '0', lineHeight: '1', letterSpacing: '-1px' }}>
            <span className="gold-text">Beauty</span> Magic
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '10px' }}>
             קסם בכפתור אחד: תמונה וטקסט בשניות.
          </p>
        </header>

        {/* Pro Upgrade Widget (Loss Aversion) */}
        {useAppStore.getState().user.subscriptionTier === 'free' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-premium mb-8 overflow-hidden rounded-3xl p-6 border-l-4 border-yellow-500/50"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-yellow-500 font-bold text-xs uppercase tracking-widest">
                  <Sparkles size={14} />
                  <span>שדרג ל-Pro</span>
                </div>
                <h3 className="text-white font-bold text-lg">אל תפסידו לקוחות!</h3>
                <p className="text-gray-400 text-xs">מאסטרים בתוכנית Pro מקבלים 40% יותר תורים. התחילו לגדול עכשיו.</p>
              </div>
              <Link to="/pricing" className="gold-gradient px-4 py-3 rounded-xl text-black font-black text-sm whitespace-nowrap">
                לברר מחיר
              </Link>
            </div>
          </motion.div>
        )}

        {/* Main Display Area */}
        <section style={{ marginBottom: '40px' }}>
          <div className="glass-premium" style={{ 
            width: '100%', aspectRatio: currentRatio, borderRadius: '32px', overflow: 'hidden',
            position: 'relative', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)', backgroundColor: '#0a0a0f'
          }}>
            {imagePreview ? (
              <>
                <img src={currentDisplayImage || ''} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                {isEnhancing && (
                   <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
                     <div className="animate-spin" style={{ width: '40px', height: '40px', border: '2px solid #eab308', borderTopColor: 'transparent', borderRadius: '50%' }} />
                   </div>
                )}
                <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
                   <button onClick={() => { setImagePreview(null); setEnhancedVersions([]); }} className="glass-premium" style={{ padding: '10px', borderRadius: '12px', color: '#ef4444' }}>✕</button>
                </div>
              </>
            ) : (
              <div onClick={handleUploadClick} style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Camera size={48} color="#eab308" />
                <h3 style={{ marginTop: '20px', fontWeight: '900' }}>העלאת תמונה</h3>
              </div>
            )}
          </div>
        </section>

        {imagePreview && (
          <div className="animate-luxury">
             {enhancedVersions.length === 0 ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <div className="glass-premium" style={{ padding: '20px', borderRadius: '20px' }}>
                   <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: '900' }}>פרטי העסק והחתימה:</label>
                   <input type="text" value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="имя студии" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', color: 'white', marginBottom: '10px' }} />
                   <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="телефон / адрес" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', color: 'white' }} />
                 </div>
                 <button onClick={handleMagicFlow} disabled={isEnhancing} className="gold-gradient" style={{ width: '100%', padding: '20px', borderRadius: '20px', color: 'black', fontWeight: '900', fontSize: '18px' }}>שדרג תוכן בסטייל ✨</button>
               </div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                 <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {formats.map(f => (
                      <button key={f.id} onClick={() => setCurrentFormatIndex(f.index)} style={{ padding: '10px 20px', borderRadius: '12px', background: currentFormatIndex === f.index ? '#eab308' : 'rgba(255,255,255,0.02)', color: currentFormatIndex === f.index ? 'black' : '#666', border: 'none', fontWeight: '900', whiteSpace: 'nowrap' }}>{f.name}</button>
                    ))}
                 </div>
                 
                 {generatedResults && (
                   <div className="glass-premium" style={{ padding: '20px', borderRadius: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                         <Check size={20} color="#eab308" />
                         <span style={{ fontWeight: '900' }}>הטקסט לפוסט (מוכן להעתקה):</span>
                      </div>
                      <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0 }}>{generatedResults.instagram || generatedResults.post}</p>
                   </div>
                 )}
                 <button className="gold-gradient" style={{ width: '100%', padding: '20px', borderRadius: '20px', color: 'black', fontWeight: '900' }} onClick={() => alert('מדהים! התמונות והטקסט מוכנים.')}>סיימתי 🚀</button>
               </div>
             )}
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        .gold-text { background: linear-gradient(135deg, #eab308 0%, #fef08a 50%, #eab308 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .gold-gradient { background: linear-gradient(135deg, #eab308 0%, #fef08a 100%); transition: transform 0.2s; }
        .gold-gradient:active { transform: scale(0.98); }
        .glass-premium { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }
      `}</style>
    </div>
  );
};

export default Dashboard;
