 
 
import 'dotenv/config';

const LEGACY_TEXT_MODEL_ALIASES: Record<string, string> = {
  'models/gemini-3.1-flash-live-preview': 'models/gemini-2.5-flash',
};

const LEGACY_IMAGE_MODEL_ALIASES: Record<string, string> = {
  'models/imagen-4.0-generate-001': 'models/gemini-2.5-flash-image',
  'models/gemini-3.1-flash-live-preview': 'models/gemini-2.5-flash-image',
};

const normalizeModel = (
  configured: string | undefined,
  fallback: string,
  aliases: Record<string, string>,
) => {
  const raw = (configured || '').trim();
  const resolved = aliases[raw] || raw || fallback;

  if (raw && raw !== resolved) {
    console.warn(`[CONFIG] Remapped unsupported model "${raw}" -> "${resolved}"`);
  }

  return resolved;
};

export const CONFIG = {
  GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  // --- AI Model Versions (Verified via API 2026-05-25) ---
  MODELS: {
    ANALYSIS: normalizeModel(process.env.MODEL_ANALYSIS, 'models/gemini-2.5-flash', LEGACY_TEXT_MODEL_ALIASES),
    CONTENT: normalizeModel(process.env.MODEL_CONTENT, 'models/gemini-2.5-flash', LEGACY_TEXT_MODEL_ALIASES),
    ENHANCEMENT: normalizeModel(process.env.MODEL_ENHANCEMENT, 'models/gemini-2.5-flash-image', LEGACY_IMAGE_MODEL_ALIASES),
    IMAGE: normalizeModel(process.env.MODEL_IMAGE, 'models/gemini-2.5-flash-image', LEGACY_IMAGE_MODEL_ALIASES),
    VIDEO: 'models/veo-3.1-generate-preview',
    EMBEDDING: 'models/text-embedding-004',
    FALLBACK: 'models/gemini-2.5-flash',
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
      1. ANALYZE: Service type (nails, hair, brows, lashes, skin, makeup, massage, aesthetics, wellness).
      2. ENHANCE: Professional high-end retouching tailored to specific area. 
         - Nails/Brows/Lashes: Precision focus, sharp textures, high-gloss shine.
         - Hair/Skin/Makeup: Silk-smooth texture, healthy glow, balanced tones, refined finish.
         - Massage/Wellness/Aesthetics: Clean treatment context, calm luxury atmosphere, realistic results.
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
