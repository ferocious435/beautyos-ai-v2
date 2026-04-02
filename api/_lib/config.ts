import 'dotenv/config';

export const CONFIG = {
  GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  // --- AI Model Versions (Verified 2026-04-02) ---
  MODELS: {
    ANALYSIS: 'models/gemini-2.5-flash',           // Stable (v37)
    CONTENT: 'models/gemini-2.5-flash',            // Fast (v37)
    ENHANCEMENT: 'models/gemini-3.1-flash',        // SOTA Image/Multimodal (v37)
    EMBEDDING: 'models/gemini-embedding-001',
    FALLBACK: 'models/gemini-2.5-pro',              // Legacy Stable
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
