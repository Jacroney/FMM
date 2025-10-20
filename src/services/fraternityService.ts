import { supabase } from './supabaseClient';
import { Fraternity } from './types';

export class FraternityService {
  /**
   * Get all fraternities
   */
  static async getAllFraternities(): Promise<Fraternity[]> {
    try {
      const { data, error } = await supabase
        .from('fraternities')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching fraternities:', error);
      return [];
    }
  }

  /**
   * Get fraternity by ID
   */
  static async getFraternityById(id: string): Promise<Fraternity | null> {
    try {
      const { data, error } = await supabase
        .from('fraternities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching fraternity:', error);
      return null;
    }
  }

  /**
   * Create a new fraternity
   */
  static async createFraternity(fraternity: Omit<Fraternity, 'id' | 'created_at' | 'updated_at'>): Promise<Fraternity> {
    try {
      const { data, error } = await supabase
        .from('fraternities')
        .insert([fraternity])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating fraternity:', error);
      throw error;
    }
  }

  /**
   * Update fraternity branding
   */
  static async updateFraternity(id: string, updates: Partial<Fraternity>): Promise<Fraternity> {
    try {
      const { data, error } = await supabase
        .from('fraternities')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating fraternity:', error);
      throw error;
    }
  }

  /**
   * Delete a fraternity
   */
  static async deleteFraternity(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('fraternities')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting fraternity:', error);
      throw error;
    }
  }
}
