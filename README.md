# BeautyOS AI v2

BeautyOS AI is a Telegram-first product for beauty professionals, studios, and small salons.
It combines:

- client booking and self-service;
- master tools for services, schedule, clients, and messages;
- admin role control and product review mode;
- AI tools for image enhancement and post creation.

## What is in this project

- `src/` - mini app frontend on `React + Vite + TypeScript`
- `api/` - server routes for Telegram bot, booking logic, payments, AI processing, and webhooks
- `tests/` - smoke checks for core MVP behavior
- `scripts/` - build preparation scripts
- `docs/` - project notes and internal reference materials

## Main roles

- `client` - books, reschedules, cancels, checks appointments and prices
- `master` - manages services, schedule, clients, messages, and content
- `admin` - reviews the whole system and can switch preview modes for testing

## Local run

1. Install dependencies:

```bash
npm install
```

2. Prepare environment variables:

- copy values from `.env.example`
- fill local secrets in `.env.local`

3. Start the mini app locally:

```bash
npm run dev
```

4. Build production bundle:

```bash
npm run build
```

5. Run core smoke checks:

```bash
npm run test:smoke
```

## Required environment variables

Frontend and app auth:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEBAPP_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `BOT_ADMIN_TELEGRAM_IDS`

AI and background processing:

- `GOOGLE_GEMINI_API_KEY`
- `GEMINI_API_KEY`
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`

Payments:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Optional model overrides:

- `MODEL_ANALYSIS`
- `MODEL_CONTENT`
- `MODEL_ENHANCEMENT`
- `MODEL_IMAGE`

## Release checklist

Before final release:

1. run `npm run test:smoke`
2. run `npm run build`
3. verify Vercel production env values are present
4. verify Telegram webhook points to `/api/bot`
5. verify Stripe webhook points to `/api/stripe-webhook`
6. do a final manual pass in Telegram as `client / master / admin`

## Notes

- The repo intentionally keeps `tests/` because they protect MVP behavior.
- Generated artifacts, local diagnostics, and scratch experiments should stay out of the release branch.
- Production deploy is configured through `Vercel`.
