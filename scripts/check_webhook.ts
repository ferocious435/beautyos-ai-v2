import axios from 'axios';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env') });
config({ path: join(process.cwd(), 'server', '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;

async function checkWebhook() {
    if (!token) {
        console.error('TOKEN MISSING');
        return;
    }
    try {
        const response = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        console.log('Webhook Status:', JSON.stringify(response.data, null, 2));
    } catch (e: any) {
        console.error('Error getting webhook info:', e.response?.data || e.message);
    }
}

checkWebhook();
