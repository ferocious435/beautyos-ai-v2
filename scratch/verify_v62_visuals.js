
import { generateSocialPost } from '../api/_lib/graphic-engine.js';
import fs from 'fs';
import path from 'path';

import { createCanvas } from '@napi-rs/canvas';

async function testVisuals() {
  const dummyCanvas = createCanvas(1080, 1080);
  const dctx = dummyCanvas.getContext('2d');
  dctx.fillStyle = '#222222';
  dctx.fillRect(0, 0, 1080, 1080);
  const dummyBuffer = dummyCanvas.toBuffer('image/jpeg');
  
  console.log('🧪 Testing Hebrew Font & Emojis...');
  
  // VERSION 1: With Manual BiDi (Current)
  const result1 = await generateSocialPost(dummyBuffer, {
    format: 'INSTAGRAM_POST',
    businessName: 'Beauty Expert ✨',
    overlay: [
      { type: 'TITLE', text: 'מבצע מיוחד! 💅' },
      { type: 'PRICE', text: 'רק 150₪' },
      { type: 'PROMO', text: 'עד סוף השבוע ⏱️' }
    ],
    style: {
      preset: 'GLASSMorphism',
      primaryColor: '#FFFFFF',
      secondaryColor: '#B8860B',
      shadowOpacity: 0.7,
      boxOpacity: 0.3
    }
  });
  fs.writeFileSync('scratch/test_v62_manual_bidi.jpg', result1);

  // VERSION 2: Native Rendering (We'll mock getVisualBidiText to return original)
  // To do this properly, we'd need to edit the source, but for a quick test, 
  // we'll just see if the current one has any obvious issues.
}

testVisuals().catch(console.error);
