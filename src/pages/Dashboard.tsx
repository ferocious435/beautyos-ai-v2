import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useAppStore } from '../store/useAppStore';

const Dashboard = () => {
  const { tg, haptic, user } = useTelegram();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedVersions, setEnhancedVersions] = useState<string[]>([]);
  
  const subscriptionTier = useAppStore((state) => state.user.subscriptionTier);
  const studioNameFromStore = useAppStore((state) => state.user.name);

  const [studioName, setStudioName] = useState(studioNameFromStore || 'סטודיו ליופי');
  const [address, setAddress] = useState('להזמנת תור ופרטים נוספים');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('Dashboard: Mounted, Tier:', subscriptionTier);
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, [tg, subscriptionTier]);

  return (
    <div style={{ backgroundColor: '#050508', minHeight: '100vh', color: 'white', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Beauty Magic (SAFE MODE)</h1>
      <p style={{ color: '#64748b', marginBottom: '40px' }}>אם אתם רואים את זה, המערכת עובדת!</p>
      
      <div style={{ background: '#111', padding: '30px', borderRadius: '20px', border: '1px solid #333' }}>
        <h2 style={{ color: '#eab308' }}>העלאת תמונה</h2>
        <button 
          onClick={() => fileInputRef.current?.click()}
          style={{ background: '#eab308', color: 'black', padding: '15px 30px', borderRadius: '10px', marginTop: '20px', fontWeight: 'bold' }}
        >
          בחר תמונה
        </button>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => {
           const file = e.target.files?.[0];
           if (file) setImagePreview(URL.createObjectURL(file));
        }} />
      </div>

      {imagePreview && (
        <div style={{ marginTop: '20px' }}>
          <img src={imagePreview} style={{ maxWidth: '100%', borderRadius: '10px' }} />
        </div>
      )}

      {subscriptionTier === 'free' && (
        <div style={{ marginTop: '40px', padding: '20px', border: '1px dashed yellow' }}>
          <p>שדרגו ל-PRO וקבלו יותר לקוחות!</p>
          <Link to="/pricing" style={{ color: 'yellow' }}>לפרטים נוספים</Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
ansparent; }
        .gold-gradient { background: linear-gradient(135deg, #eab308 0%, #fef08a 100%); transition: transform 0.2s; }
        .gold-gradient:active { transform: scale(0.98); }
        .glass-premium { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }
      `}</style>
    </div>
  );
};

export default Dashboard;
