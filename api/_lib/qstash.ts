import axios from 'axios';

const QSTASH_URL = process.env.QSTASH_URL || '';
const QSTASH_TOKEN = process.env.QSTASH_TOKEN || '';
const APP_URL = process.env.WEBAPP_URL || '';

/**
 * Планирует уведомление через QStash (будильник)
 * @param delaySeconds Задержка в секундах
 * @param bookingData Данные о записи для сообщения
 */
export async function scheduleNotification(delaySeconds: number, type: '24h' | '3h', bookingId: string) {
  if (!QSTASH_TOKEN || !APP_URL) {
    console.warn('QSTASH_TOKEN or WEBAPP_URL not set. Skipping notification scheduling.');
    return;
  }

  try {
    const destinationUrl = `${APP_URL}/api/webhooks/reminders`;
    
    await axios.post(
      `https://qstash.upstash.io/v1/publish/${destinationUrl}`,
      { bookingId, type },
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
  if (!QSTASH_TOKEN || !APP_URL) {
    console.warn('QSTASH_TOKEN or WEBAPP_URL not set. Running synchronously is risky but falling back.');
    throw new Error('QStash not configured. Please set QSTASH_TOKEN.');
  }

  try {
    const destinationUrl = `${APP_URL}/api/ai-worker`;
    await axios.post(
      `https://qstash.upstash.io/v1/publish/${destinationUrl}`,
      { chatId, messageId, fileUrl, fileId, caption },
      {
        headers: {
          'Authorization': `Bearer ${QSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Enqueued AI job for chat ${chatId}`);
  } catch (error) {
    console.error('Error enqueuing AI job:', error);
    throw error;
  }
}
