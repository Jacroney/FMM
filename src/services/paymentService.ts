/**
 * Payment Service
 *
 * Handles all Stripe payment operations for dues collection.
 * Wraps calls to Edge Functions for Stripe Connect and payment processing.
 */

import { supabase } from './supabaseClient';
import {
  StripeConnectedAccount,
  PaymentIntent,
  DuesPaymentOnline,
  StripeConnectResponse,
  CreatePaymentIntentResponse,
  PaymentSummary,
} from './types';

export class PaymentService {
  // ============================================================================
  // STRIPE CONNECT MANAGEMENT (Treasurer)
  // ============================================================================

  /**
   * Create a new Stripe Connected Account for the chapter
   * Returns the onboarding URL to redirect treasurer to Stripe
   */
  static async createStripeAccount(chapterId: string): Promise<StripeConnectResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create_account',
            chapter_id: chapterId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create Stripe account');
      }

      const data: StripeConnectResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating Stripe account:', error);
      throw error;
    }
  }

  /**
   * Create a new account link for existing Stripe account
   * Used if onboarding was not completed or link expired
   */
  static async createAccountLink(chapterId: string): Promise<StripeConnectResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create_account_link',
            chapter_id: chapterId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create account link');
      }

      const data: StripeConnectResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating account link:', error);
      throw error;
    }
  }

  /**
   * Check Stripe account onboarding status
   */
  static async checkStripeAccountStatus(chapterId: string): Promise<StripeConnectResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'check_status',
            chapter_id: chapterId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check account status');
      }

      const data: StripeConnectResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking Stripe account status:', error);
      throw error;
    }
  }

  /**
   * Refresh Stripe account data from Stripe API
   */
  static async refreshStripeAccount(chapterId: string): Promise<StripeConnectResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'refresh_account',
            chapter_id: chapterId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh account');
      }

      const data: StripeConnectResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error refreshing Stripe account:', error);
      throw error;
    }
  }

  /**
   * Get Stripe Connected Account info from database
   */
  static async getStripeAccount(chapterId: string): Promise<StripeConnectedAccount | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_connected_accounts')
        .select('*')
        .eq('chapter_id', chapterId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching Stripe account:', error);
      throw error;
    }
  }

  // ============================================================================
  // PAYMENT PROCESSING (Members)
  // ============================================================================

  /**
   * Create a payment intent for a member to pay their dues
   * Returns the client secret needed for Stripe Elements
   */
  static async createPaymentIntent(
    memberDuesId: string,
    paymentMethodType: 'us_bank_account' | 'card',
    paymentAmount?: number
  ): Promise<CreatePaymentIntentResponse> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            member_dues_id: memberDuesId,
            payment_method_type: paymentMethodType,
            payment_amount: paymentAmount,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment intent');
      }

      const data: CreatePaymentIntentResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Get payment intent by ID
   */
  static async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null> {
    try {
      const { data, error } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('id', paymentIntentId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching payment intent:', error);
      throw error;
    }
  }

  /**
   * Get payment intents for a member
   */
  static async getMemberPaymentIntents(
    memberId: string,
    limit: number = 10
  ): Promise<PaymentIntent[]> {
    try {
      const { data, error } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching member payment intents:', error);
      throw error;
    }
  }

  /**
   * Get payment intents for a chapter
   */
  static async getChapterPaymentIntents(
    chapterId: string,
    status?: string,
    limit: number = 50
  ): Promise<PaymentIntent[]> {
    try {
      let query = supabase
        .from('payment_intents')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching chapter payment intents:', error);
      throw error;
    }
  }

  // ============================================================================
  // PAYMENT HISTORY
  // ============================================================================

  /**
   * Get payment history for a member
   */
  static async getMemberPayments(memberId: string): Promise<DuesPaymentOnline[]> {
    try {
      const { data, error } = await supabase
        .from('dues_payments')
        .select('*')
        .eq('member_id', memberId)
        .order('payment_date', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching member payments:', error);
      throw error;
    }
  }

  /**
   * Get payment history for a chapter
   */
  static async getChapterPayments(
    chapterId: string,
    limit: number = 100
  ): Promise<DuesPaymentOnline[]> {
    try {
      const { data, error } = await supabase
        .from('dues_payments')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('payment_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching chapter payments:', error);
      throw error;
    }
  }

  /**
   * Get payment summary for a chapter
   */
  static async getChapterPaymentSummary(
    chapterId: string,
    periodName?: string
  ): Promise<PaymentSummary | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_chapter_payment_summary', {
          p_chapter_id: chapterId,
          p_period_name: periodName || null,
        })
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Format payment method for display
   */
  static formatPaymentMethod(method: string, last4?: string): string {
    const methodMap: Record<string, string> = {
      stripe_ach: 'Bank Account',
      stripe_card: 'Card',
      cash: 'Cash',
      check: 'Check',
      venmo: 'Venmo',
      zelle: 'Zelle',
      other: 'Other',
    };

    const formatted = methodMap[method] || method;

    if (last4) {
      return `${formatted} ****${last4}`;
    }

    return formatted;
  }

  /**
   * Calculate transaction fee for display
   */
  static calculateTransactionFee(amount: number, paymentMethodType: 'us_bank_account' | 'card'): number {
    if (paymentMethodType === 'us_bank_account') {
      // ACH fee is flat $0.80
      return 0.80;
    } else {
      // Card fee is 2.9% + $0.30
      return amount * 0.029 + 0.30;
    }
  }

  /**
   * Calculate total amount member will be charged (including fees)
   */
  static calculateTotalCharge(amount: number, paymentMethodType: 'us_bank_account' | 'card'): number {
    const fee = this.calculateTransactionFee(amount, paymentMethodType);
    // Note: Fees are typically charged to the chapter, not the member
    // But this can be used to show the total if chapter wants to pass fees to members
    return amount; // Just return amount for now (chapter absorbs fees)
  }

  /**
   * Format payment status for display
   */
  static formatPaymentStatus(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: 'Pending', color: 'yellow' },
      processing: { text: 'Processing', color: 'blue' },
      succeeded: { text: 'Completed', color: 'green' },
      failed: { text: 'Failed', color: 'red' },
      canceled: { text: 'Canceled', color: 'gray' },
    };

    return statusMap[status] || { text: status, color: 'gray' };
  }
}
