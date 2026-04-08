const usedPositions = [];
const overlays = [
    { type: 'PRICE', text: '100', yPosition: 0.88, xPosition: 0.5 },
    { type: 'LOGO', text: 'Logo', yPosition: 0.88, xPosition: 0.5 },
    { type: 'PROMO', text: 'Sale', yPosition: 0.88, xPosition: 0.5 }
];

const results = overlays.map((line) => {
    let x = line.xPosition || 0.5;
    let y = line.yPosition || 0.88;
    let attempts = 0;
    const step = 0.08;
    
    while (usedPositions.some(p => Math.abs(p.y - y) < 0.06 && Math.abs(p.x - x) < 0.3) && attempts < 5) {
        console.log(`[Verify] Collision for ${line.type} at y=${y.toFixed(3)}, moving up...`);
        y -= step;
        attempts++;
    }
    
    usedPositions.push({ x, y, height: step });
    return { type: line.type, y: y };
});

console.log('--- Verification Results ---');
results.forEach(r => console.log(`${r.type}: y=${r.y.toFixed(3)}`));

const yValues = results.map(r => r.y.toFixed(3));
if (new Set(yValues).size === results.length) {
    console.log('✅ SUCCESS: All overlays have unique Y positions.');
} else {
    console.log('❌ FAILURE: Overlaps detected!');
    process.exit(1);
}
