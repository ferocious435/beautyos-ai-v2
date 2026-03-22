import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();
export class GeminiService {
    genAI;
    textModel;
    visionModel;
    constructor() {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_GEMINI_API_KEY is not defined in .env file");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-1.5-flash for faster responses and lower latency
        this.textModel = this.genAI.getGenerativeModel({ model: "gemini-3.1-pro", generationConfig: { responseMimeType: "application/json" } }, { apiVersion: 'v1' });
        this.visionModel = this.genAI.getGenerativeModel({ model: "gemini-3.1-flash" }, { apiVersion: 'v1' });
    }
    /**
     * Generates a response based on a text prompt
     * @param prompt The prompt to send to the model
     * @param systemInstruction Optional system instruction
     */
    async generateText(prompt, systemInstruction) {
        try {
            const model = systemInstruction
                ? this.genAI.getGenerativeModel({
                    model: "gemini-3.1-pro",
                    systemInstruction: systemInstruction,
                    generationConfig: { responseMimeType: "application/json" }
                }, { apiVersion: 'v1' })
                : this.textModel;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
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
    async analyzeImage(prompt, imageBuffer, mimeType) {
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
        }
        catch (error) {
            console.error("Gemini Vision Error:", error);
            throw error;
        }
    }
}
export const geminiService = new GeminiService();
//# sourceMappingURL=geminiService.js.map