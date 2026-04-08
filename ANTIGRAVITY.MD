# BeautyOS AI v2: Конфигурация системного архитектора и оркестратора (Оптимизация v2.2) (ANTIGRAVITY.MD)

## 1. Логика ядра и модели
- **Модель планирования (Architect):** Gemini 3.1 Pro (High) – для архитектурных решений, алгоритма Stacking v61 и аудита безопасности.
- **Модель исполнения (Executor):** Gemini 3 Flash – для терминальных команд, написания UI-кода, файловых операций и юнит-тестов.
- **Режим работы:** Loki Mode (цикл RARV: Reason → Act → Reflect → Verify).
- **Политика исполнения:** Обязательное обновление `implementation_plan.md` перед началом написания любого кода.

## 2. МСР-серверы и инструменты
- **github:** Управление версиями и атомарные PR.
- **supabase-mcp (Новый):** Прямой доступ к схеме БД, выполнение SQL-запросов и миграций.
- **vercel-mcp (Новый):** Управление переменными окружения (env) и отслеживание деплоев.
- **notebooklm-mcp (Установлен):** Исследование знаний и Q&A на базе NotebookLM без галлюцинаций.
- **browser_subagent:** Только для визуальной верификации UI.
- **Ограничения:** Использование только абсолютных путей. Запрещено использование `cd`. Игнорирование `node_modules`, `.next` и `dist`.

## 3. Оркестрация скиллов (Skill Orchestration)
Разделение на группы для минимизации "шума" в контексте:
- **[ENGINEERING]:** @nodejs-best-practices, @gemini-api-integration, @upstash-qstash, @security-audit, @debugging-strategies, @test-driven-development.
- **[FRONTEND]:** @frontend-dev-guidelines, @frontend-ui-dark-ts, @stability-ai, @ai-studio-image.
- **[MARKETING/PRODUCT]:** @product-manager, @content-creator, @instagram, @instagram-automation, @telegram-bot-builder, @telegram-mini-app.
- **[STRATEGY]:** @senior-architect, @ai-analyzer, @brainstorming, @loki-mode.
- **Политика загрузки:** Полные инструкции скилла загружаются только тогда, когда задача явно относится к его области (Dynamic Hydration).

## 4. Протоколы экономии токенов
- **Context Caching:** Закрепление правил проекта (rules.md) в начале контекста для использования Cache в API.
- **Concise Mode:** Прямые технические ответы без лишнего текста.
- **Selective Indexing:** Сканирование ограничено только папками `src/` и `app/`.
- **Context Compression:** Автоматическое обновление `.loki/CONTINUITY.md` каждые 15 взаимодействий и очистка краткосрочной памяти.

## 5. Критические цели проекта (v2)
1. Стабилизация процесса генерации изображений (исправление артефактов Outpainting). [ВЫПОЛНЕНО ✅]
2. Финальная реализация алгоритма Stacking v61 для динамического размещения текста.
3. Защита конечных точек Webhooks с помощью подписей QStash.
4. Подготовка к Production деплою на Vercel с Marketplace Redis/Postgres.
