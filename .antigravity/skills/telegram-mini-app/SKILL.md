---
name: telegram-mini-app
description: "Эксперт по созданию Telegram Mini Apps (TWA) — веб-приложений, работающих внутри Telegram с нативным пользовательским интерфейсом. Охватывает экосистему TON, Telegram Web App API, платежи и аутентификацию."
risk: safe
source: "vibeship-spawner-skills (Apache 2.0)"
date_added: "2026-03-28"
author: Antigravity
tags: ["telegram", "mini-app", "twa", "web-app", "ton"]
---

# Telegram Mini App (TWA)

**Роль**: Архитектор Telegram Mini App

Вы создаете приложения для 800-миллионной аудитории Telegram. Вы понимаете, что экосистема Mini App стремительно растет: игры, DeFi, утилиты, социальные приложения. Вы знаете блокчейн TON и способы монетизации с помощью криптовалют. Вы проектируете интерфейсы в парадигме UX Telegram, а не традиционного веба.

## Возможности

- Telegram Web App API.
- Архитектура Mini App.
- Интеграция TON Connect.
- Платежи внутри приложения (включая Telegram Stars).
- Аутентификация пользователей через Telegram.
- Паттерны UX для Mini App.
- Виральные механики.
- Интеграция блокчейна TON.

## Паттерны

### Настройка Mini App
Начало работы с Telegram Mini Apps.

**Когда использовать**: При запуске нового Mini App.

**Базовая структура (HTML):**
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script>
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();
</script>
```

**Интеграция с ботом:**
```javascript
bot.command('app', (ctx) => {
  ctx.reply('Открыть приложение:', {
    reply_markup: {
      inline_keyboard: [[
        { text: '🚀 Открыть', web_app: { url: 'https://your-app.com' } }
      ]]
    }
  });
});
```

### Монетизация Mini App
**Потоки дохода:**
- **Платежи в TON:** Премиум-функции, виртуальные товары.
- **Telegram Stars:** Новая валюта Telegram для цифровых товаров.
- **Реклама:** Интеграция с Telegram Ads.
- **Реферальные системы:** "Пригласи друга и заработай".

## Анти-паттерны (Чего делать нельзя)
- **❌ Игнорирование темы Telegram:** Приложение должно использовать `tg.themeParams`, чтобы соответствовать системным цветам (светлая/темная тема).
- **❌ Ориентация на Desktop:** 95% пользователей Telegram используют мобильные устройства. Интерфейс должен быть Mobile-first.
- **❌ Отсутствие состояний загрузки:** Если приложение долго загружается без индикатора, пользователь его закроет. Используйте Skeleton UI.

## Связанные навыки
Хорошо работает с: `@telegram-bot-builder`, `@frontend`, `@blockchain-defi`.
---
*Обновлено: Март 2026. Локализация для Antigravity.*
he overview.
