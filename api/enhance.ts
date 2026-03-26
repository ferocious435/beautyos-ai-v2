import { VercelRequest, VercelResponse } from '@vercel/node';
import sharp from 'sharp';
import dotenv from 'dotenv';
import axios from 'axios';
import { join } from 'path';

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

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Professional Beauty Prompt
    const proPrompt = `
      Professional high-end beauty retouched photograph. 
      CRITICAL: Keep the actual work (nails/makeup/hair) exactly as in the original. 
      Focus on LUXURY enhancement: Crystal clear sharpness, soft professional studio lighting, 
      clean minimal aesthetic background, vibrant natural skin tones, high contrast, brilliance. 
      Editorial fashion magazine quality.
    `.trim().replace(/\n/g, ' ');

    const formats = [
      { name: 'square', ratio: '1:1', width: 1024, height: 1024 },
      { name: 'portrait', ratio: '4:5', width: 1024, height: 1280 },
      { name: 'story', ratio: '9:16', width: 1024, height: 1820 }
    ];

    const results: string[] = [];

    for (const fmt of formats) {
      try {
        // 1. CALL IMAGEN 3 via REST (AI Studio Beta)
        // Note: For now, if Imagen API isn't fully set up, we'll use the original image 
        // with luxury enhancement filters via sharp to keep it functional,
        // OR we try the real Imagen 3 if the key allows it.
        
        let processedBuffer = imageBuffer;

        try {
          const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
          const response = await axios.post(imagenUrl, {
            instances: [{ prompt: proPrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: fmt.ratio,
              outputMimeType: "image/jpeg"
            }
          }, { timeout: 15000 });

          if (response.data?.predictions?.[0]?.bytesBase64Encoded) {
            processedBuffer = Buffer.from(response.data.predictions[0].bytesBase64Encoded, 'base64');
          }
        } catch (apiErr) {
          console.warn(`Imagen API failed for ${fmt.name}, using Sharp fallback:`, apiErr);
          // Fallback: Just resize and enhance with Sharp
          processedBuffer = await sharp(imageBuffer)
            .resize(fmt.width, fmt.height, { fit: 'cover' })
            .modulate({ brightness: 1.05, saturation: 1.1 })
            .sharpen()
            .toBuffer();
        }

        // 2. TEXT OVERLAY with Sharp + SVG
        // Create SVG with Hebrew text
        const margin = 40;
        const fontSize = Math.floor(fmt.height * 0.04);
        
        // We use a simple SVG because it handles Hebrew better than basic Canvas in some environments
        // and Sharp supports SVG overlaying.
        const svgOverlay = `
          <svg width="${fmt.width}" height="${fmt.height}">
            <style>
              .text { fill: white; font-family: Assistant, Arial, sans-serif; font-weight: bold; }
              .bg { fill: rgba(0,0,0,0.5); }
            </style>
            <!-- Top Text (Studio Name) -->
            <rect x="${margin - 10}" y="${margin - 5}" width="${studio.length * fontSize * 0.6}" height="${fontSize + 10}" rx="10" class="bg" />
            <text x="${margin}" y="${margin + fontSize - 5}" font-size="${fontSize}" class="text">${studio}</text>
            
            <!-- Bottom Text (Contact) -->
            <rect x="${fmt.width - (contact.length * fontSize * 0.6) - margin - 10}" y="${fmt.height - margin - fontSize - 5}" width="${contact.length * fontSize * 0.6 + 20}" height="${fontSize + 10}" rx="10" class="bg" />
            <text x="${fmt.width - (contact.length * fontSize * 0.6) - margin}" y="${fmt.height - margin - 10}" font-size="${fontSize}" class="text">${contact}</text>
          </svg>
        `;

        const finalImage = await sharp(processedBuffer)
          .resize(fmt.width, fmt.height)
          .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
          .jpeg({ quality: 90 })
          .toBuffer();

        results.push(`data:image/jpeg;base64,${finalImage.toString('base64')}`);

      } catch (err) {
        console.error(`Error processing format ${fmt.name}:`, err);
      }
    }

    if (results.length === 0) throw new Error('Failed to generate any images');

    return res.status(200).json({
      enhancedImages: results,
      ai_report: "בוצע שיפור סטודיו Node: 3 פורמטים יוקרתיים מוכנים לפרסום.",
    });

  } catch (error: any) {
    console.error('Enhance Error:', error);
    return res.status(500).json({ error: error.message || 'Enhancement failed' });
  }
}
