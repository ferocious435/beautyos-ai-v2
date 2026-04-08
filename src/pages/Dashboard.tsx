/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';

// Обход ошибок типизации в текущем окружении tsc
const { 
  Camera, 
  Sparkles, 
  Bookmark, 
  CheckCircle, 
  LoaderCircle 
} = Lucide as any;
import { useTelegram } from '../hooks/useTelegram';
import { supabase } from '../lib/supabaseClient';
import { useAppStore } from '../store/useAppStore';

const Dashboard = () => {
  const { tg, haptic, setMainButton, hideMainButton, user } = useTelegram();
  const safeUser = user || { first_name: 'Beauty Master', id: 'unknown' };

  const [activeSocial, setActiveSocial] = useState('Instagram');
  const [businessName] = useState(safeUser.first_name || 'Beauty Master');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // New State for Real Data
  const [stats, setStats] = useState({ views: 0, appointments: 0 });
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const appUser = useAppStore(state => state.user);
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
    const fetchData = async () => {
      if (!appUser.id) return;
      setIsLoadingData(true);
      try {
        // 1. Fetch Stats (Profile Views)
        const { count: viewsCount } = await supabase
          .from('analytics_events')
          .select('*', { count: 'exact', head: true })
          .eq('master_id', appUser.id)
          .eq('event_type', 'profile_view');

        // 2. Fetch Appointments count (Last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: bookCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('master_id', appUser.id)
          .gte('created_at', weekAgo.toISOString());

        setStats({ views: viewsCount || 0, appointments: bookCount || 0 });

        // 3. Fetch Bookings
        const { data: allBookings } = await supabase
          .from('bookings')
          .select('id, start_time, status, client:client_id (full_name)')
          .eq('master_id', appUser.id)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true });

        const pending = allBookings?.filter((b: any) => b.status === 'pending') || [];
        const upcoming = allBookings?.filter((b: any) => b.status === 'confirmed').slice(0, 5) || [];

        setPendingBookings(pending);
        setUpcomingBookings(upcoming);
      } catch (err) {
        console.error('DASHBOARD: Error fetching data:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [appUser.id]);

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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI Connection Error: ${errorData.error || 'Unknown'}\nDetails: ${JSON.stringify(errorData.details)}\nModel: ${errorData.model}`);
      }
      const data = await response.json();
      setImagePreview(data.enhancedImage);
      setGeneratedResults({ instagram: data.post, whatsapp: data.post, facebook: data.post, telegram: data.post, short_overlay: data.service });
      haptic('medium');
    } catch (error: any) {
      console.error(error);
      alert(`שגיאה בחיבור ל-AI:\n${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!imagePreview || !user?.id) return;
    setIsSaving(true);
    haptic('medium');
    try {
      const { error } = await supabase
        .from('portfolio')
        .insert([{ 
          user_id: user.id.toString(), 
          image_url: imagePreview,
          type: 'ai_creation',
          metadata: { format: activeSocial, businessName }
        }]);

      if (error) throw error;
      setSaveSuccess(true);
      haptic('success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving to gallery:', err);
      alert('שגיאה בשמירה לגלריה.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setGeneratedResults(null);
    haptic('light');
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      const resp = await fetch('/api/services?action=approve-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      if (resp.ok) {
        haptic('success');
        const approved = pendingBookings.find(b => b.id === bookingId);
        setPendingBookings(prev => prev.filter(b => b.id !== bookingId));
        if (approved) {
          setUpcomingBookings(prev => [...prev, { ...approved, status: 'confirmed' }].sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
        }
      }
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    if (!window.confirm('האם לדחות את בקשת התור? הלקוח/ה יקבל הודעה.')) return;
    try {
      const resp = await fetch('/api/services?action=reject-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      if (resp.ok) {
        haptic('medium');
        setPendingBookings(prev => prev.filter(b => b.id !== bookingId));
      }
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('האם את בטוחה שברצונך לבטל את התור? הלקוח/ה יקבל הודעה אוטומטית.')) return;
    
    try {
      const response = await fetch('/api/services?action=cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, userId: appUser.id, role: 'master' })
      });
      
      if (response.ok) {
        haptic('success');
        setUpcomingBookings(prev => prev.filter(b => b.id !== bookingId));
      } else {
        throw new Error('Failed to cancel');
      }
    } catch (err) {
       console.error('Cancel error:', err);
       alert('שגיאה בביטול התור');
    }
  };

  const currentText = generatedResults ? (generatedResults[activeSocial.toLowerCase()] || generatedResults.instagram) : null;
  const currentRatio = socialNetworks.find(s => s.id === activeSocial)?.ratio || '1/1';

  return (
    <div className="animate-luxury" style={{ backgroundColor: '#050508', minHeight: '100vh', color: 'white', direction: 'rtl', padding: '0 20px', fontFamily: "'Assistant', sans-serif" }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
      <div style={{ maxWidth: '460px', margin: '0 auto', paddingTop: '40px', paddingBottom: '160px', opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease' }}>
        <header style={{ marginBottom: '30px', textAlign: 'right' }}>
          <h1 className="font-luxury" style={{ fontSize: '48px', fontWeight: '900', margin: '0' }}>שלוום, <span className="gold-text">{appUser.name.split(' ')[0]}</span></h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>הנה מה שקורה בעסק שלך היום</p>
        </header>

        {/* --- Stats Grid --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '40px' }}>
          <div className="glass-premium" style={{ padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>צפיות בפרופיל</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'white' }}>{isLoadingData ? '...' : stats.views}</div>
          </div>
          <div className="glass-premium" style={{ padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: '#eab308', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>תורים חדשים</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'white' }}>{isLoadingData ? '...' : stats.appointments}</div>
          </div>
        </div>

        {/* --- Pending Requests --- */}
        {pendingBookings.length > 0 && (
          <section style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308', boxShadow: '0 0 10px #eab308' }}></div>
               <h3 className="font-luxury" style={{ fontSize: '18px', fontWeight: '800' }}>בקשות ממתינות ({pendingBookings.length})</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingBookings.map(request => (
                <div key={request.id} className="glass-premium" style={{ padding: '15px', borderRadius: '24px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '20px' }}>🔔</div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '800' }}>{request.client?.full_name || 'לקוח/ה'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(request.start_time).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <button 
                         onClick={() => handleApproveBooking(request.id)}
                         style={{ padding: '10px 15px', borderRadius: '12px', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', fontWeight: '900', fontSize: '13px' }}
                       >
                         אישור
                       </button>
                       <button 
                         onClick={() => handleRejectBooking(request.id)}
                         style={{ padding: '10px 15px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: '900', fontSize: '13px' }}
                       >
                         דחייה
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- Upcoming Appointments --- */}
        <section style={{ marginBottom: '50px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="font-luxury" style={{ fontSize: '20px', fontWeight: '700' }}>תורים קרובים</h3>
            <span style={{ fontSize: '12px', color: '#eab308', fontWeight: 'bold' }}>הכל</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isLoadingData ? (
              [1,2].map(i => <div key={i} className="glass-premium animate-pulse" style={{ height: '70px', borderRadius: '20px' }} />)
            ) : upcomingBookings.length > 0 ? (
              upcomingBookings.map(booking => (
                <div key={booking.id} className="glass-premium" style={{ padding: '15px 20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308', fontWeight: 'bold', fontSize: '14px' }}>
                        {new Date(booking.start_time).getHours()}:{new Date(booking.start_time).getMinutes().toString().padStart(2, '0')}
                     </div>
                     <div>
                        <div style={{ fontSize: '15px', fontWeight: '700' }}>{booking.client?.full_name || 'לקוח/ה'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(booking.start_time).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(74, 222, 128, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>{booking.status === 'confirmed' ? 'מאושר' : 'ממתין'}</div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCancelBooking(booking.id); }}
                      style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                    >
                      <Lucide.X size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-premium" style={{ padding: '30px', textAlign: 'center', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#64748b', fontSize: '14px' }}>אין תורים קרובים להיום</p>
              </div>
            )}
          </div>
        </section>

        <section style={{ marginBottom: '50px' }}>
          <div style={{ marginBottom: '20px' }}>
             <h3 className="font-luxury" style={{ fontSize: '20px', fontWeight: '700' }}>AI Design Studio</h3>
          </div>
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
              {isGenerating ? (
                <LoaderCircle className="animate-spin text-yellow-500" size={40} />
              ) : null}
                <div style={{ position: 'absolute', top: '25px', left: '25px', display: 'flex', gap: '8px' }}>
                   <button onClick={handleReset} style={{ width: '40px', height: '40px', borderRadius: '12px', color: '#ef4444', backgroundColor: 'rgba(0,0,0,0.5)' }}>×</button>
                </div>
                {generatedResults && !isGenerating && (
                  <button 
                    onClick={handleSaveToGallery} 
                    disabled={isSaving || saveSuccess}
                    className="glass-premium" 
                    style={{ 
                      position: 'absolute', 
                      top: '25px', 
                      right: '25px', 
                      padding: '12px 20px', 
                      borderRadius: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      color: saveSuccess ? '#4ade80' : '#eab308' 
                    }}
                  >
                    {isSaving ? <LoaderCircle className="animate-spin" size={16} /> : (saveSuccess ? <CheckCircle size={16} /> : <Bookmark size={16} />)}
                    <span className="text-xs font-bold uppercase tracking-wider">{saveSuccess ? 'נשמר' : 'שמור בגלריה'}</span>
                  </button>
                )}
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
