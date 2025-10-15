/**
 * Input Validation Utilities for Supabase Edge Functions
 *
 * SECURITY: Validates and sanitizes all user inputs to prevent
 * injection attacks, XSS, and other vulnerabilities
 */

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate UUID format
 * @param value - String to validate
 * @param fieldName - Name of field for error messages
 * @returns Validated UUID string
 */
export function validateUuid(value: any, fieldName: string = 'id'): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }

  return value;
}

/**
 * Validate and sanitize string input
 * @param value - String to validate
 * @param fieldName - Name of field for error messages
 * @param minLength - Minimum length (default: 1)
 * @param maxLength - Maximum length (default: 1000)
 * @returns Sanitized string
 */
export function validateString(
  value: any,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 1000
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  // Trim whitespace
  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`);
  }

  // Basic XSS prevention - remove potential script tags
  const sanitized = trimmed
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, ''); // Remove event handlers like onclick=

  return sanitized;
}

/**
 * Validate number input
 * @param value - Value to validate
 * @param fieldName - Name of field for error messages
 * @param min - Minimum value (optional)
 * @param max - Maximum value (optional)
 * @returns Validated number
 */
export function validateNumber(
  value: any,
  fieldName: string,
  min?: number,
  max?: number
): number {
  const num = Number(value);

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }

  return num;
}

/**
 * Validate boolean input
 * @param value - Value to validate
 * @param fieldName - Name of field for error messages
 * @returns Validated boolean
 */
export function validateBoolean(value: any, fieldName: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new ValidationError(`${fieldName} must be a boolean`);
}

/**
 * Validate email format
 * @param value - Email to validate
 * @param fieldName - Name of field for error messages
 * @returns Validated email
 */
export function validateEmail(value: any, fieldName: string = 'email'): string {
  const email = validateString(value, fieldName, 3, 255);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError(`${fieldName} must be a valid email address`);
  }

  return email.toLowerCase();
}

/**
 * Validate enum value
 * @param value - Value to validate
 * @param allowedValues - Array of allowed values
 * @param fieldName - Name of field for error messages
 * @returns Validated value
 */
export function validateEnum<T extends string>(
  value: any,
  allowedValues: T[],
  fieldName: string
): T {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }

  return value as T;
}

/**
 * Validate JSON object
 * @param value - Value to validate
 * @param fieldName - Name of field for error messages
 * @returns Validated object
 */
export function validateObject(value: any, fieldName: string): Record<string, any> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object`);
  }

  return value;
}

/**
 * Validate array
 * @param value - Value to validate
 * @param fieldName - Name of field for error messages
 * @param minLength - Minimum array length (optional)
 * @param maxLength - Maximum array length (optional)
 * @returns Validated array
 */
export function validateArray(
  value: any,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): any[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }

  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(`${fieldName} must have at least ${minLength} items`);
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must have at most ${maxLength} items`);
  }

  return value;
}

/**
 * Validate required field exists
 * @param value - Value to check
 * @param fieldName - Name of field for error messages
 * @returns Value if it exists
 */
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }

  return value;
}
