import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from './supabase.js';
import { CONFIG } from './config.js';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface BeautyTrend {
  visualAnchors: string;
  semanticAnchors: string;
  hiddenDeficits: string;
  postTemplate: string;
  mediaProductionPrompt: string;
}

/**
 * Weekly Trend Analyzer (Stateless)
 * Analyzes the beauty market using Gemini and stores results in Supabase.
 */
export async function runWeeklyAnalysis(): Promise<BeautyTrend> {
  const model = genAI.getGenerativeModel({ model: CONFIG.MODELS.MARKET_TRENDS });
  const prompt = CONFIG.PROMPTS.TREND_ANALYSIS_MARKET;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, '').trim();
  const trend: BeautyTrend = JSON.parse(text);

  // Save to Supabase (table market_trends must exist)
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from('market_trends').insert([{
      ...trend,
      type: 'weekly_global',
      created_at: new Date().toISOString()
    }]);
  }

  return trend;
}

export async function getLatestTrends(): Promise<BeautyTrend | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('market_trends')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as BeautyTrend;
}
