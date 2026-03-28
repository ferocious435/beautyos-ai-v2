/**
 * BeautyOS AI v2 - Global Configuration Registry
 * Централизованное хранилище всех настроек ИИ, моделей и констант.
 */

export const CONFIG = {
  // --- AI Model Versions (Verified 2026-03-28) ---
  MODELS: {
    ANALYSIS: 'gemini-3-flash',      // 5 RPM / 20 RPD
    CONTENT: 'gemini-3-flash',       // 5 RPM / 20 RPD
    ENHANCEMENT: 'imagen-4-ultra-generate', // 25 RPD
    EMBEDDING: 'gemini-embedding-1',
    FALLBACK: 'gemini-2.5-flash',    // 20 RPD
    MARKET_TRENDS: 'gemini-3-flash',
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
