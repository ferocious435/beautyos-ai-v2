import { VercelRequest, VercelResponse } from '@vercel/node';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, studioName, address } = req.body;
    if (!image) throw new Error('No image provided');

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key missing');

    const studio = studioName || "סטודיו ליופי";
    const contact = address || "להזמנת תור ופרטים נוספים";

    const tempDir = tmpdir();
    const ts = Date.now();
    const inputPath = join(tempDir, `enhance_in_${ts}.png`);
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    writeFileSync(inputPath, Buffer.from(base64Data, 'base64'));

    const projectRoot = process.cwd();
    const skillScript = join(projectRoot, 'skills', 'ai-studio-image', 'scripts', 'generate.py');
    const overlayScript = join(projectRoot, 'skills', 'ai-studio-image', 'scripts', 'overlay.py');

    // PROFESSIONAL LUXURY BEAUTY PROMPT (English for best Gemini performance)
    const proPrompt = `
      Professional high-end beauty retouched photograph. 
      CRITICAL: Keep the actual work (nails/makeup/hair) EXACTLY as in the original. 
      Focus on LUXURY enhancement:
      - Crystal clear sharpness on the main subjects.
      - Soft professional studio lighting with elegant shadows.
      - Clean, uniform, and minimal aesthetic background.
      - Vibrant but natural skin tones, removing distractions without plastic look.
      - Editorial fashion magazine quality.
      - High contrast, deep blacks, and brilliant highlights.
      - Ensure the output is a polished masterpiece ready for high-end promotion.
    `.trim().replace(/"/g, "'").replace(/\n/g, ' ');

    const formats = [
      { name: 'square', arg: 'square' },        // 1:1
      { name: 'portrait', arg: 'portrait-45' }, // 4:5
      { name: 'story', arg: 'stories' }         // 9:16
    ];

    const results: string[] = [];

    for (const fmt of formats) {
      try {
        const genCommand = [
          `python "${skillScript}"`,
          `--prompt "${proPrompt}"`,
          `--reference-images "${inputPath}"`,
          `--model gemini-pro-image`, 
          `--format ${fmt.arg}`,
          '--skip-humanization', // DO NOT add smartphone noise
          '--force-paid',
          '--json'
        ].join(' ');

        const genRes = execSync(genCommand, { 
          env: { ...process.env, GEMINI_API_KEY: apiKey },
          encoding: 'utf-8' 
        });

        const parsed = JSON.parse(genRes);
        if (parsed.generated && parsed.generated.length > 0) {
          const aiImagePath = parsed.generated[0];
          const finalOutputPath = join(tempDir, `final_${fmt.name}_${ts}.jpg`);

          // Text Overlay
          const overlayCommand = `python "${overlayScript}" "${aiImagePath}" "${studio}" "${contact}" "${finalOutputPath}"`;
          execSync(overlayCommand, { encoding: 'utf-8' });

          const finalBuffer = readFileSync(finalOutputPath);
          results.push(`data:image/jpeg;base64,${finalBuffer.toString('base64')}`);
        }
      } catch (err) {
        console.error(`Error processing format ${fmt.name}:`, err);
      }
    }

    if (results.length === 0) throw new Error('Failed to generate any enhanced images');

    return res.status(200).json({
      enhancedImages: results, 
      ai_report: "בוצע שحזור Nano-Banana פרו: 3 פורמטים יוקרתיים מוכנים לפרסום.",
    });

  } catch (error: any) {
    console.error('Enhance Error:', error);
    return res.status(500).json({ error: error.message || 'Enhancement failed' });
  }
}
