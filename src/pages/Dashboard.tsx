import { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, Check } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

const Dashboard = () => {
  const { tg, haptic, setMainButton, hideMainButton, user } = useTelegram();
  const safeUser = user || { first_name: 'Beauty Master', id: 'unknown' };

  const [activeSocial, setActiveSocial] = useState('Instagram');
  const [businessName] = useState(safeUser.first_name || 'Beauty Master');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [tg]);

  useEffect(() => {
    const currentText = generatedResults ? (generatedResults[activeSocial.toLowerCase()] || generatedResults.instagram) : null;
    if (tg && currentText && !isGenerating) {
      setMainButton('פרסום עכשיו ✨', () => {
        haptic('heavy');
        tg.sendData(JSON.stringify({ action: 'publish', text: currentText, social: activeSocial, image: imagePreview }));
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
      const baseUrl = window.location.origin; 
      const response = await fetch(`${baseUrl}/api/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imagePreview, format: activeSocial, businessName }),
      });
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setImagePreview(data.enhancedImage);
      setGeneratedResults({ instagram: data.post, whatsapp: data.post, facebook: data.post, telegram: data.post, short_overlay: data.service });
      haptic('medium');
    } catch (error) {
      console.error(error);
      alert('שגיאה בחיבור ל-AI.');
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
    <div className="animate-luxury" style={{ backgroundColor: '#050508', minHeight: '100vh', color: 'white', direction: 'rtl', padding: '0 20px', fontFamily: "'Assistant', sans-serif" }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
      <div style={{ maxWidth: '460px', margin: '0 auto', paddingTop: '40px', paddingBottom: '160px', opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease' }}>
        <header style={{ marginBottom: '50px', textAlign: 'right' }}>
          <h1 className="font-luxury" style={{ fontSize: '56px', fontWeight: '900', margin: '0' }}><span className="gold-text">AI</span> Creative</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '10px' }}>עיצוב תוכן ברמה של מותגי על</p>
        </header>

        <section style={{ marginBottom: '50px' }}>
          <div className="glass-premium" style={{ width: '100%', aspectRatio: currentRatio, borderRadius: '40px', overflow: 'hidden', position: 'relative' }}>
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: isGenerating ? 'blur(20px)' : 'none' }} />
                {generatedResults?.short_overlay && !isGenerating && (
                  <div style={{ position: 'absolute', bottom: '12%', left: '0', right: '0', textAlign: 'center' }}>
                    <div className="glass-premium" style={{ display: 'inline-block', padding: '16px 32px', borderRadius: '20px', background: 'rgba(5,5,8,0.6)' }}>
                       <span className="font-luxury">{generatedResults.short_overlay}</span>
                    </div>
                  </div>
                )}
                {isGenerating && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles className="animate-spin text-yellow-500" size={40} /></div>}
                <div style={{ position: 'absolute', top: '25px', left: '25px', display: 'flex', gap: '8px' }}>
                   <button onClick={handleReset} style={{ width: '40px', height: '40px', borderRadius: '12px', color: '#ef4444', backgroundColor: 'rgba(0,0,0,0.5)' }}>×</button>
                </div>
              </>
            ) : (
              <div onClick={handleUploadClick} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Camera size={32} className="text-yellow-500 mb-4" />
                <h3 className="font-luxury text-2xl font-black">העלאת יצירה</h3>
              </div>
            )}
          </div>
        </section>

        <div style={{ marginBottom: '40px' }}>
           <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
             {socialNetworks.map(social => (
               <button key={social.id} onClick={() => { haptic('light'); setActiveSocial(social.id); }} className={`p-4 rounded-2xl border ${activeSocial === social.id ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' : 'border-white/5 text-zinc-500'}`}>{social.id}</button>
             ))}
           </div>
        </div>

        {imagePreview && !generatedResults && (
           <button disabled={isGenerating} onClick={handleGenerate} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-200 p-6 rounded-3xl text-black font-black flex items-center justify-center gap-3">
             <Sparkles size={20} /> צור תוכן פרימיום ✨
           </button>
        )}

        {currentText && !isGenerating && (
          <div className="glass-premium p-10 rounded-[40px] border border-white/10">
             <p style={{ fontSize: '18px', lineHeight: '1.8', textAlign: 'right' }}>{currentText}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
