/**
 * InstallmentService Unit Tests
 *
 * Tests the critical calculation functions for installment payment plans:
 * - Amount splitting across installments
 * - Date scheduling for payment due dates
 *
 * These are CRITICAL tests - rounding errors in installment splitting
 * can compound across payments and cause incorrect totals.
 */

import { describe, it, expect } from 'vitest';
import { InstallmentService } from '@/services/installmentService';

describe('InstallmentService', () => {
  // ============================================================================
  // INSTALLMENT CALCULATION TESTS - Pure Functions (No Mocks Needed)
  // ============================================================================

  describe('calculateInstallments', () => {
    describe('even splits', () => {
      it('splits $500 into 2 equal payments', () => {
        const result = InstallmentService.calculateInstallments(500, 2);
        expect(result.amounts).toEqual([250, 250]);
        expect(result.baseAmount).toBe(250);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBe(500);
      });

      it('splits $600 into 3 equal payments', () => {
        const result = InstallmentService.calculateInstallments(600, 3);
        expect(result.amounts).toEqual([200, 200, 200]);
        expect(result.baseAmount).toBe(200);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBe(600);
      });

      it('splits $1000 into 4 equal payments', () => {
        const result = InstallmentService.calculateInstallments(1000, 4);
        expect(result.amounts).toEqual([250, 250, 250, 250]);
        expect(result.baseAmount).toBe(250);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBe(1000);
      });
    });

    describe('uneven splits with remainders', () => {
      it('handles $100 split 3 ways (remainder in first payment)', () => {
        const result = InstallmentService.calculateInstallments(100, 3);
        // $100 / 3 = $33.33 base, with $0.01 remainder
        expect(result.baseAmount).toBe(33.33);
        expect(result.amounts[0]).toBe(33.34); // First payment gets remainder
        expect(result.amounts[1]).toBe(33.33);
        expect(result.amounts[2]).toBe(33.33);
        // Total should be exactly $100
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
      });

      it('handles $500 split 3 ways', () => {
        const result = InstallmentService.calculateInstallments(500, 3);
        // $500 / 3 = $166.66 base, with $0.02 remainder
        expect(result.baseAmount).toBe(166.66);
        expect(result.amounts[0]).toBe(166.68); // First payment gets remainder
        expect(result.amounts[1]).toBe(166.66);
        expect(result.amounts[2]).toBe(166.66);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(500, 2);
      });

      it('handles $1 split 3 ways (edge case)', () => {
        const result = InstallmentService.calculateInstallments(1, 3);
        // $1 / 3 = $0.33 base, with $0.01 remainder
        expect(result.baseAmount).toBe(0.33);
        expect(result.amounts[0]).toBe(0.34);
        expect(result.amounts[1]).toBe(0.33);
        expect(result.amounts[2]).toBe(0.33);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 2);
      });

      it('handles $7 split 4 ways', () => {
        const result = InstallmentService.calculateInstallments(7, 4);
        // $7 / 4 = $1.75 base, no remainder
        expect(result.baseAmount).toBe(1.75);
        expect(result.amounts).toEqual([1.75, 1.75, 1.75, 1.75]);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBe(7);
      });
    });

    describe('typical dues amounts', () => {
      it('handles $275 split 2 ways (typical dues)', () => {
        const result = InstallmentService.calculateInstallments(275, 2);
        expect(result.baseAmount).toBe(137.5);
        expect(result.amounts).toEqual([137.5, 137.5]);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBe(275);
      });

      it('handles $350 split 3 ways (typical dues)', () => {
        const result = InstallmentService.calculateInstallments(350, 3);
        // $350 / 3 = $116.66 base, with $0.02 remainder
        expect(result.baseAmount).toBe(116.66);
        expect(result.amounts[0]).toBe(116.68);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(350, 2);
      });

      it('handles $525 split 2 ways (typical dues)', () => {
        const result = InstallmentService.calculateInstallments(525, 2);
        expect(result.baseAmount).toBe(262.5);
        expect(result.amounts).toEqual([262.5, 262.5]);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBe(525);
      });
    });

    describe('edge cases', () => {
      it('handles single installment (full amount)', () => {
        const result = InstallmentService.calculateInstallments(500, 1);
        expect(result.amounts).toEqual([500]);
        expect(result.baseAmount).toBe(500);
      });

      it('handles very small amount $0.03 split 2 ways', () => {
        const result = InstallmentService.calculateInstallments(0.03, 2);
        // $0.03 / 2 = $0.01 base with $0.01 remainder
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(0.03, 2);
      });

      it('handles large amount $10,000 split 4 ways', () => {
        const result = InstallmentService.calculateInstallments(10000, 4);
        expect(result.amounts).toEqual([2500, 2500, 2500, 2500]);
        expect(result.baseAmount).toBe(2500);
        expect(result.amounts.reduce((a, b) => a + b, 0)).toBe(10000);
      });
    });

    describe('mathematical invariants', () => {
      it('sum of installments always equals total', () => {
        const testCases = [
          { total: 100, installments: 2 },
          { total: 100, installments: 3 },
          { total: 100, installments: 4 },
          { total: 500, installments: 2 },
          { total: 500, installments: 3 },
          { total: 777.77, installments: 3 },
          { total: 1234.56, installments: 4 },
        ];

        testCases.forEach(({ total, installments }) => {
          const result = InstallmentService.calculateInstallments(total, installments);
          const sum = result.amounts.reduce((a, b) => a + b, 0);
          expect(sum).toBeCloseTo(total, 2);
        });
      });

      it('all amounts are non-negative', () => {
        const testCases = [
          { total: 1, installments: 4 },
          { total: 10, installments: 2 },
          { total: 10000, installments: 2 },
        ];

        testCases.forEach(({ total, installments }) => {
          const result = InstallmentService.calculateInstallments(total, installments);
          result.amounts.forEach((amount) => {
            expect(amount).toBeGreaterThanOrEqual(0);
          });
        });
      });

      it('returns correct number of installments', () => {
        [1, 2, 3, 4, 5, 6].forEach((num) => {
          const result = InstallmentService.calculateInstallments(100, num);
          expect(result.amounts.length).toBe(num);
        });
      });

      it('first payment is >= other payments (remainder goes to first)', () => {
        const testCases = [
          { total: 100, installments: 3 },
          { total: 500, installments: 3 },
          { total: 777, installments: 4 },
        ];

        testCases.forEach(({ total, installments }) => {
          const result = InstallmentService.calculateInstallments(total, installments);
          const firstPayment = result.amounts[0];
          result.amounts.slice(1).forEach((amount) => {
            expect(firstPayment).toBeGreaterThanOrEqual(amount);
          });
        });
      });
    });
  });

  describe('generateScheduleDates', () => {
    describe('date spacing', () => {
      it('generates 2 dates 30 days apart', () => {
        const startDate = new Date('2025-01-15');
        const dates = InstallmentService.generateScheduleDates(startDate, 2);

        expect(dates).toHaveLength(2);
        expect(dates[0].toISOString().split('T')[0]).toBe('2025-01-15');
        expect(dates[1].toISOString().split('T')[0]).toBe('2025-02-14');
      });

      it('generates 3 dates 30 days apart', () => {
        const startDate = new Date('2025-01-01');
        const dates = InstallmentService.generateScheduleDates(startDate, 3);

        expect(dates).toHaveLength(3);
        expect(dates[0].toISOString().split('T')[0]).toBe('2025-01-01');
        expect(dates[1].toISOString().split('T')[0]).toBe('2025-01-31');
        expect(dates[2].toISOString().split('T')[0]).toBe('2025-03-02');
      });

      it('generates 4 dates 30 days apart', () => {
        const startDate = new Date('2025-01-01');
        const dates = InstallmentService.generateScheduleDates(startDate, 4);

        expect(dates).toHaveLength(4);
        expect(dates[0].toISOString().split('T')[0]).toBe('2025-01-01');
        expect(dates[1].toISOString().split('T')[0]).toBe('2025-01-31');
        expect(dates[2].toISOString().split('T')[0]).toBe('2025-03-02');
        // Last date: Jan 1 + 90 days (can vary slightly due to timezone)
        const lastDate = dates[3].toISOString().split('T')[0];
        expect(['2025-03-31', '2025-04-01']).toContain(lastDate);
      });
    });

    describe('month boundary handling', () => {
      it('handles starting at end of January (31st)', () => {
        const startDate = new Date('2025-01-31');
        const dates = InstallmentService.generateScheduleDates(startDate, 2);

        expect(dates[0].toISOString().split('T')[0]).toBe('2025-01-31');
        // Jan 31 + 30 days = Mar 2
        expect(dates[1].toISOString().split('T')[0]).toBe('2025-03-02');
      });

      it('handles February to March transition', () => {
        const startDate = new Date('2025-02-01');
        const dates = InstallmentService.generateScheduleDates(startDate, 2);

        expect(dates[0].toISOString().split('T')[0]).toBe('2025-02-01');
        // Feb 1 + 30 days = Mar 3
        expect(dates[1].toISOString().split('T')[0]).toBe('2025-03-03');
      });

      it('handles year boundary (December to January)', () => {
        const startDate = new Date('2024-12-15');
        const dates = InstallmentService.generateScheduleDates(startDate, 3);

        expect(dates[0].toISOString().split('T')[0]).toBe('2024-12-15');
        expect(dates[1].toISOString().split('T')[0]).toBe('2025-01-14');
        expect(dates[2].toISOString().split('T')[0]).toBe('2025-02-13');
      });
    });

    describe('edge cases', () => {
      it('generates single date for 1 installment', () => {
        const startDate = new Date('2025-01-15');
        const dates = InstallmentService.generateScheduleDates(startDate, 1);

        expect(dates).toHaveLength(1);
        expect(dates[0].toISOString().split('T')[0]).toBe('2025-01-15');
      });

      it('does not mutate original start date', () => {
        const startDate = new Date('2025-01-15');
        const originalTime = startDate.getTime();
        InstallmentService.generateScheduleDates(startDate, 4);

        expect(startDate.getTime()).toBe(originalTime);
      });

      it('handles leap year February', () => {
        const startDate = new Date('2024-01-30'); // 2024 is a leap year
        const dates = InstallmentService.generateScheduleDates(startDate, 2);

        expect(dates[0].toISOString().split('T')[0]).toBe('2024-01-30');
        // Jan 30 + 30 days = Feb 29 (leap year!)
        expect(dates[1].toISOString().split('T')[0]).toBe('2024-02-29');
      });
    });

    describe('mathematical invariants', () => {
      it('consecutive dates are approximately 30 days apart', () => {
        const startDate = new Date('2025-01-15');
        const dates = InstallmentService.generateScheduleDates(startDate, 5);

        for (let i = 1; i < dates.length; i++) {
          const diff = dates[i].getTime() - dates[i - 1].getTime();
          const daysDiff = diff / (1000 * 60 * 60 * 24);
          // Allow small variance due to DST transitions
          expect(daysDiff).toBeCloseTo(30, 0);
        }
      });

      it('returns correct number of dates', () => {
        const startDate = new Date('2025-01-01');
        [1, 2, 3, 4, 5, 6].forEach((num) => {
          const dates = InstallmentService.generateScheduleDates(startDate, num);
          expect(dates.length).toBe(num);
        });
      });

      it('all dates are Date objects', () => {
        const startDate = new Date('2025-01-01');
        const dates = InstallmentService.generateScheduleDates(startDate, 4);

        dates.forEach((date) => {
          expect(date instanceof Date).toBe(true);
          expect(isNaN(date.getTime())).toBe(false);
        });
      });
    });

    // ============================================================================
    // DEADLINE-BASED SCHEDULING TESTS
    // ============================================================================

    describe('deadline-based scheduling', () => {
      // Helper to format date in local timezone as YYYY-MM-DD
      const formatLocalDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      it('spaces payments evenly between today and deadline', () => {
        const startDate = new Date(2025, 0, 15); // Jan 15, 2025
        const deadline = new Date(2025, 2, 15); // Mar 15, 2025 (59 days)
        const dates = InstallmentService.generateScheduleDates(startDate, 4, deadline);

        expect(dates).toHaveLength(4);
        expect(formatLocalDate(dates[0])).toBe('2025-01-15');
        expect(formatLocalDate(dates[3])).toBe('2025-03-15'); // Exactly on deadline
      });

      it('calculates correct intervals for 4 payments over 60 days', () => {
        const startDate = new Date(2025, 0, 15); // Jan 15, 2025
        const deadline = new Date(2025, 2, 16); // Mar 16, 2025 (60 days)
        const dates = InstallmentService.generateScheduleDates(startDate, 4, deadline);

        // Interval should be approximately 60 / 3 = 20 days
        expect(dates).toHaveLength(4);
        expect(formatLocalDate(dates[0])).toBe('2025-01-15'); // Day 0
        // Allow 1 day variance for DST/timezone issues
        expect(['2025-02-03', '2025-02-04']).toContain(formatLocalDate(dates[1])); // Day ~20
        expect(['2025-02-23', '2025-02-24']).toContain(formatLocalDate(dates[2])); // Day ~40
        expect(formatLocalDate(dates[3])).toBe('2025-03-16'); // Day 60 (deadline - exact)
      });

      it('last payment is always exactly on deadline', () => {
        const startDate = new Date(2025, 0, 1); // Jan 1, 2025
        const deadline = new Date(2025, 1, 28); // Feb 28, 2025

        [2, 3, 4, 5].forEach(numPayments => {
          const dates = InstallmentService.generateScheduleDates(startDate, numPayments, deadline);
          expect(formatLocalDate(dates[dates.length - 1])).toBe('2025-02-28');
        });
      });

      it('falls back to 30-day intervals when no deadline provided', () => {
        const startDate = new Date(2025, 0, 15); // Jan 15, 2025
        const dates = InstallmentService.generateScheduleDates(startDate, 3);

        expect(dates).toHaveLength(3);
        expect(formatLocalDate(dates[0])).toBe('2025-01-15');
        expect(formatLocalDate(dates[1])).toBe('2025-02-14');
        // Allow 1 day variance for DST/timezone issues
        expect(['2025-03-16', '2025-03-17']).toContain(formatLocalDate(dates[2]));
      });

      it('handles 2 payments correctly', () => {
        const startDate = new Date(2025, 0, 1); // Jan 1, 2025
        const deadline = new Date(2025, 0, 31); // Jan 31, 2025 (30 days)
        const dates = InstallmentService.generateScheduleDates(startDate, 2, deadline);

        expect(dates).toHaveLength(2);
        expect(formatLocalDate(dates[0])).toBe('2025-01-01');
        expect(formatLocalDate(dates[1])).toBe('2025-01-31');
      });

      it('handles 3 payments over 60 days correctly', () => {
        const startDate = new Date(2025, 0, 1); // Jan 1, 2025
        const deadline = new Date(2025, 2, 2); // Mar 2, 2025 (60 days)
        const dates = InstallmentService.generateScheduleDates(startDate, 3, deadline);

        // Interval should be 60 / 2 = 30 days
        expect(dates).toHaveLength(3);
        expect(formatLocalDate(dates[0])).toBe('2025-01-01'); // Day 0
        expect(formatLocalDate(dates[1])).toBe('2025-01-31'); // Day 30
        expect(formatLocalDate(dates[2])).toBe('2025-03-02'); // Day 60 (deadline)
      });

      it('handles single payment (edge case)', () => {
        const startDate = new Date(2025, 0, 15); // Jan 15, 2025
        const deadline = new Date(2025, 2, 15); // Mar 15, 2025
        const dates = InstallmentService.generateScheduleDates(startDate, 1, deadline);

        expect(dates).toHaveLength(1);
        // With single payment, it should be on the deadline
        expect(formatLocalDate(dates[0])).toBe('2025-03-15');
      });

      it('intervals are approximately evenly spaced', () => {
        const startDate = new Date(2025, 0, 1); // Jan 1, 2025
        const deadline = new Date(2025, 3, 1); // Apr 1, 2025 (90 days)
        const dates = InstallmentService.generateScheduleDates(startDate, 4, deadline);

        // With 4 payments over 90 days, interval should be approximately 30 days
        // Allow 1 day variance for DST/timezone issues
        for (let i = 1; i < dates.length; i++) {
          const diff = dates[i].getTime() - dates[i - 1].getTime();
          const daysDiff = Math.round(diff / (1000 * 60 * 60 * 24));
          expect(daysDiff).toBeGreaterThanOrEqual(29);
          expect(daysDiff).toBeLessThanOrEqual(31);
        }
      });

      it('handles year boundary in deadline', () => {
        const startDate = new Date(2024, 11, 1); // Dec 1, 2024
        const deadline = new Date(2025, 1, 28); // Feb 28, 2025 (89 days)
        const dates = InstallmentService.generateScheduleDates(startDate, 3, deadline);

        expect(dates).toHaveLength(3);
        expect(formatLocalDate(dates[0])).toBe('2024-12-01');
        expect(formatLocalDate(dates[2])).toBe('2025-02-28');
      });

      it('does not mutate deadline date', () => {
        const startDate = new Date(2025, 0, 1);
        const deadline = new Date(2025, 2, 15);
        const originalDeadlineTime = deadline.getTime();
        InstallmentService.generateScheduleDates(startDate, 4, deadline);

        expect(deadline.getTime()).toBe(originalDeadlineTime);
      });
    });
  });

  // ============================================================================
  // INTEGRATION SANITY CHECKS
  // ============================================================================

  describe('Installment calculation + scheduling integration', () => {
    it('typical 2-installment plan scenario', () => {
      const duesAmount = 500;
      const numInstallments = 2;
      const startDate = new Date('2025-02-01');

      const amounts = InstallmentService.calculateInstallments(duesAmount, numInstallments);
      const dates = InstallmentService.generateScheduleDates(startDate, numInstallments);

      // Verify we can create a proper payment schedule
      expect(amounts.amounts.length).toBe(dates.length);
      expect(amounts.amounts.reduce((a, b) => a + b, 0)).toBe(duesAmount);

      // First payment due immediately
      expect(dates[0].toISOString().split('T')[0]).toBe('2025-02-01');
      expect(amounts.amounts[0]).toBe(250);

      // Second payment due in 30 days
      expect(dates[1].toISOString().split('T')[0]).toBe('2025-03-03');
      expect(amounts.amounts[1]).toBe(250);
    });

    it('typical 3-installment plan scenario', () => {
      const duesAmount = 750;
      const numInstallments = 3;
      const startDate = new Date('2025-01-15');

      const amounts = InstallmentService.calculateInstallments(duesAmount, numInstallments);
      const dates = InstallmentService.generateScheduleDates(startDate, numInstallments);

      expect(amounts.amounts.length).toBe(3);
      expect(dates.length).toBe(3);
      expect(amounts.amounts.reduce((a, b) => a + b, 0)).toBe(750);

      // Each payment should be $250
      expect(amounts.amounts).toEqual([250, 250, 250]);
    });

    it('handles worst-case rounding scenario', () => {
      // $1000.01 split 3 ways
      const duesAmount = 1000.01;
      const numInstallments = 3;
      const startDate = new Date('2025-01-01');

      const amounts = InstallmentService.calculateInstallments(duesAmount, numInstallments);
      const dates = InstallmentService.generateScheduleDates(startDate, numInstallments);

      expect(amounts.amounts.length).toBe(dates.length);
      // Total must equal original amount
      expect(amounts.amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(duesAmount, 2);
    });
  });
});
