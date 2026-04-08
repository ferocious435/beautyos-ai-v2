 
 
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useTelegram } from '../hooks/useTelegram';
import { Sparkles, Check, User } from 'lucide-react';

const Settings = () => {
  const { user, haptic } = useTelegram();
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const { data } = await supabase.from('users').select('*').eq('telegram_id', user.id).single();
        if (data) {
          setBusinessName(data.business_name || '');
          setAddress(data.address || '');
        }
      }
    };
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    haptic('heavy');
    try {
      if (user?.id) {
        await supabase
          .from('users')
          .update({ business_name: businessName, address })
          .eq('telegram_id', user.id);
        alert('הגדרות נשמרו בהצלחה! ✨');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-[#050508] min-h-screen text-white text-right" style={{ direction: 'rtl' }}>
      <header className="mb-10">
        <h1 className="text-4xl font-black mb-2">הגדרות סטודיו</h1>
        <p className="text-zinc-500">נהלי את המותг שלך ב-Luxury Style</p>
      </header>

      <div className="space-y-6 max-w-md mx-auto">
        <div className="space-y-4">
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-2">שם העסק (יופיע на התמונות)</label>
          <input 
            type="text" 
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-yellow-500 transition-all outline-none"
            placeholder="למשל: Beauty Art Studio"
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-2">כתובת הסטודיו</label>
          <input 
            type="text" 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-yellow-500 transition-all outline-none"
            placeholder="למשל: הרצל 10, תל אביב"
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-200 p-4 rounded-2xl text-black font-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          {isSaving ? <Sparkles className="animate-spin" /> : <Check size={20} />}
          שמירת שינויים
        </button>

        <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/5">
          <div className="flex items-center gap-3 mb-4 text-yellow-500">
            <User size={20} />
            <span className="font-black text-xs uppercase tracking-widest">Privacy & Data</span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            הנתונים שלך מאובטחים. אנחנו משתמשים ב-Gemini 3.1 Pro כדי להבטיח את איכות התוכן.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
