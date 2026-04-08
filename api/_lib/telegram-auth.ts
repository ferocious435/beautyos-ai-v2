 
 
import crypto from 'crypto';

/**
 * Валидация подписи Telegram Web App (initData)
 * Защищает API от подмены данных и IDOR-уязвимостей.
 * @param initData Сырые данные initData из Telegram WebApp
 * @param botToken Токен телеграм-бота
 * @returns boolean - валидна ли подпись
 */
export function validateTelegramWebAppData(initData: string, botToken?: string): boolean {
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

    return calculatedHash === hash;
  } catch (err) {
    console.error('Telegram Validation Error:', err);
    return false;
  }
}

/**
 * Извлечение данных пользователя из валидированного initData
 */
export function getUserFromInitData(initData: string): unknown {
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
