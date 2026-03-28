# Отчет об аудите проекта BeautyOS AI v2 (Due Diligence)

## 1. Executive Summary

Проект BeautyOS AI v2 представляет собой **продвинутый MVP (Minimum Viable Product)** с высоким качеством фронтенд-реализации и продуманной логикой ИИ-генерации. Однако, с технической точки зрения, проект находится в состоянии "архитектурного наслоения": в репозитории сосуществуют рабочие Vercel-функции и горы мертвого кода от прошлых итераций.

**Вердикт:** Продукт пригоден к эксплуатации, но требует немедленной стабилизации DevOps-слоя и очистки кодовой базы от артефактов, не участвующих в деплое.

---

## 2. Current Product Reality

### Что реально работает сейчас:
*   **Telegram Bot**: Полный цикл регистрации мастера/клиента, сохранение сессий в Supabase, загрузка и первичная обработка фото.
*   **AI Content Engine**: Интеграция с Gemini 1.5/2.0 для анализа фото, генерации промптов и текстов постов.
*   **Graphic Engine**: Генерация брендированных изображений (Jimp) с поддержкой иврита (RTL).
*   **Mini App (Dashboard)**: Загрузка фото, вызов ИИ-улучшения, предпросмотр результата.
*   **Discovery**: Поиск мастеров по геолокации (через Supabase RPC).

### Что не работает / существует номинально:
*   **Платежная система**: Код для Stripe Sessions есть, но он использует плейсхолдеры Price ID и требует `micro` для работы вебхуков.
*   **Система бронирования**: Фронтенд-часть была подключена к базе напрямую. Централизованная логика уведомлений отсутствовала (исправлено в ходе текущей сессии через `api/services.ts`).
*   **Trend Analysis**: Логика анализа рынка существует в коде, но нет автоматического триггера (Cron Job) для регулярного обновления данных.

---

## 3. Current Technical Reality

### Фактическая архитектура:
*   **Frontend**: React + Vite + Tailwind (деплоится на Vercel как SPA).
*   **Backend**: Vercel Serverless Functions (`api/*.ts`).
*   **Database**: Supabase (PostgreSQL + Auth + Storage).
*   **Compute**: Безсерверная архитектура, исключающая длительные фоновые процессы.

### Ключевые технические проблемы:
*   **"Невидимая" БД**: В репозитории отсутствуют SQL-миграции. Структура таблиц (`users`, `bookings`, `portfolio`, `bot_sessions`) существует только в облаке Supabase, что делает невозможным локальное развертывание или аудит схемы.
*   **Мертвый код**: Огромные массивы кода в `server/`, `scripts/` и `_archive/` полностью игнорируются при деплое (`.vercelignore`), создавая иллюзию объема функционала.
*   **Хрупкость графики**: Шрифты для Jimp загружаются по внешним URL с `unpkg.com`, что создает точку отказа.

---

## 4. Claimed vs Actual Feature Matrix

| Feature | Claimed (Status in Code) | Actual (Production State) | Evidence | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Booking System** | Complete | **Partial** (fixed) | Missing master notifications | Centralize in API (Done) |
| **Stripe Payments** | Integrated | **Placeholder** | Price IDs are mocks | Replace with real IDs |
| **AI Background Swap** | Operational | **Unstable** | Fallback to original is common | Fine-tune Imagen prompts |
| **Security/Auth** | Standard | **Standard** | Valid crypto hash check in `auth.ts` | No action needed |
| **Database Migrations**| Automated | **Non-existent** | No .sql files in repo | Export schema to `/supabase` |

---

## 5. Root Causes of Disorder

| Problem | Root Cause | Consequence | Priority | Fix |
| :--- | :--- | :--- | :--- | :--- |
| **Dead Code Accumulation** | Lack of repository cleanup after migrations | Confusion for AI and developers | High | Delete `server/`, `scripts/`, `_archive/` |
| **Hidden Schema** | Direct DB editing via Supabase UI | Vendor lock-in, hard to test | Medium | Implement basic migrations |
| **Icon Mismatches** | Inconsistent imports (Lucide) | Component crashes on mount | Low | Unified icon alias (Done) |

---

## 6. Cleanup Recommendations

1.  **Удалить `skills/` и `.agents/` из корня проекта** (если они не используются локально).
2.  **Зафиксировать Price IDs** в `.env`, чтобы `api/_lib/stripe.ts` не использовал хардкод.
3.  **Перевести загрузку шрифтов** Jimp на локальные ассеты.
4.  **Унифицировать типы**: Сейчас `telegram_id` в некоторых местах обрабатывается как `string`, в других как `number`.

---

## 7. Architecture Gap Analysis

Основной разрыв — **отсутствие локального окружения для разработки**. Проект полностью завязан на облачные ресурсы без возможности мокирования. Это замедляет разработку и увеличивает риск ошибок в production.

---

## Final Verified State

1.  **Реально работает:** Бот (регистрация, работа с фото), Студия ИИ (анализ, генерация поста, наложение текста), Поиск мастеров (гео), Базовая авторизация.
2.  **Не работает/В разработке:** Регулярный анализ трендов (нет триггера), real-time чаты (не обнаружены), расширенная аналитика.
3.  **Не задеплоено:** Весь код в папках `server/`, `scripts/`, `_archive/`. 
4.  **Ложное впечатление:** Обилие папок в корне создает ощущение огромного бэкенда, тогда как реальный бэкенд — это ~10 функций в папке `api/`.
5.  **Кключевые файлы:** `api/bot.ts` (ядро бота), `api/enhance.ts` (ядро ИИ), `api/services.ts` (бизнес-логика).
6.  **Критический приоритет:** Исправление неконсистентности `telegram_id` и вынос схемы БД в репозиторий.
