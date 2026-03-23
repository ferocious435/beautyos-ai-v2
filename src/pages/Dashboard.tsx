import { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, User } from 'lucide-react'; 
import { useTelegram } from '../hooks/useTelegram';

const Dashboard = () => {
  const { tg, haptic, user } = useTelegram(); // Убрал неиспользуемые setMainButton, hideMainButton
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedVersions, setEnhancedVersions] = useState<string[]>([]);
  const [currentFormatIndex, setCurrentFormatIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Studio Info
  const [studioName, setStudioName] = useState(user?.first_name || 'סטודיו ליופי');
  const [address, setAddress] = useState('הזמינו תור עכשיו');
  
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
        haptic('light');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMagicFlow = async () => {
    if (!imagePreview) return;
    setIsEnhancing(true);
    haptic('heavy');
    
    try {
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''; 
      
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

      haptic('medium');
    } catch (e) {
      console.error(e);
      alert('שגיאה בעיבוד התמונה. נסי שוב.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setEnhancedVersions([]);
    haptic('light');
  };

  const currentDisplayImage = enhancedVersions.length > 0 ? enhancedVersions[currentFormatIndex] : imagePreview;
  const currentRatio = enhancedVersions.length > 0 
    ? (currentFormatIndex === 2 ? '9/16' : currentFormatIndex === 1 ? '4/5' : '1/1') 
    : '1/1';

  const formats = [
    { id: 'square', name: 'Instagram / Feed', index: 0 },
    { id: 'portrait', name: 'Instagram Portrait', index: 1 },
    { id: 'story', name: 'Stories / Reels', index: 2 }
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
            BeautyOS v2.3.1 • Magic Auto
          </div>
          <h1 className="font-luxury" style={{ fontSize: '48px', fontWeight: '900', margin: '0', lineHeight: '1', letterSpacing: '-1px' }}>
            <span className="gold-text">Beauty</span> Magic
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '10px' }}>
            מעלים תמונה - מקבלים פוסט מוכן מושלם.
          </p>
        </header>

        {/* Main Display Area */}
        <section style={{ marginBottom: '40px' }}>
          <div className="glass-premium" style={{ 
            width: '100%', 
            aspectRatio: currentRatio, 
            borderRadius: '32px', 
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            backgroundColor: '#0a0a0f'
          }}>
            {imagePreview ? (
              <>
                <img 
                  src={currentDisplayImage || ''} 
                  alt="Preview" 
                  style={{ 
                    width: '100%', height: '100%', objectFit: 'contain',
                    filter: isEnhancing ? 'blur(15px) brightness(0.5)' : 'none',
                    transition: 'all 0.4s ease'
                  }} 
                />
                
                {isEnhancing && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="animate-spin" style={{ width: '50px', height: '50px', border: '2px solid rgba(234,179,8,0.1)', borderTopColor: '#eab308', borderRadius: '50%', margin: '0 auto' }} />
                      <div style={{ marginTop: '20px', fontWeight: '900', fontSize: '12px', color: '#eab308', letterSpacing: '2px' }}>
                        מבצע קסמים ב-3 פורמטים...
                      </div>
                    </div>
                  </div>
                )}

                {/* Reset & Change Buttons */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '8px' }}>
                  <button onClick={handleReset} className="glass-premium" style={{ width: '36px', height: '36px', borderRadius: '10px', color: '#ef4444' }}>×</button>
                  <button onClick={handleUploadClick} className="glass-premium" style={{ width: '36px', height: '36px', borderRadius: '10px', color: 'white' }}>
                    <Camera size={16} />
                  </button>
                </div>

                {/* Format Indicator Dots */}
                {enhancedVersions.length > 0 && (
                  <div style={{ position: 'absolute', bottom: '15px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    {formats.map((_, idx) => (
                      <div 
                        key={idx}
                        style={{ 
                          width: idx === currentFormatIndex ? '16px' : '6px', 
                          height: '6px', 
                          borderRadius: '3px', 
                          background: idx === currentFormatIndex ? '#eab308' : 'rgba(255,255,255,0.2)',
                          transition: 'all 0.3s'
                        }} 
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div 
                onClick={handleUploadClick}
                style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <div className="gold-gradient" style={{ width: '64px', height: '64px', borderRadius: '20px', display: 'flex', color: 'black', marginBottom: '20px' }}>
                   <Camera size={28} style={{ margin: 'auto' }} />
                </div>
                <h3 style={{ fontWeight: '900', fontSize: '20px', color: 'white' }}>העלאת תמונה</h3>
                <p style={{ color: '#444', fontSize: '13px', marginTop: '6px' }}>לחצי לבחירה מהגלריה</p>
              </div>
            )}
          </div>
        </section>

        {/* Action / Settings Area */}
        {imagePreview && (
          <div className="animate-luxury">
            {enhancedVersions.length === 0 ? (
              <>
                <div className="glass-premium" style={{ marginBottom: '24px', padding: '20px', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', color: '#666', fontWeight: '900', display: 'block', marginBottom: '6px' }}>שם הסטודיו</label>
                      <input 
                        type="text" 
                        value={studioName} 
                        onChange={(e) => setStudioName(e.target.value)} 
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', color: 'white', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '10px', color: '#666', fontWeight: '900', display: 'block', marginBottom: '6px' }}>כתובת / טלפון</label>
                      <input 
                        type="text" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', color: 'white', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleMagicFlow}
                  disabled={isEnhancing}
                  className="gold-gradient"
                  style={{
                    width: '100%', padding: '20px', borderRadius: '16px', border: 'none',
                    color: 'black', fontWeight: '900', fontSize: '16px', cursor: 'pointer',
                    boxShadow: '0 15px 30px rgba(234,179,8,0.2)', opacity: isEnhancing ? 0.7 : 1
                  }}
                >
                  <Sparkles size={18} style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
                  ללחוץ לקסם ✨
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Format Selector */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
                  {formats.map(f => (
                    <button
                      key={f.id}
                      onClick={() => { haptic('light'); setCurrentFormatIndex(f.index); }}
                      style={{
                        padding: '12px 16px', borderRadius: '12px', border: '1px solid',
                        borderColor: currentFormatIndex === f.index ? '#eab308' : 'rgba(255,255,255,0.05)',
                        background: currentFormatIndex === f.index ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.02)',
                        color: currentFormatIndex === f.index ? '#eab308' : '#666',
                        fontWeight: '900', fontSize: '11px', whiteSpace: 'nowrap'
                      }}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>

                <button 
                   onClick={() => alert('מדהים! התמונות נשמרו.')}
                   className="gold-gradient"
                   style={{ width: '100%', padding: '20px', borderRadius: '16px', color: 'black', fontWeight: '900' }}
                 >
                   שמור את הכל 🚀
                 </button>
              </div>
            )}
          </div>
        )}

        <footer style={{ textAlign: 'center', marginTop: '80px', color: '#1a1a1f', fontSize: '10px', letterSpacing: '4px', fontWeight: '900' }}>
          BEAUTYOS • PREMIA AI
        </footer>
      </div>

      <nav className="glass-premium" style={{
        position: 'fixed', bottom: '25px', left: '20px', right: '20px', height: '70px',
        borderRadius: '20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}><Sparkles size={20} color="#eab308" /><div style={{ fontSize: '8px', color: '#eab308', marginTop: '4px', fontWeight: '900' }}>MAGIC</div></div>
        <div style={{ textAlign: 'center', flex: 1 }}><Camera size={20} color="#444" /><div style={{ fontSize: '8px', color: '#444', marginTop: '4px', fontWeight: '900' }}>GALLERY</div></div>
        <div style={{ textAlign: 'center', flex: 1 }}><User size={20} color="#444" /><div style={{ fontSize: '8px', color: '#444', marginTop: '4px', fontWeight: '900' }}>PROFILE</div></div>
      </nav>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 2s linear infinite; }
        ::-webkit-scrollbar { display: none; }
        .gold-text { background: linear-gradient(135deg, #eab308 0%, #fef08a 50%, #eab308 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .gold-gradient { background: linear-gradient(135deg, #eab308 0%, #fef08a 100%); }
        .glass-premium { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }
      `}</style>
    </div>
  );
};

export default Dashboard;
