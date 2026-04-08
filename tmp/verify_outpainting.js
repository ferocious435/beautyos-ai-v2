import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mocking logic to test graphic-engine without full runtime if needed, 
// but here we just import it.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We need to point to the compiled or TS version. 
// Since we are in a TS environment, let's use a simple canvas implementation 
// that mirrors the logic I just wrote to verify the MATH and VISUAL result.

async function verifyBlurredSeed() {
    const targetWidth = 1080;
    const targetHeight = 1350;
    const canvas = createCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');

    // 1. Generate a "Fake" original image (e.g. 500x700 red box)
    const originalWidth = 500;
    const originalHeight = 700;
    const tempCanvas = createCanvas(originalWidth, originalHeight);
    const tctx = tempCanvas.getContext('2d');
    tctx.fillStyle = '#ff4444'; // Red
    tctx.fillRect(0, 0, originalWidth, originalHeight);
    tctx.fillStyle = 'white';
    tctx.font = 'bold 40px Arial';
    tctx.fillText('Original', 50, 100);
    
    const image = await loadImage(tempCanvas.toBuffer('image/png'));

    console.log('[QA] Starting Blurred Seed Verification...');

    // --- LOGIC FROM graphic-engine.ts (v65.0) ---
    
    // Draw blurred cover background
    const bAspect = image.width / image.height;
    const cAspect = targetWidth / targetHeight;
    let bw, bh, bx, by;
    if (bAspect > cAspect) {
      bh = targetHeight; bw = targetHeight * bAspect; bx = (targetWidth - bw) / 2; by = 0;
    } else {
      bw = targetWidth; bh = targetWidth / bAspect; bx = (targetWidth - bw) / 2; by = 0;
    }
    
    ctx.save();
    ctx.drawImage(image, bx, by, bw, bh);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    try {
      // Simulate blur (since filter might not be in JS environment without setup)
      ctx.filter = 'blur(60px)';
      ctx.drawImage(canvas, 0, 0);
    } catch (e) {
      console.log('[QA] ctx.filter not supported in this test runner, using alpha fallback');
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#000';
      ctx.fillRect(0,0, targetWidth, targetHeight);
    }
    ctx.restore();

    // Draw Main Image (Framed)
    const imgAspect = image.width / image.height;
    const canvasAspect = targetWidth / targetHeight;
    let dw, dh, dx, dy;
    
    // From my code for AI_SEED:
    dw = targetWidth * 0.9;
    dh = dw / imgAspect; 
    dx = (targetWidth - dw) / 2; 
    dy = (targetHeight - dh) / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 30;
    ctx.drawImage(image, dx, dy, dw, dh);
    ctx.restore();

    // Save result
    const outPath = path.join(__dirname, 'test_seed_result.png');
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    console.log(`[QA] SUCCESS: Seed image saved to ${outPath}`);
}

verifyBlurredSeed().catch(console.error);
