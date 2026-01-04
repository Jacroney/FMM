import { supabase } from './supabaseClient';
import {
  DuesConfiguration,
  MemberDues,
  DuesPayment,
  MemberDuesSummary,
  ChapterDuesStats
} from './types';

/**
 * Dues Service
 *
 * Comprehensive service for managing chapter dues including:
 * - Configuration management (rates by year, late fees)
 * - Individual dues assignment
 * - Payment tracking
 * - Automated dues assignment
 * - Late fee application
 * - Reporting and statistics
 */
export class DuesService {

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  /**
   * Get all dues configurations for a chapter
   */
  static async getConfigurations(chapterId: string): Promise<DuesConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('dues_configuration')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('fiscal_year', { ascending: false })
        .order('period_start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching dues configurations:', error);
      return [];
    }
  }

  /**
   * Get current dues configuration for a chapter
   */
  static async getCurrentConfiguration(chapterId: string): Promise<DuesConfiguration | null> {
    try {
      const { data, error } = await supabase
        .from('dues_configuration')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_current', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching current configuration:', error);
      return null;
    }
  }

  /**
   * Create a new dues configuration
   */
  static async createConfiguration(
    config: Omit<DuesConfiguration, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DuesConfiguration> {
    try {
      const { data, error } = await supabase
        .from('dues_configuration')
        .insert(config)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating dues configuration:', error);
      throw error;
    }
  }

  /**
   * Update a dues configuration
   */
  static async updateConfiguration(
    id: string,
    updates: Partial<DuesConfiguration>
  ): Promise<DuesConfiguration> {
    try {
      const { data, error } = await supabase
        .from('dues_configuration')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating dues configuration:', error);
      throw error;
    }
  }

  /**
   * Delete a dues configuration
   */
  static async deleteConfiguration(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('dues_configuration')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting dues configuration:', error);
      throw error;
    }
  }

  // ============================================================================
  // MEMBER DUES MANAGEMENT
  // ============================================================================

  /**
   * Get all member dues for a chapter
   */
  static async getMemberDues(
    chapterId: string,
    configId?: string
  ): Promise<MemberDuesSummary[]> {
    try {
      let query = supabase
        .from('member_dues_summary')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('member_name');

      if (configId) {
        query = query.eq('config_id', configId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching member dues:', error);
      return [];
    }
  }

  /**
   * Get member dues summary by email (for member dashboard)
   */
  static async getMemberDuesSummaryByEmail(
    email: string
  ): Promise<MemberDuesSummary[]> {
    try {
      const { data, error } = await supabase
        .from('member_dues_summary')
        .select('*')
        .eq('member_email', email)
        .gt('balance', 0)
        .order('fiscal_year', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching member dues summary by email:', error);
      return [];
    }
  }

  /**
   * Get dues for a specific member
   */
  static async getMemberDuesByMember(
    memberId: string,
    configId?: string
  ): Promise<MemberDues[]> {
    try {
      let query = supabase
        .from('member_dues')
        .select('*')
        .eq('member_id', memberId)
        .order('assigned_date', { ascending: false });

      if (configId) {
        query = query.eq('config_id', configId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching member dues:', error);
      return [];
    }
  }

  /**
   * Create or update member dues assignment
   * If member already has dues for this config, the new amount is ADDED to the existing balance
   */
  static async assignDuesToMember(
    chapterId: string,
    memberId: string,
    configId: string,
    baseAmount: number,
    dueDate?: string,
    notes?: string
  ): Promise<MemberDues> {
    try {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('member_dues')
        .select('id, base_amount, late_fee, adjustments, amount_paid')
        .eq('member_id', memberId)
        .eq('config_id', configId)
        .single();

      if (existing) {
        // Add to existing dues balance
        const newBaseAmount = (existing.base_amount || 0) + baseAmount;
        const lateFee = existing.late_fee || 0;
        const adjustments = existing.adjustments || 0;
        const newTotalAmount = newBaseAmount + lateFee + adjustments;
        const newBalance = newTotalAmount - (existing.amount_paid || 0);

        // Determine new status based on balance
        let newStatus: string;
        if (newBalance <= 0) {
          newStatus = 'paid';
        } else if ((existing.amount_paid || 0) > 0) {
          newStatus = 'partial';
        } else {
          newStatus = 'pending';
        }

        const { data, error } = await supabase
          .from('member_dues')
          .update({
            base_amount: newBaseAmount,
            total_amount: newTotalAmount,
            balance: newBalance,
            status: newStatus,
            due_date: dueDate || null,
            notes: notes ? `${existing.notes || ''}\n${notes}`.trim() : existing.notes
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('member_dues')
          .insert({
            chapter_id: chapterId,
            member_id: memberId,
            config_id: configId,
            base_amount: baseAmount,
            total_amount: baseAmount,
            balance: baseAmount,
            amount_paid: 0,
            due_date: dueDate || null,
            notes: notes || null,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error assigning dues to member:', error);
      throw error;
    }
  }

  /**
   * Update member dues (for adjustments, manual changes, etc.)
   */
  static async updateMemberDues(
    id: string,
    updates: Partial<MemberDues>
  ): Promise<MemberDues> {
    try {
      const { data, error } = await supabase
        .from('member_dues')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating member dues:', error);
      throw error;
    }
  }

  /**
   * Delete member dues assignment
   */
  static async deleteMemberDues(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('member_dues')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting member dues:', error);
      throw error;
    }
  }

  // ============================================================================
  // AUTOMATED DUES ASSIGNMENT
  // ============================================================================

  /**
   * Automatically assign dues to all active members in a chapter
   * based on the configuration
   */
  static async assignDuesToChapter(
    chapterId: string,
    configId: string
  ): Promise<{ success: boolean; assigned: number; skipped: number; errors: string[] }> {
    try {
      const { data, error } = await supabase.rpc('assign_dues_to_chapter', {
        p_chapter_id: chapterId,
        p_config_id: configId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error auto-assigning dues:', error);
      throw error;
    }
  }

  /**
   * Apply late fees to overdue members
   */
  static async applyLateFees(
    chapterId: string,
    configId: string
  ): Promise<{ success: boolean; applied: number }> {
    try {
      const { data, error } = await supabase.rpc('apply_late_fees', {
        p_chapter_id: chapterId,
        p_config_id: configId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error applying late fees:', error);
      throw error;
    }
  }

  /**
   * Preview custom late fee application
   * Returns list of members who would be affected by the late fee
   */
  static async previewCustomLateFee(
    chapterId: string,
    targetBalances?: number[],
    excludePartial: boolean = true
  ): Promise<{ id: string; email: string; member_name: string; current_balance: number; status: string }[]> {
    try {
      const { data, error } = await supabase.rpc('preview_custom_late_fee', {
        p_chapter_id: chapterId,
        p_target_balances: targetBalances || null,
        p_exclude_partial: excludePartial
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error previewing custom late fee:', error);
      throw error;
    }
  }

  /**
   * Apply custom late fee to members matching criteria
   */
  static async applyCustomLateFee(
    chapterId: string,
    lateFeeAmount: number,
    targetBalances?: number[],
    excludePartial: boolean = true
  ): Promise<{ success: boolean; applied: number }> {
    try {
      const { data, error } = await supabase.rpc('apply_custom_late_fee', {
        p_chapter_id: chapterId,
        p_late_fee_amount: lateFeeAmount,
        p_target_balances: targetBalances || null,
        p_exclude_partial: excludePartial
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error applying custom late fee:', error);
      throw error;
    }
  }

  // ============================================================================
  // PAYMENT MANAGEMENT
  // ============================================================================

  /**
   * Get all payments for a member's dues
   */
  static async getPayments(memberDuesId: string): Promise<DuesPayment[]> {
    try {
      const { data, error } = await supabase
        .from('dues_payments')
        .select('*')
        .eq('member_dues_id', memberDuesId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  }

  /**
   * Record a payment for dues
   */
  static async recordPayment(
    memberDuesId: string,
    amount: number,
    paymentMethod?: string,
    paymentDate?: string,
    referenceNumber?: string,
    notes?: string,
    recordedBy?: string
  ): Promise<{ success: boolean; payment_id?: string; new_balance?: number; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('record_dues_payment', {
        p_member_dues_id: memberDuesId,
        p_amount: amount,
        p_payment_method: paymentMethod || null,
        p_payment_date: paymentDate || new Date().toISOString().split('T')[0],
        p_reference_number: referenceNumber || null,
        p_notes: notes || null,
        p_recorded_by: recordedBy || null
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Delete a payment (and update member_dues accordingly)
   */
  static async deletePayment(paymentId: string): Promise<void> {
    try {
      // Get payment details first
      const { data: payment, error: fetchError } = await supabase
        .from('dues_payments')
        .select('member_dues_id, amount')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete payment
      const { error: deleteError } = await supabase
        .from('dues_payments')
        .delete()
        .eq('id', paymentId);

      if (deleteError) throw deleteError;

      // Update member_dues to reduce amount_paid
      await supabase
        .from('member_dues')
        .update({
          amount_paid: supabase.raw(`amount_paid - ${payment.amount}`)
        })
        .eq('id', payment.member_dues_id);

    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }

  // ============================================================================
  // STATISTICS & REPORTING
  // ============================================================================

  /**
   * Get dues statistics for a chapter
   */
  static async getChapterStats(
    chapterId: string,
    periodName?: string
  ): Promise<ChapterDuesStats | null> {
    try {
      let query = supabase
        .from('chapter_dues_stats')
        .select('*')
        .eq('chapter_id', chapterId);

      if (periodName) {
        query = query.eq('period_name', periodName);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching chapter stats:', error);
      return null;
    }
  }

  /**
   * Get overdue members
   */
  static async getOverdueMembers(chapterId: string): Promise<MemberDuesSummary[]> {
    try {
      const { data, error } = await supabase
        .from('member_dues_summary')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_overdue', true)
        .gt('balance', 0)
        .order('days_overdue', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching overdue members:', error);
      return [];
    }
  }

  /**
   * Export dues data to CSV
   */
  static exportToCSV(duesSummary: MemberDuesSummary[]): string {
    const headers = [
      'Name',
      'Email',
      'Year',
      'Status',
      'Period',
      'Base Amount',
      'Late Fee',
      'Adjustments',
      'Total Amount',
      'Amount Paid',
      'Balance',
      'Due Date',
      'Paid Date',
      'Payment Status',
      'Days Overdue'
    ];

    const rows = duesSummary.map(dues => [
      dues.member_name,
      dues.member_email,
      dues.member_year || '',
      dues.member_status,
      dues.period_name,
      dues.base_amount.toFixed(2),
      dues.late_fee.toFixed(2),
      dues.adjustments.toFixed(2),
      dues.total_amount.toFixed(2),
      dues.amount_paid.toFixed(2),
      dues.balance.toFixed(2),
      dues.due_date || '',
      dues.paid_date || '',
      dues.status,
      dues.is_overdue ? dues.days_overdue.toString() : '0'
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell =>
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(','))
    ].join('\n');
  }
}
