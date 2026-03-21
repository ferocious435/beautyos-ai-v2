import { useState, useEffect } from 'react';
import { Camera, Sparkles, User, MessageCircle, Send as TelegramIcon } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

const Dashboard = () => {
  const { tg, haptic, setMainButton, hideMainButton } = useTelegram();
  const [activeSocial, setActiveSocial] = useState('Instagram');
  const [clickCount, setClickCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Подключаем нативную кнопку Telegram
    if (tg) {
      setMainButton('פרסום עכשיו ✨', () => {
        haptic('heavy');
        alert('הפוסט נשלח לפרסום!');
      });
    }
    return () => hideMainButton();
  }, [tg, haptic, setMainButton, hideMainButton]);

  const socialNetworks = [
    { id: 'Instagram', name: 'Instagram' },
    { id: 'Facebook', name: 'Facebook' },
    { id: 'Telegram', name: 'Telegram' },
    { id: 'WhatsApp', name: 'WhatsApp' }
  ];

  const handleUpload = () => {
    haptic('medium');
    setClickCount((prev: number) => prev + 1);
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
      
      <div style={{ 
        maxWidth: '440px', 
        margin: '0 auto', 
        paddingTop: '60px', 
        paddingBottom: '160px',
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Header (Antigravity) */}
        <header style={{ marginBottom: '60px', textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(234,179,8,0.1)',
            borderRadius: '100px',
            color: '#eab308',
            fontSize: '12px',
            fontWeight: '900',
            letterSpacing: '2px',
            marginBottom: '16px',
            textTransform: 'uppercase'
          }}>
            BeautyOS AI v2.2
          </div>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: '900', 
            margin: '0 0 8px 0', 
            background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: '1'
          }}>
            BeautyOS
          </h1>
          <p style={{ color: '#aaa', fontSize: '16px', fontWeight: '400', margin: 0 }}>
            השותף הдиגיטלי המקצועי שלך לעיצוב תוכן
          </p>
        </header>

        {/* Floating Upload Module */}
        <section 
          onClick={handleUpload}
          style={{ 
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(25px)',
            padding: '50px 20px', 
            textAlign: 'center', 
            cursor: 'pointer', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '40px',
            marginBottom: '80px',
            boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
            transform: 'translateZ(20px)',
            transition: 'all 0.4s ease'
          }}
        >
          <div style={{ 
            width: '90px', 
            height: '90px', 
            background: 'linear-gradient(135deg, #eab308 0%, #fbbf24 100%)', 
            borderRadius: '30px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px auto', 
            boxShadow: '0 20px 40px rgba(234,179,8,0.3)',
            transform: 'rotate(-5deg)'
          }}>
            <Camera style={{ width: '40px', height: '40px', color: '#000' }} />
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 12px 0', color: '#fff' }}>העלאת תמונה חכמה</h3>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6', margin: 0 }}>
            גררו לכאן או לחצו כדי להתחיל<br/>
            מעובד ע״י <span style={{ color: '#eab308' }}>Gemini 3.1 Pro</span>
          </p>
          {clickCount > 0 && (
            <div style={{ marginTop: '20px', color: '#eab308', fontWeight: 'bold' }}>
               ✓ מוכן לעיבוד (Clicks: {clickCount})
            </div>
          )}
        </section>

        {/* Social Switcher */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '40px', 
          background: 'rgba(255,255,255,0.02)', 
          padding: '8px', 
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.05)',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {socialNetworks.map(social => (
            <button
              key={social.id}
              onClick={() => { haptic('light'); setActiveSocial(social.id); }}
              style={{
                padding: '12px 20px',
                borderRadius: '16px',
                border: 'none',
                background: activeSocial === social.id ? '#eab308' : 'transparent',
                color: activeSocial === social.id ? '#000' : '#888',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {social.id}
            </button>
          ))}
        </div>

        {/* Post Preview (3D Perspective) */}
        <div style={{ 
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '40px',
          padding: '30px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
          transform: 'rotateX(5deg) rotateY(-2deg)',
          marginBottom: '80px',
          backdropFilter: 'blur(15px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              background: '#222', 
              borderRadius: '15px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <User size={24} color="#888" />
            </div>
            <div>
              <div style={{ fontWeight: '900', fontSize: '18px' }}>יופי מאסטר</div>
              <div style={{ color: '#666', fontSize: '12px' }}>{activeSocial} Profile</div>
            </div>
          </div>

          <div style={{ 
            aspectRatio: '1', 
            background: 'linear-gradient(45deg, #111 0%, #222 100%)', 
            borderRadius: '25px', 
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
             <Camera size={48} color="#333" />
             <div style={{ 
               position: 'absolute', 
               bottom: '15px', 
               right: '15px', 
               background: 'rgba(0,0,0,0.6)', 
               padding: '8px 15px', 
               borderRadius: '100px', 
               fontSize: '10px',
               backdropFilter: 'blur(10px)',
               border: '1px solid rgba(255,255,255,0.1)'
             }}>
               Preview Image
             </div>
          </div>

          <p style={{ 
            fontSize: '18px', 
            lineHeight: '1.8', 
            color: '#eee', 
            marginBottom: '20px', 
            textAlign: 'right' 
          }}>
            הטקסט של הפוסט המעוצב שלך יופיע כאן... ✨
            #יופי #טיפוח #סטייל
          </p>

          <div style={{ display: 'flex', gap: '20px', color: '#555' }}>
            <Camera size={20} />
            <MessageCircle size={20} />
            <TelegramIcon size={20} />
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#333', fontSize: '12px' }}>
          Version v2.2.0 Ultra Glass
        </div>
      </div>

      {/* Floating Bottom Nav */}
      <nav style={{
        position: 'fixed',
        bottom: '30px',
        left: '20px',
        right: '20px',
        height: '80px',
        background: 'rgba(15,15,20,0.7)',
        backdropFilter: 'blur(30px)',
        borderRadius: '30px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 20px',
        zIndex: 1000,
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
      }}>
        {[
          { id: 'smart', label: 'סמארט', icon: <Sparkles size={24} color="#eab308" /> },
          { id: 'gallery', label: 'גלריה', icon: <Camera size={24} color="#888" /> },
          { id: 'profile', label: 'פרופיל', icon: <User size={24} color="#888" /> }
        ].map(item => (
          <div key={item.id} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ 
              width: '45px', 
              height: '45px', 
              borderRadius: '15px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: item.id === 'smart' ? 'rgba(234,179,8,0.1)' : 'transparent'
            }}>
              {item.icon}
            </div>
            <span style={{ fontSize: '10px', fontWeight: '900', color: item.id === 'smart' ? '#eab308' : '#666' }}>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Dashboard;
