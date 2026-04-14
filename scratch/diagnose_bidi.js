
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';

async function diagnose() {
  const fontsToRegister = [
    { name: 'Assistant', file: 'Assistant-Bold.ttf' },
    { name: 'Playfair Display', file: 'PlayfairDisplay-Bold.ttf' },
    { name: 'Noto Color Emoji', file: 'NotoColorEmoji.ttf' }
  ];

  const fontsDir = path.join(process.cwd(), 'api', '_assets', 'fonts');
  for (const font of fontsToRegister) {
    GlobalFonts.registerFromPath(path.join(fontsDir, font.file), font.name);
  }

  const canvas = createCanvas(1080, 500);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, 1080, 500);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';

  // Test 1: Native LTR (Wrong order for Hebrew)
  ctx.font = 'bold 60px Assistant';
  ctx.fillText('מבצע מיוחד! 💅', 540, 100);

  // Test 2: Native RTL
  ctx.direction = 'rtl';
  ctx.fillText('מבצע מיוחד! 💅', 540, 200);

  // Test 3: Visual Order (Manual Reverse)
  ctx.direction = 'ltr';
  const visual = '💅 !דחוימ עבצמ';
  ctx.fillText(visual, 540, 300);

  fs.writeFileSync('scratch/diagnose_bidi.jpg', canvas.toBuffer('image/jpeg'));
  console.log('✅ Diagnostics saved to scratch/diagnose_bidi.jpg');
}

diagnose().catch(console.error);
