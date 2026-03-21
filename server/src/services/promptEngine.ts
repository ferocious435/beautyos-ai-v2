export class PromptEngineService {
  /**
   * Инъекция инструкций «гуманизации» в промпт для Gemini Vision.
   * Основано на техниках из Awesome Skills (ai-studio-image).
   */
  static getHumanizedVisionPrompt(masterName: string): string {
    const today = new Date().toLocaleDateString('he-IL');
    return `
Role: Senior Beauty Content Creator in Israel.
Task: Analyze this photo and write 3 variants of "Humanized" copy (Instagram, Facebook, WhatsApp) in HEBREW (RTL).
Master Name: ${masterName}
Current Date: ${today}

### RULES FOR HUMANIZATION:
1. NO AI-cliches: "masterpiece", "transformed", "unique".
2. Write as if the master is sharing their joy with clients.
3. Use Israeli vibes: Warm, direct, professional but friendly.
4. Mention Israeli context: If today is near holidays (like Pesah, Sukkot, etc.), mention them naturally.
5. Analyze details: Nail shape, eyelash curve, skin glow. Be specific!

### RESPONSE FORMAT (STRICT JSON):
{
  "instagram": "Creative post with emojis & hashtags.",
  "facebook": "Professional/Trust-building post.",
  "whatsapp": "Short status update.",
  "short_overlay": "Super short catchy phrase (2-4 words) in Hebrew for the image itself."
}
    `.trim();
  }
}
