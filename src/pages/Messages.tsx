import { useMemo, useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const templates = [
  {
    title: 'ברכת יום הולדת',
    tag: 'לקוחות קבועים',
    text: 'מזל טוב אהובה! מאחלת לך שנה מלאה ביופי, ביטחון ורגעים טובים. מחכה לפנק אותך בטיפול הבא.',
  },
  {
    title: 'תזכורת לתור',
    tag: 'לפני הגעה',
    text: 'היי, מזכירה בעדינות שהתור שלך מתקרב. אם צריך שינוי קטן בשעה, כתבי לי כאן ואעזור בשמחה.',
  },
  {
    title: 'מבצע שקט',
    tag: 'החזרת לקוחות',
    text: 'חשבתי עלייך. השבוע יש לי חלון קטן למבצע מיוחד ללקוחות חוזרות. רוצה שאשמור לך מקום?',
  },
  {
    title: 'אחרי טיפול',
    tag: 'שימור וחוויה',
    text: 'תודה שבאת היום. היה לי כיף לטפל בך. אם אהבת את התוצאה, אשמח שתשלחי תמונה או המלצה קטנה.',
  },
];

const Messages = () => {
  const user = useAppStore(state => state.user);
  const [copied, setCopied] = useState<string | null>(null);
  const businessName = user.name || 'BeautyOS';

  const botDeepLink = useMemo(() => {
    return `https://t.me/BeautyOSAI_bot`;
  }, []);

  const copyText = async (text: string, title: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(title);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white px-5 pt-8 pb-32" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-[32px] border border-white/10 bg-gradient-to-br from-yellow-500/15 via-white/5 to-transparent p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 text-black">
            <MessageCircle size={24} />
          </div>
          <h1 className="text-3xl font-black">מרכז הודעות וברכות</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            כאן אפשר לראות אילו הודעות לשלוח ללקוחות: ברכות, תזכורות, מבצעים וטקסטים אחרי טיפול.
            יצירת פוסטים ושיפור תמונות עדיין עובדים ישירות בצ&apos;אט עם הבוט.
          </p>
        </header>

        <section className="grid gap-4">
          {templates.map(template => (
            <article key={template.title} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{template.title}</h2>
                  <p className="text-xs font-bold text-yellow-500">{template.tag}</p>
                </div>
                <Sparkles className="text-yellow-500" size={20} />
              </div>
              <p className="rounded-2xl bg-black/30 p-4 text-sm leading-7 text-zinc-200">{template.text}</p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => copyText(template.text, template.title)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black transition active:scale-95"
                >
                  {copied === template.title ? 'הועתק' : 'העתקה'}
                </button>
                <a
                  href={`https://t.me/share/url?text=${encodeURIComponent(`${businessName}: ${template.text}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-yellow-500 px-4 py-3 text-sm font-black text-black transition active:scale-95"
                >
                  <Send size={16} />
                  שליחה
                </a>
              </div>
            </article>
          ))}
        </section>

        <footer className="rounded-[28px] border border-white/10 bg-zinc-950 p-5 text-sm leading-7 text-zinc-400">
          רוצה AI לתמונה או פוסט חדש? פתח את הבוט ושלח תמונה או טקסט חופשי:
          <a href={botDeepLink} target="_blank" rel="noreferrer" className="mt-3 block font-black text-yellow-500">
            לפתיחת הצ&apos;אט עם BeautyOS AI
          </a>
        </footer>
      </div>
    </div>
  );
};

export default Messages;
