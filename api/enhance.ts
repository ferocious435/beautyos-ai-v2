import { VercelRequest, VercelResponse } from '@vercel/node';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image } = req.body;
    if (!image) throw new Error('No image provided');

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key missing');

    // 1. Save input image to temp file
    const tempDir = tmpdir();
    const inputPath = join(tempDir, `enhance_in_${Date.now()}.png`);
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    writeFileSync(inputPath, Buffer.from(base64Data, 'base64'));

    // 2. Prepare the Skill Command
    const skillScript = "C:\\Users\\SergeyRaihshtat\\.gemini\\antigravity\\skills\\ai-studio-image\\scripts\\generate.py";
    const prompt = "High-end luxury beauty professional retouching. Ultra-sharp details on nails and skin. Perfect commercial lighting. Maintain the exact same composition and beauty work from the reference photo.";
    
    const command = [
      `python "${skillScript}"`,
      `--prompt "${prompt}"`,
      `--reference-images "${inputPath}"`,
      '--model gemini-pro-image',
      '--mode influencer',
      '--format square',
      '--force-paid',
      '--json'
    ].join(' ');

    // 3. Execute the Skill
    console.log('Executing AI Enhancement via Skill...');
    const resultJson = execSync(command, { 
      env: { ...process.env, GEMINI_API_KEY: apiKey },
      encoding: 'utf-8' 
    });

    const parsedResult = JSON.parse(resultJson);
    if (!parsedResult.generated || parsedResult.generated.length === 0) {
      throw new Error('AI generation failed to produce an image');
    }
    
    const generatedPath = parsedResult.generated[0];

    // 4. Read the enhanced image and return it
    const enhancedBuffer = readFileSync(generatedPath);
    const enhancedBase64 = `data:image/png;base64,${enhancedBuffer.toString('base64')}`;

    return res.status(200).json({
      enhancedImage: enhancedBase64,
      ai_report: "ננו-בננה שחזרה את התמונה ברמה מקצועית: שדרוג תאורה, חדות ומרקם עור יוקרתי.",
      brightness: 100,
      contrast: 100,
      saturate: 100,
      sharpen: 0,
      shadows: 0
    });

  } catch (error: any) {
    console.error('Enhance Error:', error);
    return res.status(500).json({ error: error.message || 'Enhancement failed' });
  }
}
