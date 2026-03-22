import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = 'AIzaSyBhPcPpRWcYNYD-N0VmewAEd8gTUXf8cYQ';
const genAI = new GoogleGenerativeAI(apiKey);

async function testModels() {
  console.log('--- STARTING COMPREHENSIVE API TEST ---');
  
  // Test gemini-1.5-flash
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const res = await model.generateContent("Say 'hello' in one word.");
    console.log("✅ gemini-1.5-flash SUCCESS:", res.response.text().trim());
  } catch (e) {
    console.error("❌ gemini-1.5-flash FAILED:", e.message);
  }

  // Test gemini-1.5-flash-latest
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const res = await model.generateContent("Say 'hello' in one word.");
    console.log("✅ gemini-1.5-flash-latest SUCCESS:", res.response.text().trim());
  } catch (e) {
    console.error("❌ gemini-1.5-flash-latest FAILED:", e.message);
  }

  // Try fetching the model list directly
  try {
    console.log("\n--- FETCHING AVAILABLE MODELS LIST ---");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      console.log(`Found ${data.models.length} models. Supported generative models:`);
      data.models.filter(m => m.supportedGenerationMethods?.includes("generateContent")).forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else {
      console.log("❌ Direct API Error Response:", data);
    }
  } catch(e) {
    console.error("❌ Failed fetching list:", e.message);
  }
}

testModels();
