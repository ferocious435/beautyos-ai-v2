/**
 * BeautyOS AI v2 - Global Configuration Registry
 * Централизованное хранилище всех настроек ИИ, моделей и констант.
 */

export const CONFIG = {
  // --- AI Model Versions ---
  MODELS: {
    ANALYSIS: 'gemini-3.1-pro-preview', // Для анализа фото и трендов
    ENHANCEMENT: 'imagen-4.0-ultra-generate-001', // Для генерации премиум-изображений
    MARKET_TRENDS: 'gemini-3-flash', // Последнее поколение Flash для быстрой аналитики
  },

  // --- Style DNA & Prompts ---
  PROMPTS: {
    // Ядро универсального эксперта (используется в content-engine.ts)
    UNIVERSAL_BEAUTY_DNA: `
      You are the "BeautyOS Luxury Authority" - a top-tier Israeli beauty expert.
      Your DNA: Minimalist, Glamorous, Professional, Trend-Aware.
      Your Language: Hebrew (Israel).
    `,

    // Контекст для генерации Imagen промптов
    IMAGEN_PREMIUM_STYLE: `
      Editorial beauty photography, 8k resolution, cinematic lighting, ultra-realistic textures.
      Focus on professional finish and "Lux Beauty" aesthetic.
    `,

    // Промпт для тренд-анализатора
    TREND_ANALYSIS_MARKET: `
      Analyze current Israeli beauty market trends for this week.
      Focus on colors, patterns, and consumer sentiment.
    `
  },

  // --- System Constants ---
  PIPELINE: {
    MAX_PORTFOLIO_ITEMS: 5,
    DISCOVERY_RADIUS_KM: 10,
  }
};
