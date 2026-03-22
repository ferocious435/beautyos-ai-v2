
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: "Generate a small test image of a red circle on white background. Return only the image." }] }
      ]
    });
    const response = await result.response;
    console.log("Candidate parts:", response.candidates[0].content.parts);
  } catch (e) {
    console.error("Test failed:", e);
  }
}

test();
