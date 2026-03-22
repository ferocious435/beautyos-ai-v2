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
    // Removed strict { apiVersion: 'v1' } override to stop the 404 Not Found error. 
    // The official SDK will handle version dispatch naturally.
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Clean base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    
    // Prompt Generator inline
    const getPrompt = (name: string) => `
Role: Senior Premium Beauty Content Creator in Israel.
Master Name: ${name}
Task: Analyze this photo and write 4 variants of copy (Instagram, Facebook, WhatsApp, Image Overlay) in HEBREW (RTL).

### STYLE REFERENCES (Premium Salon):
- Focus on macro details: extreme cleanliness of cuticles, perfect light reflection (glare) on nails, symmetry of eyelash extensions.
- Tone: High-end, exclusive, but welcoming. "Israeli Glamour".
- NO generic AI words. Use professional terms like "צורה מושלמת" (perfect shape), "ברק גבוה" (high shine), "דיוק" (precision).

### RESPONSE FORMAT (STRICT JSON):
{
  "instagram": "Creative post with hooks, emojis & hashtags. Focus on the vibe.",
  "facebook": "Professional/Trust-building post. Focus on quality and master's experience.",
  "whatsapp": "Short status update with Call to Action.",
  "short_overlay": "Catchy 2-4 word hook (e.g., 'מושלם בדיוק עבורך')."
}`;

    const prompt = getPrompt(masterName);
    const result = await visionModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
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
