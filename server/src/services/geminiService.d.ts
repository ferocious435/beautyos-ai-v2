export declare class GeminiService {
    private genAI;
    private textModel;
    private visionModel;
    constructor();
    /**
     * Generates a response based on a text prompt
     * @param prompt The prompt to send to the model
     * @param systemInstruction Optional system instruction
     */
    generateText(prompt: string, systemInstruction?: string): Promise<string>;
    /**
     * Generates a response based on text and an image
     * @param prompt The text prompt
     * @param imageBuffer The image buffer
     * @param mimeType The image mime type
     */
    analyzeImage(prompt: string, imageBuffer: Buffer, mimeType: string): Promise<string>;
}
export declare const geminiService: GeminiService;
//# sourceMappingURL=geminiService.d.ts.map