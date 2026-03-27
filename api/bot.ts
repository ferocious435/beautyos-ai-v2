export default function handler(req: any, res: any) {
  res.status(200).json({ 
    message: 'BeautyOS API is ALIVE', 
    timestamp: new Date().toISOString(),
    env_check: !!process.env.TELEGRAM_BOT_TOKEN
  });
}
