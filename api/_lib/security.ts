import { Receiver } from "@upstash/qstash";
import { VercelRequest } from "@vercel/node";

/**
 * Модуль безопасности для верификации запросов от QStash (Signature Verification)
 * Цель: Предотвращение несанкционированных вызовов API воркеров.
 * (Skills: @upstash-qstash, @security-audit, @nodejs-best-practices)
 */
export async function verifyQStashSignature(req: VercelRequest): Promise<boolean> {
  // Разрешаем все запросы в режиме разработки (Localhost)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Security] Verification skipped: Development Mode.');
    return true;
  }

  const signature = req.headers["upstash-signature"] as string;
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!signature || !currentSigningKey) {
    console.warn('[Security] Unauthorized: Missing Upstash-Signature or Signing Keys.');
    return false;
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey: nextSigningKey || currentSigningKey,
  });

  try {
    // ВАЖНО: Мы предполагаем, что Vercel уже распарсил тело запроса (Body Parser).
    // Для корректной сверки подписи мы восстанавливаем строку тела.
    // Если возникнут проблемы с порядком полей, потребуется отключение bodyParser в эндпоинте.
    const body = JSON.stringify(req.body);

    const isValid = await receiver.verify({
      signature,
      body,
      // URL должен точно совпадать с тем, что был указан при публикации (Destination URL)
    });

    if (!isValid) {
      console.error('[Security] Forbidden: Invalid QStash Signature.');
      return false;
    }

    console.log('[Security] Authorized: QStash Signature Verified.');
    return true;
  } catch (err: any) {
    console.error('[Security] Error during verification:', err.message);
    return false;
  }
}
