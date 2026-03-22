import { GoogleGenerativeAI } from "@google/generative-ai";
import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image } = req.body;
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) throw new Error('API Key missing');

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using Nano Banana Pro (Gemini 3 Pro Image Preview) for the ultimate vision-intelligence
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

    const mimeType = image.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
Role: Luxury Beauty Magazine Photo Editor.
Task: Analyze this raw beauty photo (nails/lashes/makeup). 
Determine the IDEAL professional editing parameters to make it look like a high-end commercial shot.

Output ONLY a JSON object with these fields (values are percentages/offsets):
{
  "brightness": 50 to 150 (100 is neutral),
  "contrast": 50 to 150 (100 is neutral),
  "saturate": 0 to 200 (100 is neutral),
  "sharpen": 0 to 100 (0 is neutral),
  "shadows": 0 to 100 (0 is neutral)
}

Focus on: 
- If details are blurry, increase sharpen.
- If it's too dark, increase brightness.
- If colors are dull, increase saturate.
- If it lacks depth, increase shadows.
`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64Data, mimeType } }
    ]);

    const responseText = await result.response.text();
    const sanitized = responseText.replace(/```json\n?|```/g, "").trim();
    const jsonResult = JSON.parse(sanitized);

    return res.status(200).json(jsonResult);
  } catch (error: any) {
    console.error('Enhance Error:', error);
    // Fallback to reasonable professional defaults if AI fails
    return res.status(200).json({
      brightness: 105,
      contrast: 110,
      saturate: 115,
      sharpen: 40,
      shadows: 20
    });
  }
}
