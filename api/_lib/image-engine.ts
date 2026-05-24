import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from "./config.js";

const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);

/**
 * Хелпер для автоматического повтора при 503/429 ошибках
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 5, baseDelayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const isTransient = e.message?.includes('503') || e.message?.includes('429') || e.message?.includes('overloaded');
      if (i === retries - 1 || !isTransient) throw e;
      const delay = baseDelayMs * Math.pow(1.5, i); // 2s, 3s, 4.5s, 6.7s...
      console.warn(`[RETRY] Google API Error (Attempt ${i + 1}/${retries}). Retrying in ${delay.toFixed(0)}ms...`, e.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

/**
 * Анализирует изображение и создает детальное описание работы (ноготь, прическа и т.д.)
 * для сохранения идентичности в последующей генерации.
 */
export async function analyzeWork(imageBuffer: Buffer): Promise<string> {
  const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.ANALYSIS });
  
  const prompt = `
    Analyze this photo of a beauty or wellness service (nails, hair, brows, lashes, skin, makeup, massage, aesthetics, etc.).
    Extract the "essence" of the work:
    1. Type of procedure.
    2. Exact colors, textures, and shapes.
    3. Specific details that MUST NOT change (e.g. nail pattern, hair shade, makeup finish, skin result, treatment atmosphere).
    Generate a concise technical description to use as a reference for high-fidelity recreation.
  `;

  const result = await withRetry(() => model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/jpeg",
      },
    },
  ]));

  return result.response.text();
}

/**
 * Создает рекламный пост на основе анализа и выбранного стиля/формата.
 * Использует модель Imagen 3 (Nano Banana Pro).
 */
export async function generateNanoPost(
  imageBuffer: Buffer,
  analysis: string,
  styleId: string,
  formatId: string
): Promise<any> {
  const model = genAI.getGenerativeModel({ 
    model: CONFIG.MODELS.IMAGE, // models/gemini-3-pro-image-preview
  }, { apiVersion: 'v1beta' });
  
  const style = (CONFIG as any).AD_STYLES[styleId.toUpperCase()] || CONFIG.AD_STYLES.LUXURY;
  const format = (CONFIG as any).FORMATS[formatId.toUpperCase()] || CONFIG.FORMATS.FEED;

  const prompt = `Create a polished, ultra-realistic marketing/catalog-style image based on the uploaded reference photo in ${format.label} (${format.ratio}) aspect ratio.

PRIMARY RULE — STRICT SUBJECT PRESERVATION:
The main subject in the uploaded image must remain exactly the same and must NOT be redesigned, altered, replaced, beautified, or structurally changed in any way.

You must preserve with maximum fidelity:
- the exact subject identified in the image analysis: <subject_identity>${analysis}</subject_identity>
- exact shape, anatomy, proportions, structure, geometry, and visual identity of the main subject
- all real details visible in the original reference
- if the subject is hands/nails: preserve the exact hand shape, finger proportions, skin texture, nail bed shape, cuticles, nail structure, length, and design
- if the subject is hair/hairstyle: preserve the exact haircut, hair shape, length, volume, texture, hairline, and overall hairstyle structure
- if the subject is makeup, skin, brows, lashes, massage, or another treatment result: preserve the exact visible outcome, proportions, texture, symmetry, and treatment identity
- if the subject is another beauty/service result: preserve its exact real form and visible result without redesigning it

COMPOSITION & FRAMING — NO-LOSS CENTERING:
- Position the ENTIRE main subject from the reference image prominently for the ${format.label} format.
- NO-LOSS RULE: No part of the subject (fingers, hair, edges of the work) should be cut off, cropped, or missing from the final frame.
- FLEXIBLE PADDING: Seamlessly extend the background/environment around the intact subject to perfectly fill the ${format.ratio} aspect ratio. 
- Ensure a 100% natural, high-end photographic transition with no visible borders, artifacts, or blur.

Do NOT:
- change the subject’s shape or scale
- modify proportions to fit the frame
- invent missing details of the work itself
- restyle the main subject
- generate a different version of the subject

Allowed changes:
- improve overall image quality
- enhance sharpness, clarity, lighting balance, and dynamic range
- transform the environment/background into: ${style.prompt}
- add a tasteful marketing/catalog aesthetic around the unchanged subject

VISUAL GOAL:
The final image must look like a professional photo shot in ${format.ratio} ratio.
It should feel premium, authentic, elegant, and realistic — as if shot for a high-end marketing post.

PHOTOGRAPHY STYLE:
High-end smartphone camera look, natural premium lighting, realistic skin/hair/material detail, crisp focus on the main subject, soft shallow depth of field, smooth creamy bokeh in the background.

ASPECT RATIO:
Target Aspect Ratio: ${format.ratio}.`;

  try {
    const chat = model.startChat({
      generationConfig: {
        responseModalities: ["IMAGE"]
      } as any
    });

    // ПОРЯДОК ОЧЕНЬ ВАЖЕН: РЕФЕРЕНС (Image) ПЕРВЫМ, ИНСТРУКЦИЯ (Text) ВТОРЫМ.
    const result = await withRetry(() => chat.sendMessage([
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: "image/jpeg"
        }
      },
      prompt
    ]));

    const inlineData = result.response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (inlineData && inlineData.data) {
      return { base64: inlineData.data, mime: inlineData.mimeType };
    }
    throw new Error('No image generated by the API.');
  } catch (error: any) {
    console.error("Nano Banana Generation Error:", error);
    throw new Error(`[400 PAYLOAD DIAGNOSTICS]: ${JSON.stringify({
      textLength: prompt.length,
      modelId: CONFIG.MODELS.IMAGE,
      errorMsg: error.message
    })} | ` + `Failed to generate catalog image: ${error.message}`);
  }
}
