import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontsDir = path.join(__dirname, '../api/_assets/fonts');

const assets = [
  {
    name: 'NotoColorEmoji.ttf',
    url: 'https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf'
  },
  {
    name: 'PlayfairDisplay-Bold.ttf',
    // Using the variable font version as it's the current official one
    url: 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf'
  }
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      // Handle redirects (301, 302)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Server returned status code ${response.statusCode} for ${url}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function setup() {
  console.log('📦 Setting up build assets...');
  
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
    console.log(`  Created directory: ${fontsDir}`);
  }

  for (const asset of assets) {
    const dest = path.join(fontsDir, asset.name);
    // Check if file exists AND is larger than 0 bytes
    const exists = fs.existsSync(dest) && fs.statSync(dest).size > 0;
    
    if (!exists) {
      console.log(`  Downloading ${asset.name}...`);
      try {
        await downloadFile(asset.url, dest);
        console.log(`  ✅ Downloaded ${asset.name}`);
      } catch (err) {
        console.error(`  ❌ Failed to download ${asset.name}:`, err.message);
      }
    } else {
      console.log(`  ✔️ ${asset.name} already exists.`);
    }
  }
}

setup();
