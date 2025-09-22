import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      chapters: {
        Row: {
          id: string;
          name: string;
          school: string;
          member_count: number;
          fraternity_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['chapters']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['chapters']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          chapter_id: string;
          date: string;
          amount: number;
          description: string;
          category: string;
          source: 'CHASE' | 'SWITCH' | 'MANUAL';
          status: 'PENDING' | 'COMPLETED' | 'FAILED';
          created_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      members: {
        Row: {
          id: string;
          chapter_id: string;
          name: string;
          email: string;
          status: 'Active' | 'Inactive' | 'Alumni';
          dues_paid: boolean;
          payment_date: string | null;
          semester: string;
          last_updated: string;
          created_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['members']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['members']['Insert']>;
      };
      budget_categories: {
        Row: {
          id: string;
          chapter_id: string;
          name: string;
          type: 'Fixed Costs' | 'Operational Costs' | 'Event Costs';
          description: string | null;
          is_active: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['budget_categories']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['budget_categories']['Insert']>;
      };
      budget_periods: {
        Row: {
          id: string;
          chapter_id: string;
          name: string;
          type: 'Quarter' | 'Semester' | 'Year';
          start_date: string;
          end_date: string;
          fiscal_year: number;
          is_current: boolean;
          created_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['budget_periods']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['budget_periods']['Insert']>;
      };
      budgets: {
        Row: {
          id: string;
          chapter_id: string;
          category_id: string;
          period_id: string;
          allocated: number;
          notes: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>;
      };
      expenses: {
        Row: {
          id: string;
          chapter_id: string;
          budget_id: string | null;
          category_id: string;
          period_id: string;
          amount: number;
          description: string;
          transaction_date: string;
          vendor: string | null;
          receipt_url: string | null;
          payment_method: 'Cash' | 'Check' | 'Credit Card' | 'ACH' | 'Venmo' | 'Other' | null;
          status: 'pending' | 'completed' | 'cancelled';
          created_by: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      budget_summary: {
        Row: {
          period: string;
          period_type: string;
          fiscal_year: number;
          start_date: string;
          category: string;
          category_type: string;
          allocated: number;
          spent: number;
          remaining: number;
          percent_used: number;
        };
      };
    };
  };
}