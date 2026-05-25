 
 
import axios from 'axios';
import { Telegraf } from 'telegraf';

export const buildPublishUrl = (qUrl: string, destinationUrl: string) =>
  `${qUrl}/v2/publish/${encodeURIComponent(destinationUrl)}`;

export const normalizePublicUrl = (...candidates: Array<string | undefined>) => {
  const raw = candidates.find((candidate) => candidate && candidate.trim());
  if (!raw) return '';

  const withoutQuotes = raw.trim().replace(/^['"]|['"]$/g, '');
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(withoutQuotes) && !/^https?:\/\//i.test(withoutQuotes)) {
    return '';
  }

  const withScheme = /^https?:\/\//i.test(withoutQuotes) ? withoutQuotes : `https://${withoutQuotes}`;
  const normalized = withScheme.replace(/\/+$/, '');

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? normalized : '';
  } catch {
    return '';
  }
};

const getPublicAppUrl = () =>
  normalizePublicUrl(process.env.WEBAPP_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL);

const getQstashUrl = () => normalizePublicUrl(process.env.QSTASH_URL, 'https://qstash.upstash.io');

/**
 * Планирует уведомление через QStash (будильник)
 * @param delaySeconds Задержка в секундах
 * @param bookingData Данные о записи для сообщения
 */
export async function scheduleNotification(delaySeconds: number, type: '24h' | '3h', bookingId: string) {
  const token = (process.env.QSTASH_TOKEN || '').trim();
  const appUrl = getPublicAppUrl();
  const qUrl = getQstashUrl();

  if (!token || !appUrl) {
    console.warn('QSTASH_TOKEN or WEBAPP_URL not set. Skipping notification scheduling.');
    return;
  }

  try {
    const destinationUrl = `${appUrl.replace(/\/$/, '')}/api/services?action=reminder`;
    
    await axios.post(
      buildPublishUrl(qUrl, destinationUrl),
      { bookingId, type },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Upstash-Delay': `${delaySeconds}s`
        }
      }
    );
    console.log(`Scheduled ${type} notification for booking ${bookingId} with delay ${delaySeconds}s`);
  } catch (error) {
    console.error('Error scheduling notification via QStash:', error);
  }
}

/**
 * Ставит AI задачу на асинхронную генерацию
 */
export async function enqueueAiProcessing(chatId: number, messageId: number, fileUrl: string, fileId: string, caption?: string) {
  const telegraf = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
  
  const token = (process.env.QSTASH_TOKEN || '').trim();
  const appUrl = getPublicAppUrl();
  const qUrl = getQstashUrl();
  
  await telegraf.telegram.editMessageText(chatId, messageId, undefined, `⏳ מכין את המערכת... ✨`);

  if (!token || !appUrl || !qUrl) {
    throw new Error(`Missing env: TOKEN=${!!token}, APPURL=${!!appUrl}, QSTASH=${!!qUrl}`);
  }

  // GPS-Sync: Automatic URL detection to prevent "Stuck" status
  const destinationUrl = `${appUrl.replace(/\/$/, '')}/api/ai-worker`;
  
  await telegraf.telegram.editMessageText(chatId, messageId, undefined, `⏳ המערכת מזהה את השרת... ✨`);

  try {
    await telegraf.telegram.editMessageText(chatId, messageId, undefined, `📡 שולח פקודה לעיבוד ענן...`);
    
    await axios.post(
      buildPublishUrl(qUrl, destinationUrl),
      { chatId, messageId, fileUrl, fileId, caption },
      {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    await telegraf.telegram.editMessageText(chatId, messageId, undefined, `✅ התמונה בתור לעיבוד! אנא המתן... 🎨`);
  } catch (error: any) {
    const errorMsg = error.response ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}` : error.message;
    await telegraf.telegram.editMessageText(chatId, messageId, undefined, `❌ תקלה בתקשורת: ${errorMsg}`);
    throw new Error(`QStash Error: ${errorMsg}`);
  }
}

/**
 * Ставит задачу на финальный рендеринг и ретушь (NANO BANANA PRO)
 */
export async function enqueueRenderProcessing(chatId: number, formatType: string) {
  const token = (process.env.QSTASH_TOKEN || '').trim();
  const appUrl = getPublicAppUrl();
  const qUrl = getQstashUrl();

  if (!token || !appUrl || !qUrl) return;

  const destinationUrl = `${appUrl.replace(/\/$/, '')}/api/render-worker`;
  
  try {
    await axios.post(
      buildPublishUrl(qUrl, destinationUrl),
      { chatId, formatType },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[QStash] Enqueued render task: ${formatType} for chat ${chatId}`);
  } catch (error) {
    console.error('Error enqueuing render task:', error);
  }
}

/**
 * Ставит задачу на фоновую ретушь и анализ (AI RETOUCH) сразу после получения фото
 */
export async function enqueueRetouchProcessing(chatId: number, fileUrl: string, fileId: string) {
  const token = (process.env.QSTASH_TOKEN || '').trim();
  const appUrl = getPublicAppUrl();
  const qUrl = getQstashUrl();

  if (!token || !appUrl || !qUrl) return;

  const destinationUrl = `${appUrl.replace(/\/$/, '')}/api/retouch-worker`;
  
  try {
    await axios.post(
      buildPublishUrl(qUrl, destinationUrl),
      { chatId, fileUrl, fileId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[QStash] Enqueued retouch task for chat ${chatId}`);
  } catch (error) {
    console.error('Error enqueuing retouch task:', error);
  }
}

