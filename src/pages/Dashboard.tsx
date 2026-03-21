import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Send, User, MessageCircle, Send as TelegramIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const PostPreview = ({ type, imageUrl, userName = "Beauty_Master", caption = "" }: any) => {
  return (
    <div className="glass-card" style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', borderRadius: '24px' }}>
      {/* Header */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eab308', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
             <User style={{ width: '24px', height: '24px', color: '#000' }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{userName}</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>{type}</p>
          </div>
        </div>
      </div>

      {/* Image Container */}
      <div style={{ width: '100%', aspectRatio: '1/1', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imageUrl ? (
          <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' } as any} />
        ) : (
          <Camera style={{ width: '48px', height: '48px', color: '#222' }} />
        )}
      </div>

      {/* Content Area */}
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
  
  const socialNetworks = [
    { id: 'Instagram', name: 'Instagram' },
    { id: 'Facebook', name: 'Facebook' },
    { id: 'Telegram', name: 'Telegram' },
    { id: 'WhatsApp', name: 'WhatsApp' }
  ];

  return (
    <div className="bg-[#050505] min-h-screen text-white" style={{ direction: 'rtl', padding: '0 20px' }}>
      {/* Container with forced margins */}
      <div style={{ maxWidth: '440px', margin: '0 auto', paddingTop: '40px', paddingBottom: '120px' }}>
        
        {/* Header Block */}
        <div style={{ marginBottom: '60px' }}>
          <h1 className="gradient-text" style={{ fontSize: '42px', fontWeight: '900', margin: '0 0 12px 0', lineHeight: '1.1' }}>BeautyOS AI</h1>
          <p style={{ color: '#666', fontSize: '18px', fontWeight: '600', margin: 0 }}>השותף הדיגיטלי המקצועי שלך</p>
        </div>

        {/* Upload Block */}
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', cursor: 'pointer', border: '2px dashed rgba(255,255,255,0.05)', marginBottom: '60px' }}>
          <div style={{ width: '80px', height: '80px', background: '#111', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <Camera style={{ width: '40px', height: '40px', color: '#444' }} />
          </div>
          <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0' }}>העלאת תמונה</p>
          <p style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>לחצו כאן לעיבוד ופרסום</p>
        </div>

        {/* Social Networks Tabs */}
        <div style={{ marginBottom: '60px' }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', marginBottom: '16px', paddingRight: '10px' }}>בחר רשת חברתית:</p>
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
                  transition: 'all 0.3s',
                  background: activeSocial === s.id ? '#eab308' : '#111',
                  color: activeSocial === s.id ? '#000' : '#555'
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
    </div>
  );
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
