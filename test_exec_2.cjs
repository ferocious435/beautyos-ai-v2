const cp = require('child_process');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const skillScript = path.join(process.cwd(), 'skills', 'ai-studio-image', 'scripts', 'generate.py');
const command = `python "${skillScript}" --prompt "test" --model gemini-pro-image --force-paid --json`;

console.log("Running:", command);

try {
  const result = cp.execSync(command, {
    env: { ...process.env, GEMINI_API_KEY: apiKey },
    encoding: 'utf-8'
  });
  console.log("OUTPUT:", result);
} catch (e) {
  console.error("Test failed with code:", e.status);
  console.error("Stdout:", e.stdout?.toString());
  console.error("Stderr:", e.stderr?.toString());
}
