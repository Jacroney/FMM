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
 * Format a dollar amount for display, without the dollar sign
 * Example: 1234.56 => "1,234.56"
 */
export const formatCurrencyNoSymbol = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

/**
 * Check if an amount has at most 2 decimal places (valid for currency)
 */
export const isValidCurrencyAmount = (amount: number): boolean =>
  Math.round(amount * 100) === amount * 100;

/**
 * Convert dollars to cents with validation warning
 * Use this when preparing amounts for Stripe API calls
 */
export const dollarsToCents = (dollars: number): number => {
  if (!isValidCurrencyAmount(dollars)) {
    console.warn(`Currency amount ${dollars} has more than 2 decimal places, rounding to nearest cent`);
  }
  return Math.round(dollars * 100);
};

/**
 * Convert cents to dollars
 */
export const centsToDollars = (cents: number): number => cents / 100;
