import { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, User, RotateCw, Check } from 'lucide-react';
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
      tg.expand();
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
    if (tg) tg.expand();
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
            letterSpacing: '2px', marginBottom: '16px'
          }}>
            BEAUTYOS AI v2.2.7 PREMIUM
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: '900', margin: '0', background: 'linear-gradient(135deg, white, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Studio
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
            border: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
            transition: 'aspect-ratio 0.5s ease'
          }}>
            {imagePreview ? (
              <>
                <img 
                  src={imagePreview} 
                  alt="Post" 
                  style={{ 
                    width: '100%', height: '100%', objectFit: 'cover',
                    filter: isGenerating ? 'blur(10px) grayscale(0.5)' : 'brightness(1.1) contrast(1.05)',
                    transition: 'all 0.5s ease'
                  }} 
                />
                
                {/* AI Overlay Text */}
                {generatedResults?.short_overlay && !isGenerating && (
                  <div style={{ 
                    position: 'absolute', bottom: '15%', left: '0', right: '0', textAlign: 'center',
                    padding: '0 20px', animation: 'fadeIn 1s ease-out'
                  }}>
                    <div style={{ 
                      display: 'inline-block', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                      padding: '12px 24px', borderRadius: '100px', border: '1px solid rgba(234,179,8,0.3)',
                      color: '#eab308', fontWeight: '900', fontSize: '20px', textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                      {generatedResults.short_overlay}
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <RotateCw className="animate-spin" size={48} color="#eab308" />
                      <div style={{ marginTop: '16px', fontWeight: '900', fontSize: '18px', color: '#eab308' }}>Gemini מעצב לך פוסט...</div>
                    </div>
                  </div>
                )}

                {/* Edit Controls */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', direction: 'ltr', display: 'flex', gap: '8px' }}>
                   <button onClick={handleReset} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,0,0,0.2)', color: 'white', border: 'none', backdropFilter: 'blur(10px)' }}>×</button>
                   <button onClick={handleUploadClick} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', backdropFilter: 'blur(10px)' }}><Camera size={18} /></button>
                </div>
              </>
            ) : (
              <div 
                onClick={handleUploadClick}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <div style={{ width: '80px', height: '80px', background: '#eab308', borderRadius: '30px', display: 'flex', color: 'black', marginBottom: '20px' }}>
                   <Camera size={40} style={{ margin: 'auto' }} />
                </div>
                <h3 style={{ fontWeight: '900', fontSize: '24px' }}>העלי תמונה ראשונה</h3>
                <p style={{ color: '#555' }}>לחצי כאן כדי להתחיל את הקסם</p>
              </div>
            )}
          </div>
        </section>

        {/* Social Network Picker */}
        <div style={{ 
          display: 'flex', gap: '10px', marginBottom: '30px', overflowX: 'auto', padding: '4px',
          background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {socialNetworks.map(social => (
            <button
              key={social.id}
              onClick={() => { haptic('light'); setActiveSocial(social.id); }}
              style={{
                padding: '10px 16px', borderRadius: '14px', border: 'none', whiteSpace: 'nowrap',
                background: activeSocial === social.id ? '#eab308' : 'transparent',
                color: activeSocial === social.id ? 'black' : '#666',
                fontWeight: '900', fontSize: '12px', transition: '0.3s'
              }}
            >
              {social.id}
            </button>
          ))}
        </div>

        {/* Generate Button / Post Text */}
        {imagePreview && !generatedResults && (
           <button 
             disabled={isGenerating}
             onClick={handleGenerate}
             style={{
               width: '100%', padding: '24px', borderRadius: '30px', border: 'none',
               background: 'linear-gradient(135deg, #eab308, #fbbf24)',
               color: 'black', fontWeight: '900', fontSize: '20px',
               boxShadow: '0 20px 40px rgba(234,179,8,0.3)', cursor: 'pointer'
             }}
           >
             <Sparkles size={24} style={{ marginLeft: '10px', verticalAlign: 'middle' }} />
             צור פוסט גאוני ✨
           </button>
        )}

        {currentText && !isGenerating && (
          <div style={{ 
            animation: 'fadeIn 0.5s ease-out', background: 'rgba(255,255,255,0.04)',
            borderRadius: '40px', padding: '30px', border: '1px solid rgba(255,255,255,0.1)'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <span style={{ fontWeight: '900', color: '#eab308' }}>טקסט הפוסט ✅</span>
                <button onClick={handleGenerate} style={{ background: 'transparent', border: 'none', color: '#666', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RotateCw size={14} /> נסה שוב
                </button>
             </div>
             <p style={{ fontSize: '18px', lineHeight: '1.8', color: '#eee', whiteSpace: 'pre-wrap', textAlign: 'right' }}>
               {currentText}
             </p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '60px', color: '#222', fontSize: '10px' }}>
          VER v2.2.7 DESIGNER CORE
        </div>
      </div>

      {/* Navigation */}
      <nav style={{
        position: 'fixed', bottom: '30px', left: '20px', right: '20px', height: '80px',
        background: 'rgba(15,15,20,0.8)', backdropFilter: 'blur(30px)', borderRadius: '30px',
        border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100
      }}>
        {[
          { id: 'smart', label: 'סמארט', icon: <Sparkles size={24} color="#eab308" /> },
          { id: 'gallery', label: 'גלריה', icon: <Camera size={24} color="#888" /> },
          { id: 'profile', label: 'פרופיל', icon: <User size={24} color="#888" /> }
        ].map(item => (
          <div key={item.id} style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
            <div style={{ fontSize: '10px', color: item.id === 'smart' ? '#eab308' : '#666', marginTop: '4px', fontWeight: 'bold' }}>{item.label}</div>
          </div>
        ))}
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Dashboard;
