import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;

  constructor() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not defined in .env file");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Using gemini-1.5-pro for better text generation
    this.textModel = this.genAI.getGenerativeModel(
      { model: "gemini-1.5-pro" }
    );
    
    this.visionModel = this.genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" }
    );
  }

  /**
   * Generates a response based on a text prompt
   * @param prompt The prompt to send to the model
   * @param systemInstruction Optional system instruction
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      // Игнорируем systemInstruction в конфигурации модели, чтобы избежать ошибки API,
      // вместо этого добавляем его к промпту, если он передан
      const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
      
      const model = this.genAI.getGenerativeModel(
        { model: "gemini-1.5-pro" }
      );

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini Text Generation Error:", error);
      throw error;
    }
  }

  /**
   * Generates a response based on text and an image
   * @param prompt The text prompt
   * @param imageBuffer The image buffer
   * @param mimeType The image mime type
   */
  async analyzeImage(prompt: string, imageBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: mimeType
          }
        }
      ]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
