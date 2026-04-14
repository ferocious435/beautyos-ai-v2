 
 
import 'dotenv/config';

export const CONFIG = {
  GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  // --- AI Model Versions (Verified via API 2026-04-14) ---
  MODELS: {
    ANALYSIS: process.env.MODEL_ANALYSIS || 'models/gemini-3.1-flash-live-preview',       
    CONTENT: process.env.MODEL_CONTENT || 'models/gemini-3.1-flash-live-preview',       
    ENHANCEMENT: process.env.MODEL_ENHANCEMENT || 'models/imagen-4.0-generate-001', // NANO BANANA POWER
    VIDEO: 'models/veo-3.1-generate-preview',
    EMBEDDING: 'models/text-embedding-004',
    FALLBACK: 'models/gemini-2.5-flash-native-audio-latest',
  },

  // --- Style DNA & Master prompts ---
  PROMPTS: {
    // Ядро универсального эксперта (используется в content-engine.ts)
    UNIVERSAL_BEAUTY_DNA: `
      You are the "BeautyOS Luxury Authority" - the ultimate global beauty expert.
      Your DNA: Minimalist, Glamorous, Professional, Timeless Excellence. 
      Your Style: High-end luxury magazine aesthetic, razor-sharp precision.
      Your Language: Hebrew (Israel).
    `,

    // Универсальный мастер-промпт для улучшения (Золотой Стандарт v29)
    BEAUTY_SYSTEM_MASTER_PROMPT: `
      BeautyOS Universal Enhancer Mode.
      1. ANALYZE: Service type (nails, hair, brows, lashes, skin, aesthetics).
      2. ENHANCE: Professional high-end retouching tailored to specific area. 
         - Nails/Brows/Lashes: Precision focus, sharp textures, high-gloss shine.
         - Hair/Skin: Silk-smooth texture, healthy glow, professional studio skin tones.
      3. QUALITY: Ultra-sharpness, cinematic studio lighting, 8k professional resolution.
         - Fix: Motion blur, noise, artifacts, messy backgrounds.
      4. COMPOSITION: Editorial framing. 
         - Social Ready: Keep subject centered, leave "Safe Margin" (bottom 20%) for text overlays.
      Output: ONLY the final professional visual results. Realistic, premium, sales-oriented.
    `,

    // Контекст для генерации Imagen промптов (Legacy fallback)
    IMAGEN_PREMIUM_STYLE: `
      Editorial beauty photography, 8k resolution, cinematic lighting, ultra-realistic textures.
    `,
  },

  // --- System Constants ---
  PIPELINE: {
    MAX_PORTFOLIO_ITEMS: 5,
    DISCOVERY_RADIUS_KM: 10,
  },

  // --- Design DNA (New v29.4) ---
  DESIGN: {
    TYPES: {
       PRICE: 'PRICE',
       TITLE: 'TITLE',
       WATERMARK: 'WATERMARK',
       PROMO: 'PROMO'
    },
    COLORS: {
      PRIMARY: '#FFFFFF',
      HIGHLIGHT: 'rgba(0,0,0,0.5)'
    }
  }
};
