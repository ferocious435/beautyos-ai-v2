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
    const contact = address || "הזמינו תור עכשיו";

    // 1. Save input image to temp file
    const tempDir = tmpdir();
    const ts = Date.now();
    const inputPath = join(tempDir, `enhance_in_${ts}.png`);
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    writeFileSync(inputPath, Buffer.from(base64Data, 'base64'));

    const projectRoot = process.cwd();
    const skillScript = join(projectRoot, 'skills', 'ai-studio-image', 'scripts', 'generate.py');
    const overlayScript = join(projectRoot, 'skills', 'ai-studio-image', 'scripts', 'overlay.py');

    // Universal Professional Hebrew Prompt
    const hebrewPrompt = `
      ערוך את התמונה המצורפת והפוך אותה לתמונה מקצועית ויוקרתית עבור עסק בתחום הביוטי (ציפורניים, שיער, גבות, איפור קבוע וכד').
      מטרת העריכה: לשפר חדות, תאורה וצבעים בלי לשנות את העבודה המקורית של האמנית. לשמור על מראה ריאליסטי ונקי.
      בצע ניקוי רעשים, שיפור רזולוציה ותיקון צבעים כך שגוון העור ייראה טבעי ומחמיא.
      התאם את התאורה שתהיה רכה ואחידה כמו בצילום סטודיו.
      שלילה: בלי פילטרים מוגזמים, בלי מראה מלאכותי, בלי להחליק את העור больше מדי, ובלי טקסט על התמונה עצמה.
    `.trim().replace(/"/g, "'").replace(/\n/g, ' ');

    const formats = [
      { name: 'square', arg: 'square' },        // 1:1
      { name: 'portrait', arg: 'portrait-45' }, // 4:5
      { name: 'story', arg: 'stories' }         // 9:16
    ];

    const results: string[] = [];

    console.log(`Starting generation for 3 formats...`);

    for (const fmt of formats) {
      try {
        // AI Generation
        const genCommand = [
          `python "${skillScript}"`,
          `--prompt "${hebrewPrompt}"`,
          `--reference-images "${inputPath}"`,
          `--model ${process.env.GEMINI_DEFAULT_MODEL || 'gemini-pro-image'}`, 
          `--format ${fmt.arg}`,
          '--mode influencer',
          '--humanization polished',
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

    if (results.length === 0) {
      throw new Error('Failed to generate any enhanced images');
    }

    return res.status(200).json({
      enhancedImages: results, 
      ai_report: "התמונות נוצרו בהצלחה ב-3 פורמטים עם נגיעה של יוקרה וטקסט מותאם אישית.",
    });

  } catch (error: any) {
    console.error('Enhance Error:', error);
    return res.status(500).json({ error: error.message || 'Enhancement failed' });
  }
}
