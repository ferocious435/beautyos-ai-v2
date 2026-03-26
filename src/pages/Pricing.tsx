import { useState } from 'react';
import { motion } from 'framer-motion';

const Pricing = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      id: 'essential',
      name: 'Essential',
      price: '29',
      description: 'Автоматизация рутины',
      features: ['Native Booking', 'Smart Reminders', '10 Portfolio slots'],
      color: 'from-blue-500/20 to-blue-600/20',
      border: 'border-blue-500/30'
    },
    {
      id: 'pro',
      name: 'Pro Master',
      price: '69',
      description: 'Маркетинг и рост',
      features: ['Unlimited AI', 'Priority Search', 'Unlimited Portfolio', 'Smart Analytics'],
      popular: true,
      color: 'from-purple-500/20 to-pink-600/20',
      border: 'border-purple-500/50'
    },
    {
      id: 'elite',
      name: 'Elite Partner',
      price: '149',
      description: 'Доминирование на рынке',
      features: ['Market Share IQ', 'Geo Hotspots', 'Smart Retention', 'Price Benchmarking'],
      color: 'from-amber-500/20 to-orange-600/20',
      border: 'border-amber-500/30'
    }
  ];

  const handleSubscribe = async (plan: string) => {
    setLoading(plan);
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    
    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tgUser?.id, plan })
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Subscription error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-2 py-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
          >
            Выберите ваш масштаб
          </motion.h1>
          <p className="text-gray-400">Инструменты, которые окупают себя</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative rounded-3xl border ${plan.border} bg-white/5 backdrop-blur-xl p-6 flex flex-col justify-between overflow-hidden overflow-visible`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/50">
                  Самый популярный
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">₪{plan.price}</span>
                  <span className="text-gray-500 text-sm">/месяц</span>
                </div>

                <ul className="space-y-3 pt-4 border-t border-white/10 text-sm overflow-visible">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={!!loading}
                className={`mt-8 w-full py-4 rounded-2xl font-bold transition-all ${
                  plan.popular 
                    ? 'bg-white text-black hover:bg-gray-200' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                } ${loading === plan.id ? 'opacity-50' : ''}`}
              >
                {loading === plan.id ? 'Подключаем...' : 'Выбрать'}
              </button>
            </motion.div>
          ))}
        </div>
        
        <footer className="text-center text-gray-500 text-xs py-8">
          Все платежи защищены Stripe. Отмена подписки возможна в любой момент.
        </footer>
      </div>
    </div>
  );
};

export default Pricing;
