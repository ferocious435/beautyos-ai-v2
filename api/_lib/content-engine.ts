 
 
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from './config.js';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '');

export interface OverlayLine {
  type?: 'PRICE' | 'TITLE' | 'LOGO' | 'PROMO' | string;
  text: string;
  fontSize?: number;
  yPosition?: number;
  xPosition?: number; // 0.0 to 1.0
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  highlightColor?: string;
  rotation?: number; // In degrees
}

export interface DesignData {
  post: string;
  cta: string;
  overlay: OverlayLine[];
  detectedService: string;
  imagenPrompt: string;
  design?: {
    [key: string]: { x: number; y: number; align: 'left' | 'center' | 'right' }
  };
  style?: {
    preset: 'LUXURY_GOLD' | 'MINIMAL_WHITE' | 'GLASSMorphism' | 'MODERN_SHADOW' | 'LUXURY_ROSE' | 'LUXURY_SILVER';
    primaryColor: string;
    secondaryColor: string;
    shadowOpacity: number;
    boxOpacity: number;
    isMultiLine?: boolean;
    borderColor?: string;
  };
}

/**
 * Beauty Studio Analysis & Design Engine
 * Orchestrates technical quality and luxury aesthetics
 */
export async function analyzeAndGenerate(
  imageBuffer: Buffer,
  serviceGoal: string = "Premium beauty marketing"
): Promise<DesignData> {
  const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.ANALYSIS });
  
  const systemPrompt = `
    ${CONFIG.PROMPTS.UNIVERSAL_BEAUTY_DNA}
    Task: Analyze this photo and design a viral Instagram/FB post.
    Goal: ${serviceGoal}.
    CRITICAL: Always return valid JSON.
  `;

  const userPrompt = `
    Analyze the uploaded beauty photo as a Senior Marketing Art-Director.
    1. Identify Focal Point: (hands, nails, face).
    2. Composition Strategy:
       - Subject Protection: No text on the focal point.
       - Asymmetry: Prefer top-corners, side-backgrounds, or balanced bottom.
       - Multi-line: suggest 2 lines if the text is dramatic (e.g. "Special Promo \n Book Now").
    3. Aesthetic Diversity (LUXURY DNA):
       - Don't just pick Gold! Choose Pearl White, Platinum Silver, Rose Gold, or Sleek Black based on photo colors.
    
    Return JSON only:
    {
      "caption": "Selling Hebrew text here...",
      "hashtags": ["#luxury", "..."],
      "detectedService": "Manicue/Botox/etc",
      "design": {
        "PRICE": { "x": 0.85, "y": 0.15, "align": "right" },
        "TITLE": { "x": 0.5, "y": 0.05, "align": "center" }
      },
      "style": {
        "preset": "LUXURY_GOLD/SILVER/ROSE/MINIMAL/CLASSIC",
        "primaryColor": "#FFFFFF",
        "secondaryColor": "#000000",
        "borderColor": "#C0C0C0",
        "shadowOpacity": 0.7,
        "boxOpacity": 0.3,
        "isMultiLine": true
      },
      "imagenPrompt": "Ultra-vibrant high-end beauty studio expansion."
    }
  `;

  const result = await model.generateContent([
    { text: systemPrompt + userPrompt },
    { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } }
  ]);

  const text = result.response.text();
  const cleanJson = text.replace(/```json|```/g, "").trim();
  
  try {
    const data = JSON.parse(cleanJson);
    return {
      post: data.post || data.caption || "",
      cta: data.cta || "Book now!",
      overlay: data.overlay || [], // Legacy support
      detectedService: data.detectedService || "Beauty Professional",
      imagenPrompt: data.imagenPrompt || "Professional beauty retouch",
      design: data.design, // Pass design metadata
      style: data.style // Pass style metadata
    };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    console.error("Failed to parse AI response:", text);
    return {
      post: "Professional Beauty Service",
      cta: "Book now!",
      overlay: [{ text: "Premium Quality", yPosition: 0.8, fontSize: 60, color: "#FFFFFF" }],
      detectedService: "Beauty Professional",
      imagenPrompt: "Professional beauty retouch"
    };
  }
}

export async function enhanceImage(imageBuffer: Buffer, prompt: string): Promise<Buffer> {
  try {
    // Using high-fidelity content generation model
    const model = genAI.getGenerativeModel({ 
      model: CONFIG.MODELS.ENHANCEMENT,
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ] as unknown,
    });
    // @ts-expect-error - no exact types available
    (model as unknown).generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };
    
      // SYSTEM_MASTER_INSTRUCTION (v55.2 NAIL & SKIN POLISH DNA)
      const enhancePrompt = `
        PRO-LEVEL BEAUTY RETOUCH & STUDIO EXPANSION (v65.0 Art-Director Edition).
        1. MASTER POLISH: Identify the focal point (nails, skin, face). Perform high-end retouching, remove imperfections, even out tones, and add professional highlights.
        2. SEAMLESS EXPANSION: The input image contains a sharp subject inside a "Blurred Frame" context. Use this context (colors and textures) as a guide to EXPAND the scene into a full, seamless luxury beauty studio. 
        3. ZERO ARTIFACTS: Focus on the transition zones. There must be NO visible seams, mismatched lighting, or unnatural borders between the original subject and the expanded background.
        4. LUXURY AESTHETIC: Finish the background with professional studio elements (marble surfaces, elegant bokeh, soft diffusion lighting).
        Style: High-end Commercial Photography, Cinematic Studio Lighting.
        Context: ${prompt}.
      `;

    console.log(`[BeautyOS Master] 🚀 Starting Retouch (${CONFIG.MODELS.ENHANCEMENT})...`);
    
    // 🔥 HOT-FIX: Bulletproof timeout (25s) 
    const controller = new AbortController();
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new Error('AbortError'));
      }, 40000);
    });

    try {
      const generationPromise = model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: enhancePrompt },
            { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } }
          ]
        }] as unknown,
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as unknown
      }, { signal: controller.signal });

      const result = await Promise.race([generationPromise, timeoutPromise]) as unknown;

      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if ((part as unknown).inlineData?.data) {
            console.log('[BeautyOS Master] ✅ Professional retouch completed!');
            return Buffer.from((part as unknown).inlineData.data, 'base64');
          }
        }
      }
      throw new Error('AI_RETURNED_NO_IMAGE');
    } catch (err: unknown) {
      if (err.name === 'AbortError') {
        throw new Error('AI_TIMEOUT');
      } else {
        throw err;
      }
    }
  } catch (err: unknown) {
    console.error('[BeautyOS Master] 💥 Retouch failed:', err.message);
    throw err;
  }
}
