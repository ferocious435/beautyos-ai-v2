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
    // After diagnostics, gemini-2.0-flash returned a 429 (Quota limit: 0).
    // gemini-flash-latest is the generic alias for the best stable model (1.5) with non-zero quota.
    const visionModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    // Extract real MIME type from base64 string
    const mimeTypeSelector = image.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    
    // Enhanced Prompt: STRICT VISION ANALYSIS
    const getPrompt = (name: string) => `
Role: Senior Premium Beauty Content Creator.
Master Name: ${name}

CRITICAL TASK: Analyze the ATTACHED PHOTO in detail. 
Identify exactly what is shown (nails, eyelashes, hair, etc.), the colors used, the style, and the quality of the work.
Then write 4 variants of copy in HEBREW (RTL) based STRICTLY on what you see in the image.

### RESPONSE FORMAT (STRICT JSON):
{
  "instagram": "Creative post based on the visual details. Include hooks and emojis.",
  "facebook": "Professional post focusing on the technique shown.",
  "whatsapp": "Short status update.",
  "short_overlay": "2-4 word catchy hook describing the image (e.g., 'ציפורניים מושלמות')."
}`;

    const prompt = getPrompt(masterName);
    const result = await visionModel.generateContent([
      {
        text: prompt
      },
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeTypeSelector
        }
      }
    ]);
    const responseText = await result.response.text();
    
    let jsonResult;
    try {
      const sanitized = responseText.replace(/```json\n?|```/g, "").trim();
      jsonResult = JSON.parse(sanitized);
    } catch (e) {
      jsonResult = { instagram: responseText, facebook: responseText, whatsapp: responseText };
    }

    res.status(200).json(jsonResult);
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
}
