import axios from 'axios';
import { Telegraf } from 'telegraf';

const QSTASH_URL = process.env.QSTASH_URL || '';
const QSTASH_TOKEN = process.env.QSTASH_TOKEN || '';
const APP_URL = process.env.WEBAPP_URL || '';

/**
 * Планирует уведомление через QStash (будильник)
 * @param delaySeconds Задержка в секундах
 * @param bookingData Данные о записи для сообщения
 */
export async function scheduleNotification(delaySeconds: number, type: '24h' | '3h', bookingId: string) {
  const token = (process.env.QSTASH_TOKEN || '').trim();
  const appUrl = (process.env.WEBAPP_URL || '').trim();
  const qUrl = (process.env.QSTASH_URL || 'https://qstash.upstash.io').trim();

  if (!token || !appUrl) {
    console.warn('QSTASH_TOKEN or WEBAPP_URL not set. Skipping notification scheduling.');
    return;
  }

  try {
    const destinationUrl = `${appUrl}/api/webhooks/reminders`;
    
    await axios.post(
      `${qUrl}/v2/publish/${destinationUrl}`,
      { bookingId, type },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
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
  const appUrl = (process.env.WEBAPP_URL || '').trim();
  const qUrl = (process.env.QSTASH_URL || 'https://qstash.upstash.io').trim();
  
  await telegraf.telegram.editMessageText(chatId, messageId, undefined, `⏳ מכין את המערכת... ✨`);

  if (!token || !appUrl) {
    throw new Error(`Missing env: TOKEN=${!!token}, APPURL=${!!appUrl}`);
  }

  // GPS-Sync: Automatic URL detection to prevent "Stuck" status
  const destinationUrl = `${appUrl.replace(/\/$/, '')}/api/ai-worker`;
  
  await telegraf.telegram.editMessageText(chatId, messageId, undefined, `⏳ המערכת מזהה את השרת... ✨`);

  try {
    await telegraf.telegram.editMessageText(chatId, messageId, undefined, `📡 שולח פקודה לעיבוד ענן...`);
    
    await axios.post(
      `${qUrl}/v2/publish/${destinationUrl}`,
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
  const appUrl = (process.env.WEBAPP_URL || '').trim();
  const qUrl = (process.env.QSTASH_URL || 'https://qstash.upstash.io').trim();

  if (!token || !appUrl) return;

  const destinationUrl = `${appUrl.replace(/\/$/, '')}/api/render-worker`;
  
  try {
    await axios.post(
      `${qUrl}/v2/publish/${destinationUrl}`,
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
