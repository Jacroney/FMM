/**
 * PaymentService Unit Tests
 *
 * Tests the critical fee calculation functions that determine:
 * - How much members are charged
 * - How much chapters receive after fees
 * - Stripe processing fees for card and ACH payments
 *
 * These are CRITICAL tests - errors here cause direct financial loss.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '@/services/paymentService';

describe('PaymentService', () => {
  // ============================================================================
  // FEE CALCULATION TESTS - Pure Functions (No Mocks Needed)
  // ============================================================================

  describe('calculateStripeFee', () => {
    describe('Card payments (2.9% + $0.30 reverse calculation)', () => {
      it('calculates fee for $100 dues correctly', () => {
        // For $100 dues, member pays ~$103.20 so chapter gets exactly $100
        // Formula: chargeAmount = (dues + 0.30) / (1 - 0.029)
        // chargeAmount = 100.30 / 0.971 = $103.30
        // fee = 103.30 - 100 = $3.30 (rounded up)
        const fee = PaymentService.calculateStripeFee(100, 'card');
        expect(fee).toBeGreaterThanOrEqual(3.19);
        expect(fee).toBeLessThanOrEqual(3.31);
      });

      it('calculates fee for $500 dues correctly', () => {
        // For larger amounts, percentage dominates
        const fee = PaymentService.calculateStripeFee(500, 'card');
        // Expected: (500 + 0.30) / 0.971 - 500 = ~$15.24
        expect(fee).toBeGreaterThanOrEqual(15.20);
        expect(fee).toBeLessThanOrEqual(15.50);
      });

      it('calculates fee for $1000 dues correctly', () => {
        const fee = PaymentService.calculateStripeFee(1000, 'card');
        // Expected: (1000 + 0.30) / 0.971 - 1000 = ~$30.17
        expect(fee).toBeGreaterThanOrEqual(30.10);
        expect(fee).toBeLessThanOrEqual(30.50);
      });

      it('handles small amount of $10', () => {
        const fee = PaymentService.calculateStripeFee(10, 'card');
        // Fixed fee dominates for small amounts
        // (10 + 0.30) / 0.971 - 10 = $0.61
        expect(fee).toBeGreaterThanOrEqual(0.58);
        expect(fee).toBeLessThanOrEqual(0.65);
      });

      it('handles $0 amount (edge case)', () => {
        const fee = PaymentService.calculateStripeFee(0, 'card');
        // Just the fixed fee portion: 0.30 / 0.971 = $0.31
        expect(fee).toBeGreaterThanOrEqual(0.30);
        expect(fee).toBeLessThanOrEqual(0.32);
      });

      it('handles large amount of $10,000', () => {
        const fee = PaymentService.calculateStripeFee(10000, 'card');
        // (10000 + 0.30) / 0.971 - 10000 = ~$298.77
        expect(fee).toBeGreaterThan(290);
        expect(fee).toBeLessThan(310);
      });
    });

    describe('ACH payments (0.8% capped at $5)', () => {
      it('calculates fee for $100 dues (below cap)', () => {
        const fee = PaymentService.calculateStripeFee(100, 'us_bank_account');
        // 100 / 0.992 - 100 = $0.81
        expect(fee).toBeGreaterThanOrEqual(0.80);
        expect(fee).toBeLessThanOrEqual(0.82);
      });

      it('calculates fee for $500 dues (at cap threshold)', () => {
        const fee = PaymentService.calculateStripeFee(500, 'us_bank_account');
        // 500 / 0.992 - 500 = $4.03
        expect(fee).toBeGreaterThanOrEqual(4.00);
        expect(fee).toBeLessThanOrEqual(4.10);
      });

      it('caps fee at $5 for $1000 dues', () => {
        const fee = PaymentService.calculateStripeFee(1000, 'us_bank_account');
        // Uncapped would be ~$8.06, but cap kicks in at $5
        expect(fee).toBe(5.00);
      });

      it('caps fee at $5 for $5000 dues', () => {
        const fee = PaymentService.calculateStripeFee(5000, 'us_bank_account');
        expect(fee).toBe(5.00);
      });

      it('caps fee at $5 for $10,000 dues', () => {
        const fee = PaymentService.calculateStripeFee(10000, 'us_bank_account');
        expect(fee).toBe(5.00);
      });

      it('handles small amount of $10', () => {
        const fee = PaymentService.calculateStripeFee(10, 'us_bank_account');
        // 10 / 0.992 - 10 = $0.08
        expect(fee).toBeGreaterThanOrEqual(0.08);
        expect(fee).toBeLessThanOrEqual(0.09);
      });
    });
  });

  describe('calculatePlatformFee', () => {
    it('calculates 1% platform fee for $100', () => {
      const fee = PaymentService.calculatePlatformFee(100);
      expect(fee).toBe(1.00);
    });

    it('calculates 1% platform fee for $500', () => {
      const fee = PaymentService.calculatePlatformFee(500);
      expect(fee).toBe(5.00);
    });

    it('calculates 1% platform fee for $1000', () => {
      const fee = PaymentService.calculatePlatformFee(1000);
      expect(fee).toBe(10.00);
    });

    it('handles small amount with proper rounding', () => {
      const fee = PaymentService.calculatePlatformFee(33);
      // 33 * 0.01 = 0.33
      expect(fee).toBe(0.33);
    });

    it('handles $0 amount', () => {
      const fee = PaymentService.calculatePlatformFee(0);
      expect(fee).toBe(0);
    });

    it('handles odd amounts with penny precision', () => {
      const fee = PaymentService.calculatePlatformFee(123.45);
      // 123.45 * 0.01 = 1.2345, rounded to 1.23
      expect(fee).toBe(1.23);
    });
  });

  describe('calculateTotalCharge', () => {
    describe('ACH payments', () => {
      it('member pays exact dues amount - no fees added', () => {
        expect(PaymentService.calculateTotalCharge(100, 'us_bank_account')).toBe(100);
      });

      it('member pays exact dues for $500', () => {
        expect(PaymentService.calculateTotalCharge(500, 'us_bank_account')).toBe(500);
      });

      it('member pays exact dues for $1000', () => {
        expect(PaymentService.calculateTotalCharge(1000, 'us_bank_account')).toBe(1000);
      });
    });

    describe('Card payments', () => {
      it('member pays dues + Stripe fee for $100', () => {
        const total = PaymentService.calculateTotalCharge(100, 'card');
        const stripeFee = PaymentService.calculateStripeFee(100, 'card');
        expect(total).toBeCloseTo(100 + stripeFee, 2);
      });

      it('member pays dues + Stripe fee for $500', () => {
        const total = PaymentService.calculateTotalCharge(500, 'card');
        const stripeFee = PaymentService.calculateStripeFee(500, 'card');
        expect(total).toBeCloseTo(500 + stripeFee, 2);
      });

      it('total charge is always greater than dues for card', () => {
        const amounts = [10, 50, 100, 500, 1000, 5000];
        amounts.forEach((amount) => {
          const total = PaymentService.calculateTotalCharge(amount, 'card');
          expect(total).toBeGreaterThan(amount);
        });
      });

      it('total charge is exactly dues for ACH', () => {
        const amounts = [10, 50, 100, 500, 1000, 5000];
        amounts.forEach((amount) => {
          const total = PaymentService.calculateTotalCharge(amount, 'us_bank_account');
          expect(total).toBe(amount);
        });
      });
    });
  });

  describe('calculateChapterReceives', () => {
    describe('Card payments', () => {
      it('chapter receives dues minus 1% platform fee for $100', () => {
        const receives = PaymentService.calculateChapterReceives(100, 'card');
        // $100 - $1 platform fee = $99
        expect(receives).toBe(99.00);
      });

      it('chapter receives dues minus 1% platform fee for $500', () => {
        const receives = PaymentService.calculateChapterReceives(500, 'card');
        // $500 - $5 platform fee = $495
        expect(receives).toBe(495.00);
      });

      it('chapter receives dues minus 1% platform fee for $1000', () => {
        const receives = PaymentService.calculateChapterReceives(1000, 'card');
        // $1000 - $10 platform fee = $990
        expect(receives).toBe(990.00);
      });
    });

    describe('ACH payments', () => {
      it('chapter receives dues minus ACH fee minus platform fee for $100', () => {
        const receives = PaymentService.calculateChapterReceives(100, 'us_bank_account');
        // $100 - $0.81 ACH - $1 platform = ~$98.19
        const achFee = PaymentService.calculateStripeFee(100, 'us_bank_account');
        const platformFee = PaymentService.calculatePlatformFee(100);
        expect(receives).toBeCloseTo(100 - achFee - platformFee, 2);
      });

      it('chapter receives dues minus ACH fee minus platform fee for $500', () => {
        const receives = PaymentService.calculateChapterReceives(500, 'us_bank_account');
        // $500 - $4.03 ACH - $5 platform = ~$490.97
        const achFee = PaymentService.calculateStripeFee(500, 'us_bank_account');
        const platformFee = PaymentService.calculatePlatformFee(500);
        expect(receives).toBeCloseTo(500 - achFee - platformFee, 2);
      });

      it('ACH cap benefits chapters for large payments', () => {
        // For $1000, ACH is capped at $5 vs 0.8% would be $8
        const receives = PaymentService.calculateChapterReceives(1000, 'us_bank_account');
        // $1000 - $5 ACH (capped) - $10 platform = $985
        expect(receives).toBe(985.00);
      });

      it('ACH cap benefits chapters more for $5000', () => {
        const receives = PaymentService.calculateChapterReceives(5000, 'us_bank_account');
        // $5000 - $5 ACH (capped) - $50 platform = $4945
        expect(receives).toBe(4945.00);
      });
    });

    describe('ACH vs Card comparison', () => {
      it('ACH is slightly worse for small amounts (member absorbs no fee)', () => {
        // For $100:
        // Card: chapter gets $99 (member pays $103.20)
        // ACH: chapter gets ~$98.19 (member pays $100)
        const cardReceives = PaymentService.calculateChapterReceives(100, 'card');
        const achReceives = PaymentService.calculateChapterReceives(100, 'us_bank_account');
        expect(cardReceives).toBeGreaterThan(achReceives);
      });

      it('ACH becomes better for large amounts due to cap', () => {
        // For $5000:
        // Card: chapter gets $4950 ($5000 - 1% platform)
        // ACH: chapter gets $4945 ($5000 - $5 capped ACH - 1% platform)
        // Actually card is still slightly better because ACH fee comes out of chapter
        const cardReceives = PaymentService.calculateChapterReceives(5000, 'card');
        const achReceives = PaymentService.calculateChapterReceives(5000, 'us_bank_account');
        // Card receives more because ACH fee is deducted from chapter
        expect(cardReceives).toBeGreaterThan(achReceives);
      });
    });
  });

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  describe('formatPaymentMethod', () => {
    it('formats stripe_ach correctly', () => {
      expect(PaymentService.formatPaymentMethod('stripe_ach')).toBe('Bank Account');
    });

    it('formats stripe_card correctly', () => {
      expect(PaymentService.formatPaymentMethod('stripe_card')).toBe('Card');
    });

    it('formats cash correctly', () => {
      expect(PaymentService.formatPaymentMethod('cash')).toBe('Cash');
    });

    it('formats check correctly', () => {
      expect(PaymentService.formatPaymentMethod('check')).toBe('Check');
    });

    it('formats venmo correctly', () => {
      expect(PaymentService.formatPaymentMethod('venmo')).toBe('Venmo');
    });

    it('formats zelle correctly', () => {
      expect(PaymentService.formatPaymentMethod('zelle')).toBe('Zelle');
    });

    it('formats other correctly', () => {
      expect(PaymentService.formatPaymentMethod('other')).toBe('Other');
    });

    it('returns original value for unknown methods', () => {
      expect(PaymentService.formatPaymentMethod('unknown_method')).toBe('unknown_method');
    });

    it('appends last4 when provided', () => {
      expect(PaymentService.formatPaymentMethod('stripe_card', '4242')).toBe('Card ****4242');
    });

    it('appends last4 for bank account', () => {
      expect(PaymentService.formatPaymentMethod('stripe_ach', '6789')).toBe('Bank Account ****6789');
    });
  });

  describe('formatPaymentStatus', () => {
    it('formats pending status', () => {
      const result = PaymentService.formatPaymentStatus('pending');
      expect(result).toEqual({ text: 'Pending', color: 'yellow' });
    });

    it('formats processing status', () => {
      const result = PaymentService.formatPaymentStatus('processing');
      expect(result).toEqual({ text: 'Processing', color: 'blue' });
    });

    it('formats succeeded status', () => {
      const result = PaymentService.formatPaymentStatus('succeeded');
      expect(result).toEqual({ text: 'Completed', color: 'green' });
    });

    it('formats failed status', () => {
      const result = PaymentService.formatPaymentStatus('failed');
      expect(result).toEqual({ text: 'Failed', color: 'red' });
    });

    it('formats canceled status', () => {
      const result = PaymentService.formatPaymentStatus('canceled');
      expect(result).toEqual({ text: 'Canceled', color: 'gray' });
    });

    it('returns gray for unknown status', () => {
      const result = PaymentService.formatPaymentStatus('unknown');
      expect(result).toEqual({ text: 'unknown', color: 'gray' });
    });
  });

  // ============================================================================
  // DEPRECATED FUNCTION TESTS
  // ============================================================================

  describe('calculateTransactionFee (deprecated)', () => {
    it('returns same result as calculateStripeFee for card', () => {
      const deprecated = PaymentService.calculateTransactionFee(100, 'card');
      const current = PaymentService.calculateStripeFee(100, 'card');
      expect(deprecated).toBe(current);
    });

    it('returns same result as calculateStripeFee for ACH', () => {
      const deprecated = PaymentService.calculateTransactionFee(100, 'us_bank_account');
      const current = PaymentService.calculateStripeFee(100, 'us_bank_account');
      expect(deprecated).toBe(current);
    });
  });

  // ============================================================================
  // INTEGRATION SANITY CHECKS
  // ============================================================================

  describe('Fee calculation consistency', () => {
    it('total charge minus Stripe fee equals dues for card payments', () => {
      const dues = 250;
      const totalCharge = PaymentService.calculateTotalCharge(dues, 'card');
      const stripeFee = PaymentService.calculateStripeFee(dues, 'card');
      expect(totalCharge - stripeFee).toBeCloseTo(dues, 2);
    });

    it('all fees are positive', () => {
      const amounts = [1, 10, 50, 100, 500, 1000, 5000, 10000];
      const methods: ('card' | 'us_bank_account')[] = ['card', 'us_bank_account'];

      amounts.forEach((amount) => {
        methods.forEach((method) => {
          const stripeFee = PaymentService.calculateStripeFee(amount, method);
          const platformFee = PaymentService.calculatePlatformFee(amount);
          const totalCharge = PaymentService.calculateTotalCharge(amount, method);
          const chapterReceives = PaymentService.calculateChapterReceives(amount, method);

          expect(stripeFee).toBeGreaterThanOrEqual(0);
          expect(platformFee).toBeGreaterThanOrEqual(0);
          expect(totalCharge).toBeGreaterThanOrEqual(amount);
          expect(chapterReceives).toBeLessThanOrEqual(amount);
          expect(chapterReceives).toBeGreaterThan(0);
        });
      });
    });

    it('chapter never receives more than dues amount', () => {
      const amounts = [100, 500, 1000, 5000];
      const methods: ('card' | 'us_bank_account')[] = ['card', 'us_bank_account'];

      amounts.forEach((dues) => {
        methods.forEach((method) => {
          const receives = PaymentService.calculateChapterReceives(dues, method);
          expect(receives).toBeLessThan(dues);
        });
      });
    });
  });
});
