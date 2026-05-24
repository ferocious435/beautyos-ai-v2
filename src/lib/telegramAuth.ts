export const getTelegramInitData = () => {
  return (window as any).Telegram?.WebApp?.initData || '';
};

export const getTelegramUserId = () => {
  const userId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return Number.isFinite(Number(userId)) ? Number(userId) : null;
};

export const telegramAuthHeaders = () => ({
  'x-telegram-init-data': getTelegramInitData(),
});

export const telegramAuthHeadersWithPreview = (previewRole?: string | null) => ({
  ...telegramAuthHeaders(),
  ...(previewRole ? { 'x-beautyos-preview-role': previewRole } : {}),
});
