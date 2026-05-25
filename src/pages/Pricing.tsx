import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { telegramAuthHeaders } from '../lib/telegramAuth';

const plans = [
  {
    id: 'essential',
    name: 'Essential',
    price: '29',
    description: 'ניהול חכם לעסק בתחילת הדרך',
    features: ['יומן תורים חכם', 'תזכורות אוטומטיות', '10 עבודות בגלריה', 'קישור אישי לעסק'],
    border: 'border-blue-500/30',
  },
  {
    id: 'pro',
    name: 'Pro Master',
    price: '69',
    description: 'כלי AI מלאים לצמיחה שוטפת',
    features: ['Beauty Studio ללא הגבלה', 'ניתוח טרנדים שבועי', 'גלריה ללא הגבלה', 'דירוג גבוה יותר בחיפוש'],
    popular: true,
    border: 'border-white/50',
  },
  {
    id: 'elite',
    name: 'Elite Partner',
    price: '149',
    description: 'שליטה מלאה בשיווק ובאוטומציה',
    features: ['בוט מותאם אישית', 'ניתוח גיאוגרפי של לקוחות', 'ליווי עסקי מבוסס AI', 'תמיכת VIP'],
    border: 'border-amber-500/30',
  },
];

const Pricing = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const user = useAppStore(state => state.user);
  const checkoutState = searchParams.get('checkout');

  const handleSubscribe = async (plan: string) => {
    if (!user.id) {
      setPaymentError('הפרופיל עדיין נטען. נסו שוב בעוד רגע.');
      return;
    }

    setLoading(plan);
    setPaymentError(null);
    try {
      const response = await fetch('/api/services?action=create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...telegramAuthHeaders() },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.code === 'PAYMENTS_NOT_CONFIGURED') {
          throw new Error('התשלומים עדיין לא הופעלו במערכת. אפשר להמשיך להשתמש באפליקציה ולחזור למסך הזה לאחר החיבור.');
        }
        throw new Error(data.error || 'שגיאה ביצירת תשלום');
      }

      if (!data.url) throw new Error('Stripe לא החזיר קישור תשלום.');
      window.location.href = data.url;
    } catch (err) {
      console.error('Subscription error:', err);
      setPaymentError(err instanceof Error ? err.message : 'חלה שגיאה בחיבור לתשלומים. נסו שוב מאוחר יותר.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] p-6 pb-24 text-white" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-2 py-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent"
          >
            מינוי BeautyOS
          </motion.h1>
          <p className="text-zinc-500">
            כאן בוחרים את חבילת השימוש במערכת. מחירי הטיפולים שלך מנוהלים במסך שירותים ומחירים.
          </p>
        </header>

        <div className="rounded-3xl border border-yellow-500/25 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
          זה לא המחירון שהלקוחות רואים. כדי לשנות מחיר של טיפול כמו איפור, עיסוי, שיער או ציפורניים, עברי למסך שירותים ומחירים.
        </div>

        {checkoutState === 'success' && (
          <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-100">
            המינוי הופעל בהצלחה. פרטי החשבון יתעדכנו אוטומטית אחרי אישור Stripe.
          </div>
        )}

        {checkoutState === 'cancelled' && (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
            התשלום בוטל. אפשר לבחור מסלול אחר או להמשיך להשתמש במערכת.
          </div>
        )}

        {paymentError && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            {paymentError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative rounded-[28px] border ${plan.border} bg-white/5 backdrop-blur-xl p-6 flex flex-col justify-between overflow-visible`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                  הכי פופולרי
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
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center gap-2 text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50 shrink-0" />
                      {feature}
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
          כל התשלומים עבור המינוי מאובטחים על ידי Stripe. ניתן לבטל את המינוי בכל עת.
        </footer>
      </div>
    </div>
  );
};

export default Pricing;
