import { GoogleGenerativeAI } from "@google/generative-ai";
import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, masterName = 'Beauty Master' } = req.body;
    if (!image) return res.status(400).json({ error: 'Image is required' });

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API Key is missing" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // MODEL STRATEGY: Use 1.5 Pro or 2.0 Flash for best vision/text balance
    const MODEL_PRIORITY = ["gemini-1.5-pro", "gemini-2.0-flash-exp", "gemini-1.5-flash"];
    
    let lastError: any;

    for (const modelId of MODEL_PRIORITY) {
      try {
        console.log(`Attempting analysis with model: ${modelId}`);
        const model = genAI.getGenerativeModel({ model: modelId });
        
        const mimeType = image.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        
        const prompt = `
          Role: Creative Director for Luxury Beauty Brands.
          Master Name: ${masterName}

          Task: Analyze this beauty work (nails, makeup, or hair). 
          1. Identify the specific technique and style.
          2. Create elite marketing content in sophisticated Hebrew (RTL).

          ### RESPONSE FORMAT (STRICT JSON):
          {
            "instagram": "Sophisticated post with hook and hashtags.",
            "facebook": "Authority-building professional text.",
            "whatsapp": "Short viral status.",
            "short_overlay": "Powerful 2-4 word artistic title"
          }
        `;

        const result = await model.generateContent([
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]);
        
        const responseText = await result.response.text();
        
        // Robust JSON parsing
        let jsonResult;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            jsonResult = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error("Failed to parse matched JSON:", e);
          }
        }

        if (!jsonResult) {
          jsonResult = { 
            instagram: responseText, 
            facebook: responseText, 
            whatsapp: "עבודה מדהימה!", 
            short_overlay: "עיצוב יוקרתי" 
          };
        }
        
        return res.status(200).json(jsonResult);

      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelId} failed:`, err.message);
        if (err.message.includes('429') || err.message.includes('404')) continue;
        break; 
      }
    }

    throw lastError || new Error("All models failed");
  } catch (error: any) {
    console.error('Analyze Error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
}
