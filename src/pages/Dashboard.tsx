import { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, User, MessageCircle, Send as TelegramIcon, RefreshCw, Edit3, Trash2, Wand2 } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

const Dashboard = () => {
  const { tg, haptic, setMainButton, hideMainButton } = useTelegram();
  const [activeSocial, setActiveSocial] = useState('Instagram');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand(); // Принудительно на весь экран
      tg.enableClosingConfirmation();
    }
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [tg]);

  useEffect(() => {
    if (tg && generatedText && !isGenerating) {
      setMainButton('פרסום עכשיו ✨', () => {
        haptic('heavy');
        tg.sendData(JSON.stringify({ action: 'publish', text: generatedText, social: activeSocial }));
        alert('הפוסט נשלח לבוט לפרסום!');
      });
    } else {
      hideMainButton();
    }
  }, [tg, haptic, setMainButton, hideMainButton, generatedText, isGenerating, activeSocial]);

  const socialNetworks = [
    { id: 'Instagram', name: 'Instagram' },
    { id: 'Facebook', name: 'Facebook' },
    { id: 'Telegram', name: 'Telegram' },
    { id: 'WhatsApp', name: 'WhatsApp' }
  ];

  const handleUploadClick = () => {
    if (tg) tg.expand(); // Еще раз расширяем при взаимодействии
    haptic('medium');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setGeneratedText(null); // Сброс при новом фото
        haptic('light');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    if (!imagePreview) return;
    setIsGenerating(true);
    haptic('heavy');
    
    // Имитация работы AI (Gemini)
    setTimeout(() => {
      const texts = [
        "העבודה המושלמת שלי להיום! ✨ ציפורניים מעוצבות בסגנון נקי ואלגנטי. מה אתן אומרות?",
        "סטייל זה הכל! 💅 שילוב של קלאסיקה ומודרניות. תייגי חברה שחייבת כזה!",
        "פינוק אמיתי לידיים שלך 🌸 יום של יופי בסטודיו שלנו. מחכה לכן!",
        "Nail Art ברמה אחרת 🚀 דיוק, איכות וסטייל ללא פשרות."
      ];
      setGeneratedText(texts[Math.floor(Math.random() * texts.length)]);
      setIsGenerating(false);
      haptic('medium');
    }, 2500);
  };

  const handleReset = () => {
    setImagePreview(null);
    setGeneratedText(null);
    haptic('light');
  };

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
        
        {/* Header */}
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
            BeautyOS AI v2.2.5
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: '900', margin: '0 0 8px 0', background: 'linear-gradient(135deg, white 0%, #888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BeautyOS AI
          </h1>
        </header>

        {/* Upload/Preview Section */}
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
              <div style={{ position: 'absolute', top: '15px', left: '15px', display: 'flex', gap: '10px' }}>
                <button onClick={handleReset} style={{ background: 'rgba(255,0,0,0.8)', border: 'none', borderRadius: '12px', padding: '10px', color: 'white' }}>
                  <Trash2 size={20} />
                </button>
                <button onClick={handleUploadClick} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '12px', padding: '10px', color: 'white', backdropFilter: 'blur(10px)' }}>
                  <Edit3 size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              <div style={{ width: '80px', height: '80px', background: '#eab308', borderRadius: '25px', display: 'flex', alignItems: 'center', justifyCenter: 'center', margin: '0 auto 20px', color: 'black' }}>
                <Camera size={40} style={{ margin: 'auto' }} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '800' }}>העלאת תמונה</h2>
              <p style={{ color: '#666' }}>לחצי כאן כדי לבחור תמונה מהגלריה</p>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        {imagePreview && !generatedText && (
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
            {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 />}
            {isGenerating ? 'מעבד תמונה...' : 'צור פוסט גאוני ✨'}
          </button>
        )}

        {/* Post Result Section */}
        {generatedText && (
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
                <span style={{ fontWeight: '800' }}>תצוגה מקדימה: {activeSocial}</span>
              </div>
              <button 
                onClick={handleGenerate}
                style={{ background: 'transparent', border: 'none', color: '#eab308', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                <RefreshCw size={16} /> נסה שוב
              </button>
            </div>

            <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#eee', marginBottom: '20px' }}>
              {generatedText}
            </p>

            <div style={{ display: 'flex', gap: '15px' }}>
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
                    fontWeight: 'bold'
                  }}>
                  {s.id}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#333', fontSize: '12px' }}>
          Version v2.2.5 Ultra Logic
        </div>
      </div>

      {/* Navigation */}
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
            {item.icon}
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
