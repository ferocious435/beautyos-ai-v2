import { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, User, Check } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

const Dashboard = () => {
  const { tg, haptic, setMainButton, hideMainButton, user } = useTelegram();
  const [activeSocial, setActiveSocial] = useState('Instagram');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (tg) {
      tg.ready();
      if (tg.requestFullscreen) {
        try { tg.requestFullscreen(); } catch(e) { tg.expand(); }
      } else {
        tg.expand();
      }
      tg.enableClosingConfirmation();
    }
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [tg]);

  useEffect(() => {
    const currentText = generatedResults ? (generatedResults[activeSocial.toLowerCase()] || generatedResults.instagram) : null;
    
    if (tg && currentText && !isGenerating) {
      setMainButton('פרסום עכשיו ✨', () => {
        haptic('heavy');
        tg.sendData(JSON.stringify({ 
          action: 'publish', 
          text: currentText, 
          social: activeSocial,
          image: imagePreview 
        }));
        alert('הפוסט נשלח לבוט לפרסום!');
      });
    } else {
      hideMainButton();
    }
  }, [tg, haptic, setMainButton, hideMainButton, generatedResults, isGenerating, activeSocial, imagePreview]);

  const socialNetworks = [
    { id: 'Instagram', name: 'Instagram', ratio: '9/16' },
    { id: 'Facebook', name: 'Facebook', ratio: '1.91/1' },
    { id: 'Telegram', name: 'Telegram', ratio: '1/1' },
    { id: 'WhatsApp', name: 'WhatsApp', ratio: '1/1' }
  ];

  const handleUploadClick = () => {
    if (tg) {
      if (tg.requestFullscreen) {
        try { tg.requestFullscreen(); } catch(e) { tg.expand(); }
      } else {
        tg.expand();
      }
    }
    haptic('medium');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setGeneratedResults(null);
        haptic('light');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!imagePreview) return;
    setIsGenerating(true);
    haptic('heavy');
    
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''; 
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePreview,
          masterName: user?.first_name || 'Beauty Master'
        }),
      });

      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      setGeneratedResults(data);
      haptic('medium');
    } catch (error) {
      console.error('Generation Error:', error);
      alert('שגיאה בחיבור ל-AI. נסי שוב מאוחר יותר.');
      haptic('heavy');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setGeneratedResults(null);
    haptic('light');
  };

  const currentText = generatedResults ? (generatedResults[activeSocial.toLowerCase()] || generatedResults.instagram) : null;
  const currentRatio = socialNetworks.find(s => s.id === activeSocial)?.ratio || '1/1';

  return (
    <div style={{ 
      backgroundColor: '#050508', minHeight: '100vh', color: 'white', direction: 'rtl', 
      padding: '0 20px', fontFamily: "'Outfit', sans-serif", width: '100%', overflowX: 'hidden',
      backgroundImage: 'radial-gradient(circle at 50% 0%, #1a1a3a 0%, #050508 100%)', perspective: '1000px'
    }}>
      
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />

      <div style={{ 
        maxWidth: '440px', margin: '0 auto', paddingTop: '60px', paddingBottom: '160px',
        opacity: isLoaded ? 1 : 0, transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block', padding: '8px 16px', background: 'rgba(234,179,8,0.1)',
            borderRadius: '100px', color: '#eab308', fontSize: '10px', fontWeight: '900',
            letterSpacing: '2px', marginBottom: '16px', textTransform: 'uppercase'
          }}>
            BeautyOS Premium Studio v2.2.8
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: '900', margin: '0', background: 'linear-gradient(135deg, white, #eab308)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
            AI Designer
          </h1>
        </header>

        {/* Post Designer View */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ 
            width: '100%', 
            aspectRatio: currentRatio, 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '40px', 
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.05)',
            position: 'relative',
            boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
            transition: 'aspect-ratio 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            transformStyle: 'preserve-3d'
          }}>
            {imagePreview ? (
              <>
                <img 
                  src={imagePreview} 
                  alt="Post" 
                  style={{ 
                    width: '100%', height: '100%', objectFit: 'contain',
                    filter: isGenerating ? 'blur(15px) brightness(0.5)' : 'brightness(1.05) contrast(1.1) saturate(1.1)',
                    transition: 'all 0.6s ease',
                    backgroundColor: 'rgba(0,0,0,0.4)'
                  }} 
                />
                
                {/* Branding Watermark */}
                <div style={{ position: 'absolute', top: '30px', right: '30px', opacity: 0.6 }}>
                   <div style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', fontWeight: '900' }}>
                      BEAUTYOS AI
                   </div>
                </div>

                {/* AI Overlay Text - Premium Glassmorphism Card */}
                {generatedResults?.short_overlay && !isGenerating && (
                  <div style={{ 
                    position: 'absolute', bottom: '10%', left: '0', right: '0', textAlign: 'center',
                    padding: '0 30px', animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}>
                    <div style={{ 
                      display: 'inline-block', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(40px)',
                      padding: '20px 40px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                      color: 'white', fontWeight: '900', fontSize: '24px', letterSpacing: '-0.5px'
                    }}>
                      <div style={{ color: '#eab308', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '2px' }}>AI RECOMMENDATION</div>
                      {generatedResults.short_overlay}
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto' }}>
                         <Sparkles className="animate-spin" size={80} color="#eab308" strokeWidth={1} style={{ opacity: 0.3 }} />
                         <Sparkles size={30} color="#eab308" style={{ position: 'absolute', top: '25px', left: '25px' }} />
                      </div>
                      <div style={{ marginTop: '24px', fontWeight: '900', fontSize: '18px', color: 'white', letterSpacing: '1px' }}>מעצב פוסט פרימיום...</div>
                    </div>
                  </div>
                )}

                {/* Edit Controls */}
                <div style={{ position: 'absolute', top: '25px', left: '25px', direction: 'ltr', display: 'flex', gap: '10px' }}>
                   <button onClick={handleReset} style={{ width: '44px', height: '44px', borderRadius: '15px', background: 'rgba(255,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', fontWeight: 'bold', fontSize: '20px' }}>×</button>
                   <button onClick={handleUploadClick} style={{ width: '44px', height: '44px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}><Camera size={20} /></button>
                </div>
              </>
            ) : (
              <div 
                onClick={handleUploadClick}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ width: '100px', height: '100px', background: 'linear-gradient(135deg, #eab308, #fbbf24)', borderRadius: '35px', display: 'flex', color: 'black', marginBottom: '30px', boxShadow: '0 20px 40px rgba(234,179,8,0.2)' }}>
                   <Camera size={48} style={{ margin: 'auto' }} />
                </div>
                <h3 style={{ fontWeight: '900', fontSize: '28px', color: 'white' }}>העלי תמונה ראשונה</h3>
                <p style={{ color: '#444', fontSize: '18px' }}>לחצי כאן לצילום או בחירה מהגלריה</p>
              </div>
            )}
          </div>
        </section>

        {/* Social Network Picker - Vertical Luxury Style */}
        <div style={{ marginBottom: '30px' }}>
           <div style={{ fontSize: '12px', fontWeight: '900', color: '#444', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>בחירת פורמט</div>
           <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
             {socialNetworks.map(social => (
               <button
                 key={social.id}
                 onClick={() => { haptic('light'); setActiveSocial(social.id); }}
                 style={{
                   padding: '16px 24px', borderRadius: '20px', border: '1px solid',
                   borderColor: activeSocial === social.id ? '#eab308' : 'rgba(255,255,255,0.05)',
                   background: activeSocial === social.id ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.02)',
                   color: activeSocial === social.id ? '#eab308' : '#666',
                   fontWeight: '900', fontSize: '14px', transition: '0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                   minWidth: '110px'
                 }}
               >
                 {social.id}
               </button>
             ))}
           </div>
        </div>

        {/* Generate Button / Post Text */}
        {imagePreview && !generatedResults && (
           <button 
             disabled={isGenerating}
             onClick={handleGenerate}
             style={{
               width: '100%', padding: '28px', borderRadius: '35px', border: 'none',
               background: 'linear-gradient(135deg, #eab308, #fbbf24)',
               color: 'black', fontWeight: '900', fontSize: '22px',
               boxShadow: '0 30px 60px rgba(234,179,8,0.3)', cursor: 'pointer',
               transition: 'transform 0.2s active:scale(0.98)'
             }}
           >
             <Sparkles size={28} style={{ marginLeft: '12px', verticalAlign: 'middle' }} />
             צור פוסט גאוני ✨
           </button>
        )}

        {currentText && !isGenerating && (
          <div style={{ 
            animation: 'fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1)', background: 'rgba(255,255,255,0.03)',
            borderRadius: '40px', padding: '35px', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.3)'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', background: '#eab308', borderRadius: '10px', display: 'flex', color: 'black' }}>
                    <Check size={18} style={{ margin: 'auto' }} />
                  </div>
                  <span style={{ fontWeight: '900', color: 'white', fontSize: '18px' }}>טקסט הפוסט המוכן</span>
                </div>
                <button onClick={handleGenerate} style={{ background: 'transparent', border: 'none', color: '#eab308', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} /> נסי שוב
                </button>
             </div>
             <p style={{ fontSize: '19px', lineHeight: '1.9', color: '#ccc', whiteSpace: 'pre-wrap', textAlign: 'right', fontWeight: '500' }}>
               {currentText}
             </p>
             
             <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(234,179,8,0.05)', borderRadius: '20px', display: 'flex', gap: '12px' }}>
                <Sparkles size={20} color="#eab308" />
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                  הטקסט הותאם במיוחד ל- {activeSocial} על בסיס העיצוב החדש.
                </p>
             </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '80px', color: '#1a1a1a', fontSize: '10px', letterSpacing: '4px', fontWeight: '900' }}>
          BEAUTYOS AI PREMIUM SYSTEM
        </div>
      </div>

      {/* Navigation - Luxury Floating Style */}
      <nav style={{
        position: 'fixed', bottom: '30px', left: '20px', right: '20px', height: '84px',
        background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(40px)', borderRadius: '35px',
        border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100,
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        {[
          { id: 'smart', label: 'סמארט', icon: <Sparkles size={28} color="#eab308" /> },
          { id: 'gallery', label: 'גלריה', icon: <Camera size={28} color="#444" /> },
          { id: 'profile', label: 'פרופיל', icon: <User size={28} color="#444" /> }
        ].map(item => (
          <div key={item.id} style={{ textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
            <div style={{ fontSize: '11px', color: item.id === 'smart' ? '#eab308' : '#444', marginTop: '6px', fontWeight: '900' }}>{item.label}</div>
          </div>
        ))}
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-spin { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Dashboard;
