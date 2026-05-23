 
 
import crypto from 'crypto';

/**
 * Валидация подписи Telegram Web App (initData)
 * Защищает API от подмены данных и IDOR-уязвимостей.
 * @param initData Сырые данные initData из Telegram WebApp
 * @param botToken Токен телеграм-бота
 * @returns boolean - валидна ли подпись
 */
export function validateTelegramWebAppData(
  initData: string,
  botToken?: string,
  maxAgeSeconds = 24 * 60 * 60
): boolean {
  if (!initData || !botToken) return false;

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) return false;
    
    urlParams.delete('hash');
    urlParams.sort();

    let dataCheckString = '';
    for (const [key, value] of urlParams.entries()) {
      dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.slice(0, -1);

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    if (calculatedBuffer.length !== hashBuffer.length || !crypto.timingSafeEqual(calculatedBuffer, hashBuffer)) {
      return false;
    }

    const authDate = Number(urlParams.get('auth_date'));
    if (!Number.isFinite(authDate)) return false;

    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    return ageSeconds >= 0 && ageSeconds <= maxAgeSeconds;
  } catch (err) {
    console.error('Telegram Validation Error:', err);
    return false;
  }
}

/**
 * Извлечение данных пользователя из валидированного initData
 */
export function getUserFromInitData(initData: string): any {
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    if (userStr) return JSON.parse(userStr);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return null;
  }
  return null;
}
