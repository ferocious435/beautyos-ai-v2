# BeautyOS AI v2 - MVP Status (Verified 2026-03-28)

Этот документ фиксирует реальный состав Minimum Viable Product (MVP) после проведения аудита и стабилизации.

## ✅ Что реально работает (Production Ready)
- **Telegram Bot Core**: Регистрация, переключение ролей, хранение сессий в Supabase.
- **AI Analyst (Gemini 3 Flash)**: Анализ фото, определение услуги, генерация текстов постов и Imagen-промптов.
- **AI Designer (Imagen 4 Ultra)**: Улучшение/генерация фона (при необходимости).
- **Graphic Engine (Jimp)**: Наложение текста (Hebrew BiDi), брендирование, кадрирование под Instagram (4:5), WhatsApp (9:16) и Facebook (1:1).
- **Discovery Flow**: Поиск мастеров в радиусе 10 км на основе геолокации (через Supabase RPC).
- **Centralized Booking**: Создание записей, уведомление мастера и клиента в Telegram, планирование напоминаний через QStash.
- **Security**: Валидация подписей Telegram в Mini App.

## ⚠️ Работает частично / Требует настройки
- **Stripe Payments**: Код полностью готов, но требует ввода реальных `STRIPE_PRICE_ID_...` в переменные окружения Vercel.
- **Reminders (QStash)**: Логика готова, требует активного URL в QStash Dashboard.

## ❌ Не входит в текущий MVP (Отключено/В разработке)
- **Weekly Trend Analyzer**: Логика есть, но автоматический запуск (Cron) не настроен.
- **Real-time Chat**: Общение мастера и клиента за рамками уведомлений бота.
- **Advanced Dashboard Graphs**: Визуализации аналитики (заглушки в UI).

---

## Техническое ядро
- **Stack**: React (Vite) + Vercel Functions (Node.js/TS) + Supabase + Telegraf + Gemini API.
- **Source of Truth**: 
  - AI: `api/_lib/config.ts`
  - DB: `supabase/schema.sql`
  - Types: Unified `telegram_id` as `number`.
