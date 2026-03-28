import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

const Pricing = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const user = useAppStore(state => state.user);

  const plans = [
    {
      id: 'essential',
      name: 'Essential',
      price: '29',
      description: 'ניהול חכם של העסק',
      features: ['ניהול תורים חכם', 'תזכורות אוטומטיות', '10 מקומות בגלריה', 'לינק אישי לעסק'],
      color: 'from-blue-500/20 to-blue-600/20',
      border: 'border-blue-500/30'
    },
    {
      id: 'pro',
      name: 'Pro Master',
      price: '69',
      description: 'הכוח של הבינה המלאכותית',
      features: ['AI Beauty Studio ללא הגבלה', 'ניתוח טרנדים שבועי', 'גלריה ללא הגבלה', 'דירוג גבוה בחיפוש'],
      popular: true,
      color: 'from-purple-500/20 to-pink-600/20',
      border: 'border-white/50'
    },
    {
      id: 'elite',
      name: 'Elite Partner',
      price: '149',
      description: 'שליטה מלאה בשוק',
      features: ['בוט מותאם אישית (White-label)', 'ניתוח גיאוגרפי של לקוחות', 'ליווי עסקי מבוסס AI', 'תמיכת VIP'],
      color: 'from-amber-500/20 to-orange-600/20',
      border: 'border-amber-500/30'
    }
  ];

  const handleSubscribe = async (plan: string) => {
    if (!user.id) {
       alert('אנא המתן עד לטעינת הפרופיל');
       return;
    }
    
    setLoading(plan);
    try {
      const response = await fetch('/api/services?action=create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, plan })
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'שגיאה ביצירת תשלום');
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      alert('חלה שגיאה בחיבור ל-Stripe. אנא נסה שוב מאוחר יותר.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] p-6 pb-24 RTL" style={{ direction: 'rtl' }}>
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-2 py-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent"
          >
            בחרי את המינוי שלך
          </motion.h1>
          <p className="text-zinc-500">כלים שנועדו להזניק את העסק שלך קדימה</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative rounded-[32px] border ${plan.border} bg-white/5 backdrop-blur-xl p-6 flex flex-col justify-between overflow-visible`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                  הכי פופולרי ✨
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                  <p className="text-sm text-zinc-500">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₪{plan.price}</span>
                  <span className="text-zinc-500 text-sm">/לחודש</span>
                </div>

                <ul className="space-y-3 pt-4 border-t border-white/5 text-sm">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={!!loading}
                className={`mt-8 w-full py-4 rounded-2xl font-black transition-all ${
                  plan.popular 
                    ? 'bg-white text-black hover:bg-zinc-200' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                } ${loading === plan.id ? 'opacity-50' : ''} active:scale-95`}
              >
                {loading === plan.id ? 'מתחבר ל-Stripe...' : 'בחירה במסלול'}
              </button>
            </motion.div>
          ))}
        </div>
        
        <footer className="text-center text-zinc-600 text-xs py-8">
          כל התשלומים מאובטחים על ידי Stripe. ניתן לבטל את המינוי בכל עת.
        </footer>
      </div>
    </div>
  );
};

export default Pricing;
