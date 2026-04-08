# BeautyOS AI v2: Техническая Архитектура и ДНК Проекта (v2.2)

## 1. Технологический Стек
*   **Frontend**: Vite + React + TypeScript + Tailwind (SPA).
*   **Backend**: Unified Vercel Functions (Node.js/TypeScript). Все API сосредоточены в папке `api/`.
*   **Database & Auth**: Supabase (Postgres). Используется для хранения сессий бота, данных пользователей, записей (bookings) и портфолио.
*   **Queue/Orchestration**: Upstash QStash. Используется для обработки тяжелых задач (ретушь, рендеринг) вне основного цикла запроса, чтобы избежать 10-секундного лимита Vercel.
*   **AI Models**: Imagen 3 Ultra (Визуализация), Gemini 3.1 Pro (Анализ фотографий), Gemini 3 Flash (Генерация контента и планирование).

## 2. Ключевые Модули
### 2.1. Graphic Engine (`api/_lib/graphic-engine.ts`)
*   **Stacking v61 (Art-Director Edition)**: Алгоритм динамической верстки маркетинговых слоев на Canvas.
*   **Особенности**: 
    *   Авто-масштабирование шрифтов в зависимости от длины текста.
    *   Поддержка RTL (Hebrew).
    *   Кинематографические градиенты и тени для обеспечения 100% читаемости на любом фоне.
    *   Система "Framed Seed": создание размытого фона из исходного изображения для эстетичного AI-расширения.
*   **Библиотека**: `@napi-rs/canvas`.
*   **Шрифты**: Assistant (Sans), Playfair Display (Serif), Noto Color Emoji.

### 2.2. Bot Logic (`api/_lib/bot-logic.ts`)
*   **Интерфейс**: Telegraf.
*   **Архитектура сессий**: Supabase Stateless Sessions (сессия загружается из БД в middleware и сохраняется обратно после каждого действия).
*   **Интерактив**: Поддержка Inline-панелей для управления дизайном (добавление цены, заголовка, логотипа) в реальном времени.

### 2.3. Unified Services (`api/services.ts`)
*   Единая точка входа для Web App.
*   Маршрутизация действий: `reminder`, `create-booking`, `approve-booking`, `diagnostic`.
*   **Security**: Встроенная валидация Telegram Init Data (Hash check) для защиты API.

## 3. Критические Алгоритмы и Протоколы
*   **Asynchronous Pipeline**: Photo -> QStash -> `ai-worker` -> Telegram UI -> design-studio -> QStash -> `render-worker` -> Final Result.
*   **Zero-Stale State**: Гарантированная очистка кэша при загрузке нового изображения для предотвращения визуальных артефактов от предыдущих работ.
*   **Luxury Minimal Style**: Программное следование эстетике премиальных журналов (шрифты Assistant и Playfair Display).

## 4. Схема Базы Данных (Supabase)
*   `users`: Профили (master/client/admin), настройки бизнеса, локация.
*   `bot_sessions`: Состояние диалога и текущие правки дизайна.
*   `bookings`: Записи на услуги с поддержкой статусов (pending/confirmed/rejected).
*   `portfolio`: Лучшие работы мастеров (хранятся в Storage `portfolio`).

## 5. Агентские Протоколы (Loki Constitution)
*   **RARV Cycle**: Reason (Планирование) -> Act (Действие) -> Reflect (Рефлексия) -> Verify (Верификация).
*   **One feature at a time**: Принцип атомарности изменений.
*   **Sterile Development**: Полное отсутствие Legacy-кода и неиспользуемых файлов в `src/` и `api/`.

## 6. Текущий Roadmap
1.  **Стабилизация QStash**: Решение проблем с верификацией подписей.
2.  **Production Ready**: Финализация деплоя на Vercel с использованием Marketplace Redis/Postgres.
3.  **AI Business Analytics**: Внедрение глубокого анализа для мастеров.
