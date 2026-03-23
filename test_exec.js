const cp = require('child_process');
const dotenv = require('dotenv');
dotenv.config();

console.log("Node ENV GEMINI_API_KEY:", process.env.GEMINI_API_KEY || "Missing");
console.log("Node ENV GOOGLE_GEMINI_API_KEY:", process.env.GOOGLE_GEMINI_API_KEY || "Missing");

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'dummy_test_key';

try {
  const result = cp.execSync(`python -c "import os; print('Python ENV:', os.environ.get('GEMINI_API_KEY'))"`, {
    env: { ...process.env, GEMINI_API_KEY: apiKey },
    encoding: 'utf-8'
  });
  console.log("Python OUTPUT:", result);
} catch (e) {
  console.error("Test failed:", e.message);
}
