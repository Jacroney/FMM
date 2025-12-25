/**
 * Currency formatting and conversion utilities
 *
 * Use formatCurrency() for all UI display of money amounts.
 * Use dollarsToCents() when converting for Stripe payments.
 */

/**
 * Format a dollar amount for display with proper locale formatting
 * Example: 1234.56 => "$1,234.56"
 */
export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);

/**
 * Convert dollars to cents
 * Use this when preparing amounts for Stripe API calls
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Convert cents to dollars
 */
export const centsToDollars = (cents: number): number => cents / 100;
