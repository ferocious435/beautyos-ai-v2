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
Role: Creative Director for Luxury Beauty Brands (example: Dior, Chanel).
Master Name: ${name}

Task: You are analyzing a masterpiece by a world-class beauty professional.
STRICT INSTRUCTION: 
1. Look at the photo. Identify exactly the technique: French manicure, Ombre, Soft Gel, Eyelash Volume, whatever is there.
2. Sense the 'vibe': Is it 'Old Money', 'Clean Girl', 'Red Carpet', 'Minimalist'?
3. Mention the colors and the light in the text.

Writing Style:
- Use sophisticated Hebrew (RTL).
- Emotional and high-end. 
- Avoid generic AI sentences. 
- Use professional terms like "דיוק אנטומי", "השתקפות מושלמת", "מינימליזם יוקרתי".

### RESPONSE FORMAT (STRICT JSON):
{
  "instagram": "A captivating, seductive social media post with a strong hook and line breaks.",
  "facebook": "A professional, authority-building post emphasizing high-end technique.",
  "whatsapp": "A short, viral-style status update.",
  "short_overlay": "A 2-4 word powerful artistic title (e.g., 'אמנות הדיוק הנקי')"
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
