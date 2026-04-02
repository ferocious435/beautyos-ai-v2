import https from 'https';

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || "";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("--- AVAILABLE MODELS ---");
      json.models.forEach(m => console.log(`ID: ${m.name}, Display: ${m.displayName}`));
      console.log("------------------------");
    } catch (e) {
      console.error("JSON PARSE ERROR:", e.message);
      console.log("RAW DATA:", data);
    }
  });
}).on('error', (err) => {
  console.error("HTTP ERROR:", err.message);
});
