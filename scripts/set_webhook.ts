import axios from 'axios';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env') });
config({ path: join(process.cwd(), 'server', '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;
const url = 'https://beautyos-ai-v2.vercel.app/api/bot';

async function setWebhook() {
    if (!token) {
        console.error('TOKEN MISSING');
        return;
    }
    try {
        const response = await axios.get(`https://api.telegram.org/bot${token}/setWebhook?url=${url}&drop_pending_updates=true`);
        console.log('Webhook Set Result:', response.data);
    } catch (e: any) {
        console.error('Error setting webhook:', e.response?.data || e.message);
    }
}

setWebhook();
