import { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, User } from 'lucide-react';
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
    { id: 'Instagram', name: 'Instagram' },
    { id: 'Facebook', name: 'Facebook' },
    { id: 'Telegram', name: 'Telegram' },
    { id: 'WhatsApp', name: 'WhatsApp' }
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
      // Определяем URL API в зависимости от окружения
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://beautyos-ai-v2-server.vercel.app'; // Предполагаемый URL сервера

      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imagePreview,
          masterName: user?.first_name || 'Beauty Master'
        }),
      });

      if (!response.ok) throw new Error('API request failed');

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

  return (
    <div style={{ 
      backgroundColor: '#050508', 
      minHeight: '100vh', 
      color: 'white', 
      direction: 'rtl', 
      padding: '0 20px',
      fontFamily: "'Outfit', sans-serif",
      width: '100%',
      overflowX: 'hidden',
      backgroundImage: 'radial-gradient(circle at 50% 0%, #1a1a3a 0%, #050508 100%)',
      perspective: '1000px'
    }}>
      
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />

      <div style={{ 
        maxWidth: '440px', 
        margin: '0 auto', 
        paddingTop: '60px', 
        paddingBottom: '160px',
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(234,179,8,0.1)',
            borderRadius: '100px',
            color: '#eab308',
            fontSize: '12px',
            fontWeight: '900',
            letterSpacing: '2px',
            marginBottom: '16px'
          }}>
            BeautyOS AI v2.2.6
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: '900', margin: '0 0 8px 0', background: 'linear-gradient(135deg, white 0%, #888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BeautyOS AI
          </h1>
        </header>

        <section 
          onClick={!imagePreview ? handleUploadClick : undefined}
          style={{ 
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(25px)',
            padding: imagePreview ? '10px' : '60px 20px', 
            textAlign: 'center', 
            cursor: !imagePreview ? 'pointer' : 'default', 
            border: '2px dashed rgba(234,179,8,0.2)', 
            borderRadius: '40px',
            marginBottom: '40px',
            position: 'relative'
          }}
        >
          {imagePreview ? (
            <div style={{ position: 'relative' }}>
              <img src={imagePreview} alt="Target" style={{ width: '100%', borderRadius: '30px', maxHeight: '400px', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', gap: '10px', direction: 'ltr' }}>
                <button onClick={(e) => { e.stopPropagation(); handleReset(); }} style={{ background: 'rgba(255,0,0,0.8)', border: 'none', borderRadius: '12px', padding: '10px', color: 'white' }}>
                  <User size={20} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleUploadClick(); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '12px', padding: '10px', color: 'white', backdropFilter: 'blur(10px)' }}>
                  <Camera size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              <div style={{ width: '80px', height: '80px', background: '#eab308', borderRadius: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'black' }}>
                <Camera size={40} style={{ margin: 'auto' }} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '800' }}>העלאת תמונה</h2>
              <p style={{ color: '#666' }}>לחצי כאן כדי לבחור תמונה מהגלריה</p>
            </div>
          )}
        </section>

        {imagePreview && !currentText && (
          <button 
            disabled={isGenerating}
            onClick={handleGenerate}
            style={{
              width: '100%',
              padding: '24px',
              borderRadius: '25px',
              border: 'none',
              background: 'linear-gradient(135deg, #eab308 0%, #fbbf24 100%)',
              color: 'black',
              fontWeight: '900',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '40px',
              boxShadow: '0 20px 40px rgba(234,179,8,0.3)',
              cursor: 'pointer',
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            {isGenerating ? <Sparkles className="animate-spin" /> : <Sparkles />}
            {isGenerating ? 'מעבד תמונה (Gemini AI)...' : 'צור פוסט גאוני ✨'}
          </button>
        )}

        {currentText && (
          <div style={{ 
            animation: 'fadeIn 0.5s ease-out',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '40px',
            padding: '25px',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', background: '#eab308', borderRadius: '12px', display: 'flex', color: 'black' }}>
                  <User size={20} style={{ margin: 'auto' }} />
                </div>
                <span style={{ fontWeight: '800' }}>{activeSocial} Variant</span>
              </div>
              <button 
                onClick={handleGenerate}
                style={{ background: 'transparent', border: 'none', color: '#eab308', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                <Sparkles size={16} /> נסה שוב
              </button>
            </div>

            <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#eee', marginBottom: '20px', textAlign: 'right', whiteSpace: 'pre-wrap' }}>
              {currentText}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {socialNetworks.map(s => (
                <button 
                  key={s.id}
                  onClick={() => { haptic('light'); setActiveSocial(s.id); }}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '12px', 
                    border: 'none',
                    background: activeSocial === s.id ? '#eab308' : 'rgba(255,255,255,0.05)',
                    color: activeSocial === s.id ? 'black' : '#888',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    transition: '0.3s'
                  }}>
                  {s.id}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#333', fontSize: '12px' }}>
          Version v2.2.6 Real AI Power
        </div>
      </div>

      <nav style={{
        position: 'fixed', bottom: '30px', left: '20px', right: '20px', height: '80px',
        background: 'rgba(15,15,20,0.8)', backdropFilter: 'blur(30px)', borderRadius: '30px',
        border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center'
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
