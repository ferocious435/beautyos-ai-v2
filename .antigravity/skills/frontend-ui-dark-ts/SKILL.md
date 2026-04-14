---
name: frontend-ui-dark-ts
description: "Создание React-приложений в темной теме с использованием Tailwind CSS, кастомных тем, эффектов стекломорфизма (glassmorphism) и анимаций Framer Motion. Используйте для создания дашбордов, панелей управления или интерфейсов с большим количеством данных."
risk: safe
source: community
date_added: "2026-03-28"
author: Antigravity
tags: ["frontend", "ui", "dark-theme", "tailwind", "framer-motion"]
---

# Фронтенд UI: Темная тема (TypeScript)

Современная система UI для React в темной теме с использованием **Tailwind CSS** и **Framer Motion**. Предназначена для дашбордов, админ-панелей и приложений с насыщенными данными, эффектами стекломорфизма и стильными анимациями.

## Стек технологий

| Пакет | Версия | Назначение |
|---------|---------|---------|
| `react` | ^18.x | Фреймворк UI |
| `framer-motion` | ^11.x | Анимации |
| `tailwindcss` | ^3.x | Стилизация |
| `typescript` | ^5.x | Типизация |

## Быстрый старт

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install framer-motion clsx react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Структура проекта

```
src/
├── components/
│   ├── ui/         # Базовые компоненты (Button, Card, Input)
│   └── layout/     # Компоненты макета (AppShell, Sidebar)
├── styles/
│   └── globals.css # Глобальные стили и Tailwind
├── App.tsx
└── main.tsx
```

## Конфигурация Tailwind (Пример темы)

В `tailwind.config.js` мы настраиваем палитру, которая создает премиальный вид:
- **Brand**: Фиолетовые акценты (`#8251EE`).
- **Neutral**: Глубокие серые и черные тона для фона.
- **Glass**: Настройки для блюра и прозрачности.

## Основные паттерны

### Эффект стекла (Glassmorphism)
Мы используем специальный слой `glass`, `glass-card` в `globals.css` для создания полупрозрачных поверхностей с эффектом размытия заднего плана.

### Анимации Framer Motion
- **FadeIn**: Мягкое появление элементов.
- **SlideUp**: Появление снизу вверх.
- **Hover Scale**: Интерактивность при наведении на кнопки и карточки.

## Правила использования цветов

| Сценарий | Цвет | Класс |
|----------|-------|-------|
| Основное действие | Фиолетовый бренд | `bg-brand text-white` |
| Фон страницы | Нейтральный bg1 | `bg-neutral-bg1` |
| Карточки | Нейтральный bg2 | `bg-neutral-bg2` |
| Граница (border) | Стандартная | `border-border` |

---
*Обновлено: Март 2026. Полная локализация для русскоязычной среды.*
