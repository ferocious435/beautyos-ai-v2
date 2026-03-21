import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Send, User, MessageCircle, Send as TelegramIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const PostPreview = ({ type, imageUrl, userName = "Beauty_Master", caption = "" }: any) => {
  return (
    <div style={{ 
      overflow: 'hidden', 
      border: '1px solid rgba(255,255,255,0.1)', 
      background: 'rgba(255,255,255,0.03)', 
      borderRadius: '24px',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <User style={{ width: '24px', height: '24px', color: '#000' }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{userName}</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>{type}</p>
          </div>
        </div>
      </div>

      {/* Image Placeholder */}
      <div style={{ width: '100%', aspectRatio: '1/1', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imageUrl ? (
          <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Camera style={{ width: '48px', height: '48px', color: '#222' }} />
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
          <Sparkles style={{ width: '24px', height: '24px' }} />
          <MessageCircle style={{ width: '24px', height: '24px' }} />
          <Send style={{ width: '24px', height: '24px' }} />
        </div>
        <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#ccc', margin: 0 }}>
          {caption || "כאן יופיע הטקסט המעוצב של הפוסט שלך... ✨"}
        </p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeSocial, setActiveSocial] = useState('Instagram');
  const [clickCount, setClickCount] = useState(0);
  
  const socialNetworks = [
    { id: 'Instagram', name: 'Instagram' },
    { id: 'Facebook', name: 'Facebook' },
    { id: 'Telegram', name: 'Telegram' },
    { id: 'WhatsApp', name: 'WhatsApp' }
  ];

  return (
    <div style={{ 
      backgroundColor: '#0a0a20', /* DARK NAVY BLUE - VERY OBVIOUS CHANGE */
      minHeight: '100vh', 
      color: 'white', 
      direction: 'rtl', 
      padding: '0 20px',
      fontFamily: "'Outfit', sans-serif",
      width: '100%',
      position: 'relative'
    }}>
      {/* VERSION INDICATOR - VERY BRIGHT */}
      <div style={{ background: '#eab308', color: '#000', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999 }}>
         BUILD: v2.1.0 - REFRESH CONFIRMED (Clicks: {clickCount})
      </div>

      <div style={{ maxWidth: '440px', margin: '0 auto', paddingTop: '60px', paddingBottom: '160px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '60px' }}>
          <h1 className="gradient-text" style={{ fontSize: '42px', fontWeight: '900', margin: '0 0 12px 0', lineHeight: '1.1' }}>
            BeautyOS AI
          </h1>
          <p style={{ color: '#aaa', fontSize: '18px', fontWeight: '600', margin: 0 }}>
            השותף הדיגיטלי המקצועי שלך
          </p>
        </div>

        {/* Upload Button */}
        <div 
          onClick={() => setClickCount(prev => prev + 1)}
          style={{ 
            background: 'rgba(255,255,255,0.05)',
            padding: '60px 20px', 
            textAlign: 'center', 
            cursor: 'pointer', 
            border: '2px dashed #eab308', 
            borderRadius: '32px',
            marginBottom: '60px',
            boxShadow: '0 0 20px rgba(234,179,8,0.1)'
          }}
        >
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: '#111', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px auto', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)' 
          }}>
            <Camera style={{ width: '40px', height: '40px', color: '#eab308' }} />
          </div>
          <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#fff' }}>העלאת תמונה</p>
          <p style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
            לחצו כאן לעיבוד (Clicks: {clickCount})
          </p>
        </div>

        {/* Social Tabs */}
        <div style={{ marginBottom: '60px' }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', marginBottom: '16px', paddingRight: '10px' }}>
            בחר רשת חברתית:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {socialNetworks.map(s => (
              <button 
                key={s.id}
                onClick={() => setActiveSocial(s.id)}
                style={{ 
                  padding: '12px 4px', 
                  borderRadius: '16px', 
                  fontSize: '11px', 
                  fontWeight: '900',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeSocial === s.id ? '#eab308' : '#111',
                  color: activeSocial === s.id ? '#000' : '#555',
                  transition: 'all 0.2s ease'
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', borderRight: '5px solid #eab308', paddingRight: '15px', marginBottom: '32px' }}>
            תצוגה מקדימה
          </h2>
          <PostPreview type={activeSocial} />
        </div>

        {/* Main Action */}
        <button 
          className="btn-primary" 
          onClick={() => alert('הפוסט יעלה בקרוב!')}
          style={{ 
            width: '100%', 
            padding: '24px', 
            border: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '15px', 
            fontSize: '20px',
            borderRadius: '24px',
            cursor: 'pointer'
          }}
        >
          <TelegramIcon style={{ width: '28px', height: '28px' }} />
          פרסום עכשיו
        </button>

      </div>

      {/* Fixed Nav */}
      <div style={{ 
        position: 'fixed', 
        bottom: '0', 
        left: '0', 
        width: '100%', 
        padding: '24px', 
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        <div style={{ 
          maxWidth: '440px', 
          margin: '0 auto', 
          pointerEvents: 'auto', 
          background: 'rgba(10,10,12,0.96)', 
          backdropFilter: 'blur(30px)', 
          borderRadius: '32px', 
          border: '1px solid rgba(255,255,255,0.1)', 
          padding: '12px', 
          boxShadow: '0 -20px 60px rgba(0,0,0,0.9)' 
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none', color: '#eab308', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Sparkles style={{ width: '24px', height: '24px' }} />
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>סמארט</span>
            </Link>
            <Link to="/portfolio" style={{ textDecoration: 'none', color: '#555', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Camera style={{ width: '24px', height: '24px' }} />
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>גלריה</span>
            </Link>
            <div style={{ color: '#555', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <User style={{ width: '24px', height: '24px' }} />
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>פרופיל</span>
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '8px', color: '#222', marginTop: '10px', pointerEvents: 'none' }}>Version v2.0.5 Fix-Click</p>
      </div>
    </div>
  );
};

export default Dashboard;
