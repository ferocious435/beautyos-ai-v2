 
 
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
    Task: Analyze this photo and prepare a clean beauty retouch plus social caption.
    Goal: ${serviceGoal}.
    CRITICAL: Always return valid JSON.
  `;

  const userPrompt = `
    Analyze the uploaded beauty photo as a Senior Marketing Art-Director.
    1. Identify Focal Point: (service result, hair, skin, face, hands, brows, lashes, makeup).
    2. Composition Strategy:
       - No marketing text should be placed on the image.
       - The final image may include only subtle brand/logo placement.
       - Social network resizing should be handled by the renderer, not by adding frames.
    3. Aesthetic Diversity (LUXURY DNA):
       - Don't just pick Gold! Choose Pearl White, Platinum Silver, Rose Gold, or Sleek Black based on photo colors.
    
    Return JSON only:
    {
      "caption": "Selling Hebrew text here...",
      "hashtags": ["#luxury", "..."],
      "detectedService": "Facial/Makeup/Hair/Massage/etc",
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
      post: "התמונה מוכנה לפרסום",
      cta: "לפרסום",
      overlay: [],
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
        { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
        { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any }
      ],
    });
    (model as any).generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };
    
      // SYSTEM_MASTER_INSTRUCTION (v55.2 NAIL & SKIN POLISH DNA)
      const enhancePrompt = `
        PRO-LEVEL BEAUTY RETOUCH & STUDIO EXPANSION (v65.0 Art-Director Edition).
        1. MASTER POLISH: Identify the focal point (service result, skin, face, hair, hands, brows, lashes, makeup). Perform high-end retouching, remove imperfections, even out tones, and add professional highlights.
        2. NATURAL FULL-PHOTO ENHANCEMENT: Use the original photo as the source. Do not add frames, borders, side bars, black bars, posters, labels, written text, or graphic overlays.
        3. ZERO ARTIFACTS: There must be NO visible seams, mismatched lighting, text artifacts, or unnatural borders.
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
        }] as any,
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as any
      }, { signal: controller.signal });

      const result: any = await Promise.race([generationPromise, timeoutPromise]);

      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if ((part as any).inlineData?.data) {
            console.log('[BeautyOS Master] ✅ Professional retouch completed!');
            return Buffer.from((part as any).inlineData.data, 'base64');
          }
        }
      }
      throw new Error('AI_RETURNED_NO_IMAGE');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('AI_TIMEOUT');
      } else {
        throw err;
      }
    }
  } catch (err: any) {
    console.error('[BeautyOS Master] 💥 Retouch failed:', err.message);
    throw err;
  }
}

export async function reframeImage(imageBuffer: Buffer, prompt: string): Promise<Buffer> {
  try {
    const model = genAI.getGenerativeModel({
      model: CONFIG.MODELS.ENHANCEMENT,
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
        { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any }
      ],
    });
    (model as any).generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };

    const reframePrompt = `
      PHOTO REFRAMING ONLY.
      This is not a retouching task and not a creative redesign task.
      Use the uploaded image as the source photo.
      Identify the main subject and the visible beauty/treatment result.
      Preserve the subject exactly: no body changes, no face changes, no pose changes, no clothing changes, no skin/body reshaping, no beautifying, no repainting.
      Adapt only the surrounding composition/background to fit the selected social platform.
      You may naturally extend existing background where the target format needs more space.
      You may reduce only non-essential empty background outside the subject where the target format needs less space.
      Never crop the subject or the visible treatment result.
      Never stretch or squeeze the photo.
      No text, captions, labels, prices, borders, frames, side bars, black bars, blur background, stickers, logos, or graphic overlays.
      The result must look like a clean realistic photo captured in the same location.
      Context: ${prompt}.
    `;

    console.log(`[BeautyOS Reframe] Starting natural reframe (${CONFIG.MODELS.ENHANCEMENT})...`);

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
            { text: reframePrompt },
            { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } }
          ]
        }] as any,
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } as any
      }, { signal: controller.signal });

      const result: any = await Promise.race([generationPromise, timeoutPromise]);

      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if ((part as any).inlineData?.data) {
            console.log('[BeautyOS Reframe] Natural reframe completed');
            return Buffer.from((part as any).inlineData.data, 'base64');
          }
        }
      }
      throw new Error('AI_RETURNED_NO_IMAGE');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('AI_TIMEOUT');
      }
      throw err;
    }
  } catch (err: any) {
    console.error('[BeautyOS Reframe] Reframe failed:', err.message);
    throw err;
  }
}
