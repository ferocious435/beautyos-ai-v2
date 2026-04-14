 
 
import { Receiver } from "@upstash/qstash";
import { VercelRequest } from "@vercel/node";

/**
 * Модуль безопасности для верификации запросов от QStash (Signature Verification)
 * Цель: Предотвращение несанкционированных вызовов API воркеров.
 * (Skills: @upstash-qstash, @security-audit, @nodejs-best-practices)
 */
/**
 * Служебная функция для чтения сырого тела запроса из потока (Stream).
 * Необходима для корректной верификации подписи QStash.
 */
async function getRawBody(req: VercelRequest): Promise<string> {
  if (req.body && typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

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
    // ВАЖНО: Читаем Raw Body для обеспечения 100% точности подписи.
    const body = await getRawBody(req);
    
    // Если тело пустое (хотя QStash всегда присылает JSON), используем пустую строку
    const isValid = await receiver.verify({
      signature,
      body,
    });

    if (!isValid) {
      console.error('[Security] Forbidden: Invalid QStash Signature.');
      return false;
    }

    // Сохраняем распаршенное тело обратно в req.body для последующего использования в воркерах,
    // так как поток уже вычитан.
    try {
      req.body = JSON.parse(body);
    } catch {
      req.body = body;
    }

    console.log('[Security] Authorized: QStash Signature Verified.');
    return true;
  } catch (err: any) {
    console.error('[Security] Error during verification:', err.message);
    return false;
  }
}
