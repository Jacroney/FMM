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
  SavedPaymentMethod,
} from './types';

export class PaymentService {
  // ============================================================================
  // AUTHENTICATION HELPER
  // ============================================================================

  /**
   * Get a valid session, refreshing if necessary
   * @private
   */
  private static async getValidSession() {
    // Get current session and check if it's expired or about to expire
    let { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No active session found. Please log in again.');
    }

    // Check if token is already expired or expiring within 5 minutes
    const tokenExpiresAt = session.expires_at * 1000;
    const now = Date.now();
    const fiveMinutesFromNow = now + (5 * 60 * 1000);

    // If token is expired or expiring soon, refresh it
    if (tokenExpiresAt < fiveMinutesFromNow) {
      const { data, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        throw new Error('Your session has expired. Please log out and log back in.');
      }

      if (!data.session) {
        throw new Error('Unable to refresh session. Please log out and log back in.');
      }

      // Validate the refreshed token is valid
      const refreshedTokenExpiresAt = data.session.expires_at * 1000;
      if (refreshedTokenExpiresAt < Date.now()) {
        throw new Error('Session refresh failed. Please log out and log back in.');
      }

      session = data.session;
    }

    // Validate user is authenticated using the current (possibly refreshed) session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      throw new Error('Authentication validation failed. Please log in again.');
    }

    if (!user) {
      throw new Error('Not authenticated. Please log in again.');
    }

    return session;
  }

  // ============================================================================
  // STRIPE CONNECT MANAGEMENT (Treasurer)
  // ============================================================================

  /**
   * Create a new Stripe Connected Account for the chapter
   * Returns the onboarding URL to redirect treasurer to Stripe
   */
  static async createStripeAccount(chapterId: string): Promise<StripeConnectResponse> {
    try {
      const session = await this.getValidSession();

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
      const session = await this.getValidSession();

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
      const session = await this.getValidSession();

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
      const session = await this.getValidSession();

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
   *
   * @param memberDuesId - The dues record to pay
   * @param paymentMethodType - Type of payment method (card or us_bank_account)
   * @param paymentAmount - Optional amount to pay (defaults to full balance)
   * @param savePaymentMethod - Whether to save the payment method for future use
   * @param paymentMethodId - Optional saved payment method ID to use
   */
  static async createPaymentIntent(
    memberDuesId: string,
    paymentMethodType: 'us_bank_account' | 'card',
    paymentAmount?: number,
    savePaymentMethod?: boolean,
    paymentMethodId?: string
  ): Promise<CreatePaymentIntentResponse> {
    try {
      const session = await this.getValidSession();

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
            save_payment_method: savePaymentMethod,
            payment_method_id: paymentMethodId,
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
   * Get pending or processing payment intent for a specific dues record
   * Used to prevent duplicate payments (especially for ACH which takes 3-5 days)
   */
  static async getPendingPaymentForDues(memberDuesId: string): Promise<PaymentIntent | null> {
    try {
      const { data, error } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('member_dues_id', memberDuesId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching pending payment for dues:', error);
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
  // SAVED PAYMENT METHODS
  // ============================================================================

  /**
   * Get saved payment methods for the current user
   */
  static async getSavedPaymentMethods(userId: string): Promise<SavedPaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('saved_payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching saved payment methods:', error);
      throw error;
    }
  }

  /**
   * Set a payment method as default
   */
  static async setDefaultPaymentMethod(paymentMethodId: string, userId: string): Promise<void> {
    try {
      // First, unset all other defaults for this user
      await supabase
        .from('saved_payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set this one as default
      const { error } = await supabase
        .from('saved_payment_methods')
        .update({ is_default: true })
        .eq('stripe_payment_method_id', paymentMethodId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
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

  // Fee constants (must match edge function)
  private static readonly STRIPE_CARD_PERCENTAGE = 0.029;      // 2.9%
  private static readonly STRIPE_CARD_FIXED = 0.30;            // $0.30
  private static readonly STRIPE_ACH_PERCENTAGE = 0.008;       // 0.8%
  private static readonly STRIPE_ACH_CAP = 5.00;               // $5.00 cap
  private static readonly PLATFORM_FEE_PERCENTAGE = 0.01;      // 1%

  /**
   * Calculate Stripe processing fee using reverse calculation
   * This ensures chapter receives the exact dues amount after Stripe takes fees
   */
  static calculateStripeFee(amount: number, paymentMethodType: 'us_bank_account' | 'card'): number {
    if (paymentMethodType === 'card') {
      // Card: Reverse calculate - chargeAmount = (dues + fixed) / (1 - percentage)
      const chargeAmount = (amount + this.STRIPE_CARD_FIXED) / (1 - this.STRIPE_CARD_PERCENTAGE);
      return Math.ceil((chargeAmount - amount) * 100) / 100;
    } else {
      // ACH: 0.8% capped at $5
      const uncappedChargeAmount = amount / (1 - this.STRIPE_ACH_PERCENTAGE);
      const uncappedFee = uncappedChargeAmount - amount;

      if (uncappedFee <= this.STRIPE_ACH_CAP) {
        return Math.ceil(uncappedFee * 100) / 100;
      } else {
        return this.STRIPE_ACH_CAP;
      }
    }
  }

  /**
   * Calculate platform fee (0.5% of dues)
   */
  static calculatePlatformFee(amount: number): number {
    return Math.round(amount * this.PLATFORM_FEE_PERCENTAGE * 100) / 100;
  }

  /**
   * Calculate total amount member will be charged
   * ACH: Member pays just dues (no fees)
   * Card: Member pays dues + Stripe processing fee (no platform fee passed to member)
   */
  static calculateTotalCharge(amount: number, paymentMethodType: 'us_bank_account' | 'card'): number {
    if (paymentMethodType === 'us_bank_account') {
      // ACH: Member pays just the dues amount - no fees!
      return amount;
    } else {
      // Card: Member pays dues + Stripe fees
      const stripeFee = this.calculateStripeFee(amount, paymentMethodType);
      return Math.round((amount + stripeFee) * 100) / 100;
    }
  }

  /**
   * Calculate what the chapter will receive after fees
   * ACH: Chapter receives dues - ACH fee - platform fee (1%)
   * Card: Chapter receives dues - platform fee (1%)
   */
  static calculateChapterReceives(amount: number, paymentMethodType: 'us_bank_account' | 'card'): number {
    const platformFee = this.calculatePlatformFee(amount);
    if (paymentMethodType === 'us_bank_account') {
      const achFee = this.calculateStripeFee(amount, paymentMethodType);
      return Math.round((amount - achFee - platformFee) * 100) / 100;
    } else {
      return Math.round((amount - platformFee) * 100) / 100;
    }
  }

  /**
   * @deprecated Use calculateStripeFee() instead
   */
  static calculateTransactionFee(amount: number, paymentMethodType: 'us_bank_account' | 'card'): number {
    return this.calculateStripeFee(amount, paymentMethodType);
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
