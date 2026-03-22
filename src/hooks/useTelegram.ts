import { useEffect, useState } from 'react';

export function useTelegram() {
  const [tg, setTg] = useState<any>(null);

  useEffect(() => {
    const telegram = (window as any).Telegram?.WebApp;
    if (telegram) {
      telegram.ready();
      if (telegram.requestFullscreen) {
        try { telegram.requestFullscreen(); } catch(e) { telegram.expand(); }
      } else {
        telegram.expand();
      }
      setTg(telegram);
    }
  }, []);

  const onClose = () => {
    tg?.close();
  };

  const onToggleButton = () => {
    if (tg?.MainButton.isVisible) {
      tg.MainButton.hide();
    } else {
      tg.MainButton.show();
    }
  };

  const setMainButton = (text: string, onClick: () => void) => {
    if (!tg) return;
    tg.MainButton.setText(text);
    tg.MainButton.onClick(onClick);
    tg.MainButton.show();
    tg.MainButton.enable();
  };

  const hideMainButton = () => {
    tg?.MainButton.hide();
  };

  const haptic = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    tg?.HapticFeedback?.impactOccurred(style);
  };

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    onClose,
    onToggleButton,
    setMainButton,
    hideMainButton,
    haptic,
    theme: tg?.themeParams
  };
}
