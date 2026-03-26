import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from './config';
import { getLatestTrends } from './trend-analyzer';
import axios from 'axios';
import sharp from 'sharp';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface ContentResult {
  post: string;
  cta: string;
  imagenPrompt: string;
  overlayText?: string;
  detectedService?: string; // New field for universal engine
}

// --- Models and Prompts are now managed in config.ts ---

export async function analyzeAndGenerate(imageBuffer: Buffer, customPrompt?: string): Promise<ContentResult> {
  const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.ANALYSIS });
  const trends = await getLatestTrends();

  const trendContext = trends ? `
    CURRENT WEEK TRENDS (Inject these vibes):
    - Visuals: ${trends.visualAnchors}
    - Semantics: ${trends.semanticAnchors}
    - Addressing Pains: ${trends.hiddenDeficits}
  ` : '';
  
  const prompt = `
    ${CONFIG.PROMPTS.UNIVERSAL_BEAUTY_DNA}
    ${CONFIG.PROMPTS.IMAGEN_PREMIUM_STYLE}
    ${trendContext}

    Analyze the uploaded image.
    
    Instruction for current generation:
    ${customPrompt ? `The master provided these specific instructions: "${customPrompt}"` : 'Full Autopilot: Analyze the work and generate the best luxury post based on the detected service.'}
    
    Tasks:
    1. Write a viral Instagram post in HEBREW (emojis included). Focus on the "Expert & Premium" aura.
    2. Suggest a short CTA (e.g., "הזמיני תור בוואטסאפ").
    3. Craft a "Lux Enhancement" prompt for Imagen 4 Ultra (specify lighting, retouching, and sector-specific details like "perfect cuticle light reflection" or "ultra-defined eyebrow hair strokes").
    4. Suggest a short overlay text for the photo (2-4 words in Hebrew).
    
    Return EXACT JSON: 
    { "post": "...", "cta": "...", "imagenPrompt": "...", "overlayText": "...", "detectedService": "..." }
  `;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } }
  ]);
  
  const text = result.response.text().replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

export async function enhanceImage(imageBuffer: Buffer, prompt: string): Promise<Buffer> {
  // 1. Imagen 4 Ultra Call
  try {
    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODELS.ENHANCEMENT}:predict?key=${GEMINI_API_KEY}`;
    
    const response = await axios.post(imagenUrl, {
      instances: [{ prompt: `${prompt}. High-end beauty editorial photography.` }],
      parameters: { sampleCount: 1, outputMimeType: "image/jpeg" }
    }, { timeout: 25000 });

    if (response.data?.predictions?.[0]?.bytesBase64Encoded) {
      return Buffer.from(response.data.predictions[0].bytesBase64Encoded, 'base64');
    }
  } catch (err) {
    console.warn('Imagen 4 failed, using Sharp fallback:', err);
  }

  // 2. Sharp Fallback (Luxury Filters)
  return await sharp(imageBuffer)
    .modulate({ brightness: 1.05, saturation: 1.1 })
    .sharpen()
    .toBuffer();
}
