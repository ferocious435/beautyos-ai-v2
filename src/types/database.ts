/**
 * Core Database Types for BeautyOS AI v2
 * Standardized interfaces for Supabase entities
 */

export type UserRole = 'admin' | 'master' | 'client';

export interface UserProfile {
  id: string;
  telegram_id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  created_at: string;
}

export interface Master {
  id: string;
  telegram_id: string;
  full_name: string;
  specialties?: string[];
}

export interface Client {
  id: string;
  telegram_id: string;
  full_name: string;
  phone?: string;
}

export interface Booking {
  id: string;
  client_id: string;
  master_id: string;
  service_id?: string;
  start_time: string;
  status: 'pending' | 'confirmed' | 'cancelled_by_master' | 'cancelled_by_client' | 'completed';
  created_at: string;
  // Joined fields
  client?: Client;
  master?: Master;
}

export interface PortfolioImage {
  id: string;
  user_id: string;
  image_url: string;
  prompt?: string;
  category?: string;
  created_at: string;
}
