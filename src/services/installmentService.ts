import { supabase } from './supabaseClient';
import {
  InstallmentEligibility,
  InstallmentPlan,
  InstallmentPayment,
  InstallmentPlanWithPayments,
  CreateInstallmentPlanResponse
} from './types';

/**
 * Installment Service
 *
 * Manages installment payment plans for dues:
 * - Eligibility management (treasurer controls)
 * - Plan creation and tracking
 * - Payment schedule management
 */
export class InstallmentService {

  // ============================================================================
  // ELIGIBILITY MANAGEMENT (Treasurer Controls)
  // ============================================================================

  /**
   * Get installment eligibility for a specific member dues
   */
  static async getEligibility(memberDuesId: string): Promise<InstallmentEligibility | null> {
    try {
      const { data, error } = await supabase
        .from('installment_eligibility')
        .select('*')
        .eq('member_dues_id', memberDuesId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching installment eligibility:', error);
      return null;
    }
  }

  /**
   * Get all installment eligibilities for a chapter
   */
  static async getChapterEligibilities(chapterId: string): Promise<InstallmentEligibility[]> {
    try {
      const { data, error } = await supabase
        .from('installment_eligibility')
        .select('*')
        .eq('chapter_id', chapterId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching chapter eligibilities:', error);
      return [];
    }
  }

  /**
   * Set installment eligibility for a member dues (Treasurer action)
   */
  static async setEligibility(
    memberDuesId: string,
    chapterId: string,
    isEligible: boolean,
    allowedPlans: number[] = [2, 3],
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const eligibilityData = {
        member_dues_id: memberDuesId,
        chapter_id: chapterId,
        is_eligible: isEligible,
        allowed_plans: allowedPlans,
        enabled_by: isEligible ? user.id : null,
        enabled_at: isEligible ? new Date().toISOString() : null,
        notes: notes || null
      };

      const { error } = await supabase
        .from('installment_eligibility')
        .upsert(eligibilityData, { onConflict: 'member_dues_id' });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error setting installment eligibility:', error);
      return { success: false, error: 'Failed to update eligibility' };
    }
  }

  /**
   * Bulk set eligibility for multiple member dues
   */
  static async setBulkEligibility(
    memberDuesIds: string[],
    chapterId: string,
    isEligible: boolean,
    allowedPlans: number[] = [2, 3]
  ): Promise<{ success: boolean; updated: number; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, updated: 0, error: 'Not authenticated' };
      }

      const records = memberDuesIds.map(id => ({
        member_dues_id: id,
        chapter_id: chapterId,
        is_eligible: isEligible,
        allowed_plans: allowedPlans,
        enabled_by: isEligible ? user.id : null,
        enabled_at: isEligible ? new Date().toISOString() : null
      }));

      const { error } = await supabase
        .from('installment_eligibility')
        .upsert(records, { onConflict: 'member_dues_id' });

      if (error) throw error;
      return { success: true, updated: memberDuesIds.length };
    } catch (error) {
      console.error('Error setting bulk eligibility:', error);
      return { success: false, updated: 0, error: 'Failed to update eligibility' };
    }
  }

  // ============================================================================
  // PLAN MANAGEMENT
  // ============================================================================

  /**
   * Get active installment plan for a member dues
   */
  static async getActivePlan(memberDuesId: string): Promise<InstallmentPlan | null> {
    try {
      const { data, error } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('member_dues_id', memberDuesId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching active plan:', error);
      return null;
    }
  }

  /**
   * Get installment plan with all payments
   */
  static async getPlanWithPayments(planId: string): Promise<InstallmentPlanWithPayments | null> {
    try {
      const { data: plan, error: planError } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) {
        if (planError.code === 'PGRST116') return null;
        throw planError;
      }

      const { data: payments, error: paymentsError } = await supabase
        .from('installment_payments')
        .select('*')
        .eq('installment_plan_id', planId)
        .order('installment_number', { ascending: true });

      if (paymentsError) throw paymentsError;

      return {
        ...plan,
        payments: payments || []
      };
    } catch (error) {
      console.error('Error fetching plan with payments:', error);
      return null;
    }
  }

  /**
   * Get all plans for a member
   */
  static async getMemberPlans(memberId: string): Promise<InstallmentPlan[]> {
    try {
      const { data, error } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching member plans:', error);
      return [];
    }
  }

  /**
   * Get all active plans for a chapter (Treasurer view)
   */
  static async getChapterActivePlans(chapterId: string): Promise<InstallmentPlanWithPayments[]> {
    try {
      const { data: plans, error: plansError } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('status', 'active')
        .order('next_payment_date', { ascending: true });

      if (plansError) throw plansError;
      if (!plans || plans.length === 0) return [];

      // Get all payments for these plans
      const planIds = plans.map(p => p.id);
      const { data: payments, error: paymentsError } = await supabase
        .from('installment_payments')
        .select('*')
        .in('installment_plan_id', planIds)
        .order('installment_number', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Group payments by plan
      const paymentsByPlan = (payments || []).reduce((acc, payment) => {
        if (!acc[payment.installment_plan_id]) {
          acc[payment.installment_plan_id] = [];
        }
        acc[payment.installment_plan_id].push(payment);
        return acc;
      }, {} as Record<string, InstallmentPayment[]>);

      return plans.map(plan => ({
        ...plan,
        payments: paymentsByPlan[plan.id] || []
      }));
    } catch (error) {
      console.error('Error fetching chapter active plans:', error);
      return [];
    }
  }

  /**
   * Create a new installment plan
   * This calls the edge function which handles Stripe integration
   */
  static async createPlan(
    memberDuesId: string,
    numInstallments: number,
    stripePaymentMethodId: string
  ): Promise<CreateInstallmentPlanResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-installment-plan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            member_dues_id: memberDuesId,
            num_installments: numInstallments,
            stripe_payment_method_id: stripePaymentMethodId
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create plan' };
      }

      return data;
    } catch (error) {
      console.error('Error creating installment plan:', error);
      return { success: false, error: 'Failed to create installment plan' };
    }
  }

  /**
   * Cancel an installment plan (Treasurer action)
   * Only plans with unpaid installments can be cancelled
   */
  static async cancelPlan(
    planId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First check if plan can be cancelled
      const { data: plan, error: fetchError } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (fetchError) throw fetchError;

      if (plan.status !== 'active') {
        return { success: false, error: 'Only active plans can be cancelled' };
      }

      // Update plan status
      const { error: updateError } = await supabase
        .from('installment_plans')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (updateError) throw updateError;

      // Cancel all pending installment payments
      const { error: paymentsError } = await supabase
        .from('installment_payments')
        .update({ status: 'cancelled' })
        .eq('installment_plan_id', planId)
        .in('status', ['scheduled', 'failed']);

      if (paymentsError) throw paymentsError;

      return { success: true };
    } catch (error) {
      console.error('Error cancelling plan:', error);
      return { success: false, error: 'Failed to cancel plan' };
    }
  }

  // ============================================================================
  // PAYMENT QUERIES
  // ============================================================================

  /**
   * Get payment schedule for a plan
   */
  static async getPaymentSchedule(planId: string): Promise<InstallmentPayment[]> {
    try {
      const { data, error } = await supabase
        .from('installment_payments')
        .select('*')
        .eq('installment_plan_id', planId)
        .order('installment_number', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payment schedule:', error);
      return [];
    }
  }

  /**
   * Get upcoming scheduled payments for a chapter (for cron monitoring)
   */
  static async getUpcomingPayments(
    chapterId: string,
    daysAhead: number = 7
  ): Promise<InstallmentPayment[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('installment_payments')
        .select(`
          *,
          installment_plans!inner(chapter_id, member_id, status)
        `)
        .eq('installment_plans.chapter_id', chapterId)
        .eq('installment_plans.status', 'active')
        .eq('status', 'scheduled')
        .lte('scheduled_date', futureDate.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching upcoming payments:', error);
      return [];
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if a member dues has an active installment plan
   */
  static async hasActivePlan(memberDuesId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('installment_plans')
        .select('id', { count: 'exact', head: true })
        .eq('member_dues_id', memberDuesId)
        .eq('status', 'active');

      if (error) throw error;
      return (count || 0) > 0;
    } catch (error) {
      console.error('Error checking active plan:', error);
      return false;
    }
  }

  /**
   * Calculate installment amounts for a given total
   */
  static calculateInstallments(
    totalAmount: number,
    numInstallments: number
  ): { amounts: number[]; baseAmount: number } {
    const baseAmount = Math.floor((totalAmount / numInstallments) * 100) / 100;
    const remainder = Math.round((totalAmount - (baseAmount * numInstallments)) * 100) / 100;

    const amounts = Array(numInstallments).fill(baseAmount);
    amounts[0] = Math.round((amounts[0] + remainder) * 100) / 100;

    return { amounts, baseAmount };
  }

  /**
   * Generate payment schedule dates (30 days apart)
   */
  static generateScheduleDates(
    startDate: Date,
    numInstallments: number
  ): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < numInstallments; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (i * 30));
      dates.push(date);
    }
    return dates;
  }
}
