export class PromptEngineService {
  /**
   * Инъекция инструкций «гуманизации» в промпт для Gemini Vision.
   * Основано на техниках из Awesome Skills (ai-studio-image).
   */
  static getHumanizedVisionPrompt(masterName: string): string {
    const today = new Date().toLocaleDateString('he-IL');
    return `
Role: Senior Premium Beauty Content Creator in Israel.
Task: Analyze this photo and write 4 variants of copy (Instagram, Facebook, WhatsApp, Image Overlay) in HEBREW (RTL).

### STYLE REFERENCES (Premium Salon):
- Focus on macro details: extreme cleanliness of cuticles, perfect light reflection (glare) on nails, symmetry of eyelash extensions.
- Tone: High-end, exclusive, but welcoming. "Israeli Glamour".
- NO generic AI words. Use professional terms like "צורה מושלמת" (perfect shape), "ברק גבוה" (high shine), "דיוק" (precision).

### RESPONSE FORMAT (STRICT JSON):
{
  "instagram": "Creative post with hooks, emojis & hashtags. Focus on the vibe.",
  "facebook": "Professional/Trust-building post. Focus on quality and master's experience.",
  "whatsapp": "Short status update with Call to Action.",
  "short_overlay": "Catchy 2-4 word hook for the image (e.g., 'מותק של מניקור', 'מושלם בדיוק עבורך')."
}
    `.trim();
  }
}
