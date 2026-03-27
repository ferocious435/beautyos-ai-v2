import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from './config.js';
import { getLatestTrends } from './trend-analyzer.js';
import axios from 'axios';

// ПРЕДУПРЕЖДЕНИЕ: Удален 'sharp', так как он вызывает 500 ошибки на Vercel.
// Мы будем отправлять оригиналы или позволять браузеру обрабатывать эффекты.

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface ContentResult {
  post: string;
  cta: string;
  imagenPrompt: string;
  overlayTitle?: string;
  overlaySubtitle?: string;
  backgroundAction?: 'keep' | 'replace';
  detectedService?: string;
}

export async function analyzeAndGenerate(imageBuffer: Buffer, customPrompt?: string): Promise<ContentResult> {
  const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.ANALYSIS });
  const trends = await getLatestTrends();

  const trendContext = trends ? `
    CURRENT WEEK TRENDS:
    - Visuals: ${trends.visualAnchors}
  ` : '';
  
  const prompt = `
    ${CONFIG.PROMPTS.UNIVERSAL_BEAUTY_DNA}
    Analyze the uploaded image.
    ${customPrompt ? `Instructions: "${customPrompt}"` : 'Full Autopilot.'}
    
    CRITICAL: Return JSON ONLY in this format:
    {
      "post": "Insta-ready caption in Hebrew",
      "cta": "WhatsApp CTA in Hebrew",
      "imagenPrompt": "Ultra-realistic prompt for Imagen 4 Ultra to enhance this specific photo",
      "overlayTitle": "Catchy 2-3 word Hebrew title for the image overlay (e.g. מניקור מושלם)",
      "overlaySubtitle": "3 words representing values (e.g. דיוק. ברק. רגש)",
      "backgroundAction": "keep or replace (replace if the current background is messy/unprofessional)",
      "detectedService": "Short specific service name"
    }
  `;

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/jpeg' } }
  ]);
  
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {}
  }

  return {
    post: text,
    cta: "הזמיני תור בוואטסאפ",
    imagenPrompt: "Luxury beauty",
    detectedService: "Beauty Professional"
  };
}

export async function enhanceImage(imageBuffer: Buffer, prompt: string): Promise<Buffer> {
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
    console.warn('Imagen 4 failed, returning original:', err);
  }

  // БЕЗОПАСНЫЙ ВОЗВРАТ: Без 'sharp', просто возвращаем оригинал
  return imageBuffer;
}
