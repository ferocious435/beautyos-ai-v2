import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, masterName = 'Beauty Master' } = req.body;
    if (!image) return res.status(400).json({ error: 'Image is required' });

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GOOGLE_GEMINI_API_KEY is not defined in Vercel Environment Variables" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // MODEL STRATEGY: Try the user's preferred 3.1 Pro first, fallback to stable Flash-Latest if strictly needed (to avoid 429s).
    const MODEL_PRIORITY = ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-flash-latest"];
    
    let visionModel;
    let lastError: any;

    for (const modelId of MODEL_PRIORITY) {
      try {
        console.log(`Attempting model: ${modelId}`);
        visionModel = genAI.getGenerativeModel({ model: modelId });
        // Extract real MIME type from base64 string
        const mimeTypeSelector = image.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        
        // Enhanced Prompt: ULTRA-PREMIUM VISION ANALYSIS
        const getPrompt = (name: string) => `
Role: Global Top-Tier Beauty Content Strategist.
Master Name: ${name}

STRICT INSTRUCTION: Analyze the uploaded photo with surgical precision. 
Identify:
1. Procedure type (Manicure, Lashes, Makeup, Hair, etc.)
2. Color Palette (specific shades, matte/glossy, gradients)
3. Technical excellence (perfect lines, symmetry, clean cuticles, volume)
4. Overall aesthetic (Glamour, Natural, Edgy, Classic)

Write 4 variants of engaging Hebrew social media copy (RTL) based ONLY on these visual details. 
Avoid generic AI-sounding fluff. Use professional terminology like "מבנה אנטומי", "דיוק במילימטר", "ברק שלא נגמר".

### RESPONSE FORMAT (STRICT JSON):
{
  "instagram": "Compelling story-telling post with hooks.",
  "facebook": "Professional/Technical excellence focus.",
  "whatsapp": "Direct status hook.",
  "short_overlay": "Premium 2-4 word overlay (e.g. 'שלמות בכל נגיעה')"
}`;

        const prompt = getPrompt(masterName);
        const result = await visionModel.generateContent([
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: mimeTypeSelector } }
        ]);
        
        const responseText = await result.response.text();
        let jsonResult;
        try {
          const sanitized = responseText.replace(/```json\n?|```/g, "").trim();
          jsonResult = JSON.parse(sanitized);
        } catch (e) {
          jsonResult = { instagram: responseText, facebook: responseText, whatsapp: responseText, short_overlay: "עיצוב מושלם" };
        }
        
        return res.status(200).json(jsonResult);

      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelId} failed: ${err.message}`);
        if (err.message.includes('404') || err.message.includes('not found')) continue; 
        if (err.message.includes('429')) continue; // Try next model on quota limit
        break; // Crash on other serious errors
      }
    }

    throw lastError || new Error("All generative models failed to respond.");
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
}
