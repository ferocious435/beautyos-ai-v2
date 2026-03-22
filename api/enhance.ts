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

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API Key missing');

    // 1. Save input image to temp file
    const tempDir = tmpdir();
    const inputPath = join(tempDir, `enhance_in_${Date.now()}.png`);
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    writeFileSync(inputPath, Buffer.from(base64Data, 'base64'));

    // 2. Prepare the Skill Command using the USER'S PROFESSIONAL PROMPT
    const skillScript = "C:\\Users\\SergeyRaihshtat\\Desktop\\sergey\\BeautyOS AI v2\\skills\\ai-studio-image\\scripts\\generate.py";
    
    // Exact prompt from the user for professional result
    const hebrewPrompt = `
ערוך את התמונה המצורפת והפוך אותה לתמונת פרסום מקצועית לאינסטגרם עבור עסק בתחום הציפורניים.

מטרת העריכה:
לשפר משמעותית את איכות התמונה בלי לשנות את מבנה הידיים, צורת הציפורניים או מראה העבודה בפועל. לשמור על מראה ריאליסטי, נקי, יוקרתי ומסחרי.

הנחיות מדויקות:
- שפר חדות בצורה מקצועית ועדינה, עם דגש על פרטי הציפורניים, הברק, קווי הפרנץ' ומרקם העור.
- בצע ניקוי רעשים, שיפור רזולוציה והבהרת פרטים קטנים בלי ליצור מראה מלאכותי.
- תקן צבעים ואיזון לבן כך שגוון העור ייראה טבעי, נקי ומחמיא, והוורוד/לבן של הציפורניים ייראה מדויק, רך ויוקרתי.
- שפר תאורה וצללים: תאורה רכה, מחמיאה ואחידה, עם עומק עדין וצללים נקיים שמדגישים את העבודה.
- נקה את הרקע והפוך אותו לאסתטי, אחיד ומקצועי, מתאים לפרסומת באינסטגרם. אם צריך, לרכך או לטשטש את הרקע בעדינות כדי למקד את תשומת הלב בציפורניים.
- שמור על מראה נקי של עור הידיים, אך בלי אפקט פלסטיק ובלי החלקת יתר.
- הדגש את הברק והגימור של המניקור בצורה יוקרתית ועדינה.
- שמור על פרופורציות אמיתיות לחלוטין, ללא שינוי בזווית הידיים וללא שינוי בצורה המקורית של הציפורניים.
- תן לתמונה תחושה של צילום ביוטי מקצועי לסטודיו/קוסמטיקה/מניקור.

התאמה לפרסום באינסטגרם:
- התאם את הקומפוזיציה לפורמט אינסטגרם אנכי 4:5.
- בצע קרופ חכם שממקם את הידיים במרכז בצורה מאוזנת ויוקרתית.
- ודא שהתמונה נראית מושכת, חדה ויוקרתית גם בתצוגת מובייל.
- הפלט צריך להיראות כמו מודעת פרסום מקצועית מוכנה לפוסט ממומן או פוסט עסקי באינסטגרם.

שלילה:
בלי לשנות את עיצוב הציפורניים, בלי להמציא פרטים חדשים, בלי פילטרים מוגזמים, בלי מראה קרטוני, בלי oversmooth, בלי HDR מוגזם, בלי צבעי עור לא טבעיים, בלי טקסט על התמונה.
    `.trim().replace(/"/g, "'").replace(/\n/g, ' ');

    const command = [
      `python "${skillScript}"`,
      `--prompt "${hebrewPrompt}"`,
      `--reference-images "${inputPath}"`,
      '--model gemini-pro-image', // Gemini 3 Pro Image (Nano Banana)
      '--mode influencer',
      '--format portrait', // 4:5 as requested
      '--humanization polished', // Professional but real
      '--force-paid', // Pro Image has a cost but it's what's requested
      '--json'
    ].join(' ');

    // 3. Execute the Skill
    console.log('Executing Nano-Banana Reconstruction...');
    const resultJson = execSync(command, { 
      env: { ...process.env, GEMINI_API_KEY: apiKey },
      encoding: 'utf-8' 
    });

    const parsedResult = JSON.parse(resultJson);
    if (!parsedResult.generated || parsedResult.generated.length === 0) {
      throw new Error('AI failed to reconstruct the image');
    }
    
    const generatedPath = parsedResult.generated[0];

    // 4. Read and return the High-End result
    const enhancedBuffer = readFileSync(generatedPath);
    const enhancedBase64 = `data:image/png;base64,${enhancedBuffer.toString('base64')}`;

    return res.status(200).json({
      enhancedImage: enhancedBase64,
      ai_report: "בוצע שחזור Nano-Banana מלא: חדות קריסטלית, ניקוי רקע ותאורת סטודיו יוקרתית.",
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
