import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const isConfigured = supabaseUrl && supabaseUrl.startsWith('http');

if (!isConfigured) {
  console.warn('⚠️ SUPABASE_URL не задан или неверный (должен начинаться с http). Работа в демо-режиме.');
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
