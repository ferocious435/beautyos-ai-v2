import { Client } from '@upstash/qstash';
import { Telegraf } from 'telegraf';

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

export const buildDestinationUrl = (appUrl: string, endpointPath: string) =>
  new URL(endpointPath, `${appUrl.replace(/\/+$/, '')}/`).toString();

const getPublicAppUrl = () =>
  normalizePublicUrl(process.env.WEBAPP_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL);

const getQstashUrl = () => normalizePublicUrl(process.env.QSTASH_URL, 'https://qstash.upstash.io');
const getQstashToken = () => (process.env.QSTASH_TOKEN || '').trim();

const getQstashClient = () => {
  const token = getQstashToken();
  const baseUrl = getQstashUrl();

  if (!token || !baseUrl) return null;
  return new Client({ token, baseUrl });
};

export async function scheduleNotification(delaySeconds: number, type: '24h' | '3h', bookingId: string) {
  const appUrl = getPublicAppUrl();
  const client = getQstashClient();

  if (!client || !appUrl) {
    console.warn('QSTASH_TOKEN or WEBAPP_URL not set. Skipping notification scheduling.');
    return;
  }

  try {
    const destinationUrl = buildDestinationUrl(appUrl, '/api/services?action=reminder');
    await client.publishJSON({
      url: destinationUrl,
      body: { bookingId, type },
      delay: delaySeconds,
    });
    console.log(`Scheduled ${type} notification for booking ${bookingId} with delay ${delaySeconds}s`);
  } catch (error) {
    console.error('Error scheduling notification via QStash:', error);
  }
}

export async function enqueueAiProcessing(
  chatId: number,
  messageId: number,
  fileUrl: string,
  fileId: string,
  caption?: string,
) {
  const telegraf = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
  const appUrl = getPublicAppUrl();
  const client = getQstashClient();

  await telegraf.telegram.editMessageText(chatId, messageId, undefined, '⏳ מכין את התמונה לעיבוד...');

  if (!client || !appUrl) {
    throw new Error(`Missing env: QSTASH=${!!client}, APPURL=${!!appUrl}`);
  }

  const destinationUrl = buildDestinationUrl(appUrl, '/api/ai-worker');

  try {
    await telegraf.telegram.editMessageText(chatId, messageId, undefined, '📡 שולח את התמונה לסטודיו BeautyOS...');

    await client.publishJSON({
      url: destinationUrl,
      body: { chatId, messageId, fileUrl, fileId, caption },
      timeout: 30,
    });

    await telegraf.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      '✅ התמונה נכנסה לעיבוד. עוד רגע נפתח לך את סטודיו BeautyOS.',
    );
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown QStash error';
    await telegraf.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      `❌ לא הצלחתי לשלוח את התמונה לעיבוד: ${errorMsg}`,
    );
    throw new Error(`QStash Error: ${errorMsg}`);
  }
}

export async function enqueueRenderProcessing(chatId: number, formatType: string) {
  const appUrl = getPublicAppUrl();
  const client = getQstashClient();

  if (!client || !appUrl) return;

  const destinationUrl = buildDestinationUrl(appUrl, '/api/render-worker');

  try {
    await client.publishJSON({
      url: destinationUrl,
      body: { chatId, formatType },
      timeout: 60,
    });
    console.log(`[QStash] Enqueued render task: ${formatType} for chat ${chatId}`);
  } catch (error) {
    console.error('Error enqueuing render task:', error);
  }
}

export async function enqueueRetouchProcessing(chatId: number, fileUrl: string, fileId: string) {
  const appUrl = getPublicAppUrl();
  const client = getQstashClient();

  if (!client || !appUrl) return;

  const destinationUrl = buildDestinationUrl(appUrl, '/api/retouch-worker');

  try {
    await client.publishJSON({
      url: destinationUrl,
      body: { chatId, fileUrl, fileId },
      timeout: 60,
    });
    console.log(`[QStash] Enqueued retouch task for chat ${chatId}`);
  } catch (error) {
    console.error('Error enqueuing retouch task:', error);
  }
}
