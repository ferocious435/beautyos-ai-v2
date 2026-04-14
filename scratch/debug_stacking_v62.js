
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

async function testCollision() {
  const targetWidth = 1080;
  const targetHeight = 1080;
  
  // Simulation of current logic
  const usedPositions = [];
  const lines = [
    { type: 'TITLE', y: 0.12, text: 'Title Line 1\nTitle Line 2' },
    { type: 'PRICE', y: 0.22, text: '123 ח"ש' },
    { type: 'PROMO', y: 0.82, text: 'Promo stuff' },
    { type: 'LOGO', y: 0.94, text: 'Beauty Expert' }
  ];

  console.log('--- Stacking v61 (Current) ---');
  lines.forEach(line => {
    let x = 0.5;
    let y = line.y;
    const thresholdY = 0.10;
    let attempts = 0;
    while (usedPositions.some(p => Math.abs(p.y - y) < thresholdY) && attempts < 5) {
      y += 0.12;
      attempts++;
    }
    usedPositions.push({ y });
    console.log(`Type: ${line.type}, Resolved Y: ${y.toFixed(3)}`);
  });

  console.log('\n--- Stacking v62 (Proposed: Box-Aware) ---');
  const usedBoxes = [];
  const margin = 0.05; // 5% safe margin
  
  lines.forEach(line => {
    let x = 0.5;
    let y = line.y;
    
    // Estimate height (normalized 0..1)
    const lineCount = line.text.split('\n').length;
    const fontSize = line.type === 'TITLE' ? 0.06 : 0.04; 
    const blockHeight = lineCount * fontSize * 1.3;
    
    let resolvedY = y;
    let attempts = 0;
    
    const isColliding = (newY, newH) => {
      return usedBoxes.some(b => {
        const top1 = newY - newH/2;
        const bot1 = newY + newH/2;
        const top2 = b.y - b.h/2;
        const bot2 = b.y + b.h/2;
        return (top1 < bot2 + margin && bot1 > top2 - margin);
      });
    };

    while (isColliding(resolvedY, blockHeight) && attempts < 10) {
      if (resolvedY < 0.4) resolvedY += 0.05;
      else resolvedY -= 0.05;
      attempts++;
    }
    
    usedBoxes.push({ y: resolvedY, h: blockHeight });
    console.log(`Type: ${line.type}, Resolved Y: ${resolvedY.toFixed(3)}, Height: ${blockHeight.toFixed(3)}`);
  });
}

testCollision();
