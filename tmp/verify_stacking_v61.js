import { createCanvas } from '@napi-rs/canvas';

async function testStackingV61() {
    const rawOverlays = [
        { type: 'TITLE', text: 'מניקור ג׳ל מושלם' },
        { type: 'PRICE', text: '₪150 בלבד' },
        { type: 'PROMO', text: 'מבצע קיץ: 20% הנחה' },
        { type: 'LOGO', text: 'BeautyOS' }
    ];

    // --- LOGIC FROM render-worker.ts (v65.1) ---
    const groupedMap = new Map();
    rawOverlays.forEach((line) => {
      if (groupedMap.has(line.type)) groupedMap.get(line.type).text += '\n' + line.text;
      else groupedMap.set(line.type, { ...line });
    });

    const usedPositions = [];
    const overlays = Array.from(groupedMap.values()).map((line) => {
      let x = (line.type === 'PRICE' ? 0.9 : (line.type === 'LOGO' ? 0.05 : 0.5));
      let y;
      let align = (line.type === 'PRICE' ? 'right' : (line.type === 'LOGO' ? 'left' : 'center'));

      if (line.type === 'TITLE') y = 0.12;
      else if (line.type === 'PRICE') y = 0.18;
      else if (line.type === 'PROMO') y = 0.82;
      else if (line.type === 'LOGO') { y = 0.94; x = 0.05; align = 'left'; }
      else y = 0.88;

      const step = 0.12; 
      const thresholdY = 0.10;
      let attempts = 0;
      while (usedPositions.some(p => Math.abs(p.y - y) < thresholdY && Math.abs(p.x - x) < 0.4) && attempts < 5) {
        if (y < 0.4) y -= step; 
        else y += step;
        attempts++;
      }
      y = Math.max(0.06, Math.min(0.94, y));
      usedPositions.push({ x, y, h: step });
      return { ...line, xPosition: x, yPosition: y, textAlign: align };
    });

    console.log('[QA] Stacking v61 Logic Verification:');
    overlays.forEach(o => {
        console.log(`- ${o.type.padEnd(8)}: Y=${o.yPosition.toFixed(3)}, X=${o.xPosition.toFixed(3)}, Align=${o.textAlign}`);
    });
    
    // Check for collisions
    let collision = false;
    for (let i = 0; i < overlays.length; i++) {
        for (let j = i + 1; j < overlays.length; j++) {
            const o1 = overlays[i];
            const o2 = overlays[j];
            const distY = Math.abs(o1.yPosition - o2.yPosition);
            const distX = Math.abs(o1.xPosition - o2.xPosition);
            
            if (distY < 0.08 && distX < 0.3) {
                console.error(`[QA] COLLISION DETECTED between ${o1.type} and ${o2.type}! DistY: ${distY.toFixed(3)}`);
                collision = true;
            }
        }
    }

    if (!collision) {
        console.log('✅ [QA] SUCCESS: Stacking v61 logic is valid and collision-free.');
    } else {
        process.exit(1);
    }
}

testStackingV61().catch(console.error);
