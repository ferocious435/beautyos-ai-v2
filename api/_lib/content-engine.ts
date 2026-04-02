import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from './config.js';

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '');

export interface OverlayLine {
  text: string;
  yPosition: number;
  fontSize: number;
  color: string;
  highlightColor?: string;
}

export interface DesignData {
  post: string;
  cta: string;
  overlay: OverlayLine[];
  detectedService: string;
  imagenPrompt: string;
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
    Analyze the uploaded image and create:
    1. A short, high-conversion Hebrew caption.
    2. 5 viral hashtags.
    3. Design 1-2 overlay lines (text, yPosition 0.1-0.9, fontSize 40-80, color, highlightColor).
    Return JSON only: { "caption": "...", "hashtags": [...], "overlay": [...], "detectedService": "..." }
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
      overlay: data.overlay || [],
      detectedService: data.detectedService || "Beauty Professional",
      imagenPrompt: data.imagenPrompt || "Professional beauty retouch"
    };
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
      ] as any,
    });
    // @ts-ignore
    (model as any).generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };
    
      // SYSTEM_MASTER_INSTRUCTION (v40 Stabilization)
      const enhancePrompt = `
        ${CONFIG.PROMPTS.BEAUTY_SYSTEM_MASTER_PROMPT}
        Specific Goal: ${prompt}.
        Style: Commercial Luxury Photography, High Dynamic Range (HDR), vibrant colors, sharp textures.
        Action: Transform into a magazine-cover quality masterpiece.
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

      const result = await Promise.race([generationPromise, timeoutPromise]) as any;

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
