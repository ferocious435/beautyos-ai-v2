import { GeminiService } from '../server/src/services/geminiService';
import { PromptEngineService } from '../server/src/services/promptEngine';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, masterName = 'Beauty Master' } = req.body;
    if (!image) return res.status(400).json({ error: 'Image is required' });

    const geminiService = new GeminiService();
    
    // Clean base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const prompt = PromptEngineService.getHumanizedVisionPrompt(masterName);
    const result = await geminiService.analyzeImage(prompt, buffer, 'image/jpeg');
    
    let jsonResult;
    try {
      const sanitized = result.replace(/```json\n?|```/g, "").trim();
      jsonResult = JSON.parse(sanitized);
    } catch (e) {
      jsonResult = { instagram: result, facebook: result, whatsapp: result };
    }

    res.status(200).json(jsonResult);
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
