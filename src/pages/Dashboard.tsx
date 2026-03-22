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

  // Image Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    sharpen: 0,
    shadows: 0
  });

  const handleAIEnhance = async () => {
    if (!imagePreview) return;
    setIsEnhancing(true);
    haptic('heavy');
    
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''; 
      const response = await fetch(`${baseUrl}/api/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imagePreview }),
      });
      const data = await response.json();
      
      // Animate the sliders to the AI calculated values
      setFilters(data);
      haptic('medium');
    } catch (e) {
      console.error(e);
      // Fail gracefully with pro defaults
      setFilters({ brightness: 110, contrast: 115, saturate: 110, sharpen: 50, shadows: 20 });
    } finally {
      setIsEnhancing(false);
    }
  };

  const getFilterString = () => {
    const b = filters.brightness / 100;
    const c = (filters.contrast + filters.sharpen * 0.5) / 100;
    const s = filters.saturate / 100;
    const sh = filters.sharpen / 100;
    const sw = filters.shadows / 100;
    return `brightness(${b}) contrast(${c}) saturate(${s}) contrast(${1 + sh * 0.2}) brightness(${1 + sh * 0.05}) drop-shadow(0 0 ${sw * 5}px rgba(0,0,0,0.5))`;
  };
  
  useEffect(() => {
    if (tg) {
      tg.ready();
      // Force expansion and fullscreen as early as possible
      const expandApp = () => {
        tg.expand();
        if (tg.requestFullscreen) {
          try { tg.requestFullscreen(); } catch(e) { /* ignore */ }
        }
      };
      expandApp();
      // Double check expansion after small delay to handle slow loads
      setTimeout(expandApp, 500);
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
        
        <header style={{ marginBottom: '50px', textAlign: 'right' }}>
          <div className="font-modern" style={{ 
            display: 'inline-block', padding: '6px 12px', background: 'rgba(234,179,8,0.1)',
            borderRadius: '8px', color: '#eab308', fontSize: '10px', fontWeight: '900',
            letterSpacing: '3px', marginBottom: '12px', textTransform: 'uppercase'
          }}>
            BeautyOS v2.2.9 • Ultra Premium
          </div>
          <h1 className="font-luxury" style={{ fontSize: '56px', fontWeight: '900', margin: '0', lineHeight: '1', letterSpacing: '-2px' }}>
            <span className="gold-text">AI</span> Creative
          </h1>
          <p className="font-modern" style={{ color: '#64748b', fontSize: '14px', marginTop: '10px', fontWeight: '400' }}>
            עיצוב תוכן ברמה של מותגי על
          </p>
        </header>

        {/* Post Designer View */}
        <section style={{ marginBottom: '50px' }}>
          <div className="glass-premium" style={{ 
            width: '100%', 
            aspectRatio: currentRatio, 
            borderRadius: '40px', 
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 50px 100px -20px rgba(0,0,0,0.9)',
            transition: 'aspect-ratio 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {imagePreview ? (
              <>
                <img 
                  src={imagePreview} 
                  alt="Post" 
                  style={{ 
                    width: '100%', height: '100%', objectFit: 'contain',
                    filter: isGenerating ? 'blur(20px) brightness(0.4)' : getFilterString(),
                    transition: 'all 0.4s ease',
                    backgroundColor: '#0a0a0f'
                  }} 
                />
                
                {/* AI Overlay Text - Clean Premium Label */}
                {generatedResults?.short_overlay && !isGenerating && !isEditing && (
                  <div style={{ 
                    position: 'absolute', bottom: '12%', left: '0', right: '0', textAlign: 'center',
                    padding: '0 40px', animation: 'luxuryFadeIn 1s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}>
                    <div className="glass-premium" style={{ 
                      display: 'inline-block', padding: '16px 32px', borderRadius: '20px', 
                      background: 'rgba(5,5,8,0.6)', color: 'white', fontWeight: '900', 
                      fontSize: '22px', border: '1px solid rgba(255,255,255,0.15)'
                    }}>
                      <div className="gold-text" style={{ fontSize: '9px', marginBottom: '4px', fontWeight: '900', letterSpacing: '2px' }}>
                        VISION CONCEPT
                      </div>
                      <span className="font-luxury">{generatedResults.short_overlay}</span>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="animate-spin" style={{ width: '60px', height: '60px', border: '2px solid rgba(234,179,8,0.1)', borderTopColor: '#eab308', borderRadius: '50%', margin: '0 auto' }} />
                      <div className="font-modern" style={{ marginTop: '20px', fontWeight: '900', fontSize: '11px', color: '#eab308', letterSpacing: '3px', textTransform: 'uppercase' }}>
                        מנתח ויזואלית...
                      </div>
                    </div>
                  </div>
                )}

                {/* Editor Panel Overlay */}
                {isEditing && (
                  <div className="glass-premium animate-luxury" style={{ 
                    position: 'absolute', inset: 0, background: 'rgba(5,5,8,0.7)', 
                    display: 'flex', flexDirection: 'column', padding: '30px', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-luxury" style={{ fontWeight: '900', fontSize: '18px' }}>Image Studio</span>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <button 
                          onClick={handleAIEnhance} 
                          disabled={isEnhancing}
                          className="gold-text" 
                          style={{ fontWeight: '900', fontSize: '12px', opacity: isEnhancing ? 0.5 : 1 }}
                        >
                          {isEnhancing ? 'ENHANCING...' : '✨ AI MAGIC'}
                        </button>
                        <button onClick={() => setIsEditing(false)} style={{ color: 'white', fontWeight: '900' }}>DONE</button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {[
                        { id: 'brightness', label: 'בהירות', icon: '☀️', min: 50, max: 150 },
                        { id: 'contrast', label: 'ניגודיות', icon: '🌓', min: 50, max: 150 },
                        { id: 'saturate', label: 'צבע', icon: '🌈', min: 0, max: 200 },
                        { id: 'sharpen', label: 'חידוד', icon: '✨', min: 0, max: 100 },
                        { id: 'shadows', label: 'צללים', icon: '👤', min: 0, max: 100 },
                      ].map(ctrl => (
                        <div key={ctrl.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '10px', color: '#666', fontWeight: '900', textTransform: 'uppercase' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{ctrl.icon} {ctrl.label}</div>
                            <span>{(filters as any)[ctrl.id]}%</span>
                          </div>
                          <input 
                            type="range" 
                            min={ctrl.min} 
                            max={ctrl.max} 
                            value={(filters as any)[ctrl.id]} 
                            onChange={(e) => {
                              setFilters(prev => ({ ...prev, [ctrl.id]: parseInt(e.target.value) }));
                              if (parseInt(e.target.value) % 5 === 0) haptic('light');
                            }}
                            style={{ width: '100%', accentColor: '#eab308' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Controls */}
                {!isEditing && (
                  <div style={{ position: 'absolute', top: '25px', left: '25px', display: 'flex', gap: '8px' }}>
                    <button onClick={handleReset} className="glass-premium" style={{ width: '40px', height: '40px', borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    <button onClick={() => setIsEditing(true)} className="glass-premium" style={{ width: '40px', height: '40px', borderRadius: '12px', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '900' }}>EDIT</span>
                    </button>
                    <button onClick={handleUploadClick} className="glass-premium" style={{ width: '40px', height: '40px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={18} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div 
                onClick={handleUploadClick}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <div className="gold-gradient" style={{ width: '80px', height: '80px', borderRadius: '25px', display: 'flex', color: 'black', marginBottom: '24px' }}>
                   <Camera size={32} style={{ margin: 'auto' }} />
                </div>
                <h3 className="font-luxury" style={{ fontWeight: '900', fontSize: '24px', color: 'white' }}>העלאת יצירה</h3>
                <p style={{ color: '#444', fontSize: '14px', marginTop: '8px' }}>לחצי לבחירת צילום מהגלריה</p>
              </div>
            )}
          </div>
        </section>

        {/* Social Network Picker */}
        <div style={{ marginBottom: '40px' }}>
           <div className="font-modern" style={{ fontSize: '10px', fontWeight: '900', color: '#444', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '2px' }}>
             בחירת פורמט פרסום
           </div>
           <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
             {socialNetworks.map(social => (
               <button
                 key={social.id}
                 onClick={() => { haptic('light'); setActiveSocial(social.id); }}
                 className="font-modern"
                 style={{
                   padding: '14px 20px', borderRadius: '16px', border: '1px solid',
                   borderColor: activeSocial === social.id ? '#eab308' : 'rgba(255,255,255,0.05)',
                   background: activeSocial === social.id ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.02)',
                   color: activeSocial === social.id ? '#eab308' : '#666',
                   fontWeight: '900', fontSize: '12px', transition: '0.4s ease', minWidth: '100px'
                 }}
               >
                 {social.id}
               </button>
             ))}
           </div>
        </div>

        {/* Generate Button */}
        {imagePreview && !generatedResults && (
           <button 
             disabled={isGenerating}
             onClick={handleGenerate}
             className="gold-gradient font-modern"
             style={{
               width: '100%', padding: '24px', borderRadius: '20px', border: 'none',
               color: 'black', fontWeight: '900', fontSize: '16px', letterSpacing: '1px',
               boxShadow: '0 20px 40px rgba(234,179,8,0.2)', cursor: 'pointer',
               transition: 'transform 0.2s'
             }}
           >
             <Sparkles size={20} style={{ marginLeft: '10px', verticalAlign: 'middle' }} />
             צור תוכן פרימיום ✨
           </button>
        )}

        {/* Post Results - The Masterpiece View */}
        {currentText && !isGenerating && (
          <div className="glass-premium animate-luxury" style={{ 
            borderRadius: '40px', padding: '40px', border: '1px solid rgba(255,255,255,0.08)'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="gold-gradient" style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', color: 'black' }}>
                    <Check size={16} style={{ margin: 'auto' }} />
                  </div>
                  <span className="font-luxury" style={{ fontWeight: '900', color: 'white', fontSize: '20px' }}>הטקסט המוכן</span>
                </div>
                <button onClick={handleGenerate} style={{ background: 'transparent', border: 'none', color: '#eab308', fontWeight: '900', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  לנסות שוב
                </button>
             </div>
             
             <p className="font-modern" style={{ 
               fontSize: '18px', lineHeight: '1.8', color: '#e2e8f0', whiteSpace: 'pre-wrap', 
               textAlign: 'right', fontWeight: '400', letterSpacing: '0.2px' 
             }}>
               {currentText}
             </p>
             
             <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                  <Sparkles size={14} color="#eab308" />
                  <span className="gold-text" style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>AI STRATEGY</span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                  נוצר באמצעות Gemini 3.1 Pro בהתאמה אישית לפרטי התמונה והסגנון הייחודי שלך.
                </p>
             </div>
          </div>
        )}

        <div className="font-modern" style={{ textAlign: 'center', marginTop: '100px', color: '#1a1a1f', fontSize: '10px', letterSpacing: '6px', fontWeight: '900' }}>
          BEAUTYOS • LUXURY AI SYSTEMS
        </div>
      </div>

      {/* Luxury Navigation */}
      <nav className="glass-premium" style={{
        position: 'fixed', bottom: '30px', left: '20px', right: '20px', height: '80px',
        borderRadius: '24px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100
      }}>
        {[
          { id: 'smart', label: 'סמארט', icon: <Sparkles size={24} color="#eab308" /> },
          { id: 'gallery', label: 'גלריה', icon: <Camera size={24} color="#444" /> },
          { id: 'profile', label: 'פרופיל', icon: <User size={24} color="#444" /> }
        ].map(item => (
          <div key={item.id} style={{ textAlign: 'center', cursor: 'pointer', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
            <div className="font-modern" style={{ fontSize: '9px', color: item.id === 'smart' ? '#eab308' : '#444', marginTop: '6px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</div>
          </div>
        ))}
      </nav>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 2s linear infinite; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Dashboard;
