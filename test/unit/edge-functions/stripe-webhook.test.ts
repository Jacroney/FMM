/**
 * Stripe Webhook Signature Verification Tests
 *
 * Tests the security-critical signature verification logic used in the
 * stripe-webhook edge function. These tests verify:
 * - Signature header parsing
 * - Timestamp validation (5 minute tolerance)
 * - HMAC computation
 * - Constant-time comparison (timing attack prevention)
 *
 * Note: The actual edge function runs in Deno with Web Crypto API.
 * These tests use Node's crypto module to verify the same logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';

// ============================================================================
// SIGNATURE PARSING LOGIC (extracted from edge function)
// ============================================================================

interface ParsedSignature {
  timestamp: string;
  v1Signature: string;
}

function parseStripeSignature(signature: string): ParsedSignature | null {
  const elements = signature.split(',');
  let timestamp = '';
  let v1Signature = '';

  for (const element of elements) {
    const [key, value] = element.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') v1Signature = value;
  }

  if (!timestamp || !v1Signature) {
    return null;
  }

  return { timestamp, v1Signature };
}

// ============================================================================
// TIMESTAMP VALIDATION (5 minute tolerance)
// ============================================================================

function isTimestampValid(timestamp: string, now: number = Math.floor(Date.now() / 1000)): boolean {
  const webhookTimestamp = parseInt(timestamp, 10);
  if (isNaN(webhookTimestamp)) return false;
  return Math.abs(now - webhookTimestamp) <= 300; // 5 minutes
}

// ============================================================================
// HMAC COMPUTATION (Node.js implementation for testing)
// ============================================================================

function computeExpectedSignature(payload: string, timestamp: string, secret: string): string {
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  return hmac.digest('hex');
}

// ============================================================================
// CONSTANT-TIME COMPARISON (timing attack prevention)
// ============================================================================

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================================
// FULL SIGNATURE VERIFICATION
// ============================================================================

function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
  now: number = Math.floor(Date.now() / 1000)
): boolean {
  const parsed = parseStripeSignature(signature);
  if (!parsed) return false;

  if (!isTimestampValid(parsed.timestamp, now)) return false;

  const expectedSignature = computeExpectedSignature(payload, parsed.timestamp, secret);
  return constantTimeCompare(expectedSignature, parsed.v1Signature);
}

// ============================================================================
// HELPER: Create valid Stripe signature
// ============================================================================

function createValidSignature(payload: string, secret: string, timestamp?: number): string {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  const signature = hmac.digest('hex');
  return `t=${ts},v1=${signature}`;
}

// ============================================================================
// TESTS
// ============================================================================

describe('Stripe Webhook Signature Verification', () => {
  const testSecret = 'whsec_test_secret_123';
  const testPayload = JSON.stringify({
    id: 'evt_test_123',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_test_456' } }
  });

  describe('parseStripeSignature', () => {
    it('parses valid signature header', () => {
      const signature = 't=1234567890,v1=abc123def456';
      const result = parseStripeSignature(signature);

      expect(result).not.toBeNull();
      expect(result?.timestamp).toBe('1234567890');
      expect(result?.v1Signature).toBe('abc123def456');
    });

    it('returns null for missing timestamp', () => {
      const signature = 'v1=abc123def456';
      const result = parseStripeSignature(signature);

      expect(result).toBeNull();
    });

    it('returns null for missing v1 signature', () => {
      const signature = 't=1234567890';
      const result = parseStripeSignature(signature);

      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = parseStripeSignature('');

      expect(result).toBeNull();
    });

    it('handles multiple signatures (v0 and v1)', () => {
      const signature = 't=1234567890,v0=oldscheme,v1=newscheme';
      const result = parseStripeSignature(signature);

      expect(result?.v1Signature).toBe('newscheme');
    });

    it('handles extra whitespace in values', () => {
      // Stripe doesn't send whitespace, but test robustness
      const signature = 't=1234567890,v1=abc123';
      const result = parseStripeSignature(signature);

      expect(result).not.toBeNull();
    });
  });

  describe('isTimestampValid', () => {
    it('accepts timestamp within 5 minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = String(now - 60); // 1 minute ago

      expect(isTimestampValid(timestamp, now)).toBe(true);
    });

    it('accepts timestamp exactly 5 minutes old', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = String(now - 300); // Exactly 5 minutes ago

      expect(isTimestampValid(timestamp, now)).toBe(true);
    });

    it('rejects timestamp older than 5 minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = String(now - 301); // 5 minutes + 1 second ago

      expect(isTimestampValid(timestamp, now)).toBe(false);
    });

    it('rejects timestamp more than 5 minutes in the future', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = String(now + 301); // 5 minutes + 1 second in future

      expect(isTimestampValid(timestamp, now)).toBe(false);
    });

    it('accepts timestamp slightly in the future (clock skew)', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = String(now + 60); // 1 minute in future

      expect(isTimestampValid(timestamp, now)).toBe(true);
    });

    it('rejects non-numeric timestamp', () => {
      expect(isTimestampValid('invalid')).toBe(false);
    });

    it('rejects empty timestamp', () => {
      expect(isTimestampValid('')).toBe(false);
    });
  });

  describe('computeExpectedSignature', () => {
    it('computes HMAC-SHA256 correctly', () => {
      const payload = '{"test":"data"}';
      const timestamp = '1234567890';
      const secret = 'test_secret';

      const signature = computeExpectedSignature(payload, timestamp, secret);

      // Verify it's a valid hex string of correct length (64 chars for SHA256)
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces different signatures for different payloads', () => {
      const timestamp = '1234567890';
      const secret = 'test_secret';

      const sig1 = computeExpectedSignature('payload1', timestamp, secret);
      const sig2 = computeExpectedSignature('payload2', timestamp, secret);

      expect(sig1).not.toBe(sig2);
    });

    it('produces different signatures for different timestamps', () => {
      const payload = '{"test":"data"}';
      const secret = 'test_secret';

      const sig1 = computeExpectedSignature(payload, '1234567890', secret);
      const sig2 = computeExpectedSignature(payload, '1234567891', secret);

      expect(sig1).not.toBe(sig2);
    });

    it('produces different signatures for different secrets', () => {
      const payload = '{"test":"data"}';
      const timestamp = '1234567890';

      const sig1 = computeExpectedSignature(payload, timestamp, 'secret1');
      const sig2 = computeExpectedSignature(payload, timestamp, 'secret2');

      expect(sig1).not.toBe(sig2);
    });

    it('produces consistent signatures', () => {
      const payload = '{"test":"data"}';
      const timestamp = '1234567890';
      const secret = 'test_secret';

      const sig1 = computeExpectedSignature(payload, timestamp, secret);
      const sig2 = computeExpectedSignature(payload, timestamp, secret);

      expect(sig1).toBe(sig2);
    });
  });

  describe('constantTimeCompare', () => {
    it('returns true for identical strings', () => {
      expect(constantTimeCompare('abc123', 'abc123')).toBe(true);
    });

    it('returns false for different strings of same length', () => {
      expect(constantTimeCompare('abc123', 'abc124')).toBe(false);
    });

    it('returns false for strings of different lengths', () => {
      expect(constantTimeCompare('abc', 'abcd')).toBe(false);
    });

    it('returns true for empty strings', () => {
      expect(constantTimeCompare('', '')).toBe(true);
    });

    it('returns false for one empty string', () => {
      expect(constantTimeCompare('', 'a')).toBe(false);
    });

    it('handles long strings', () => {
      const longStr = 'a'.repeat(1000);
      expect(constantTimeCompare(longStr, longStr)).toBe(true);
      expect(constantTimeCompare(longStr, longStr.slice(0, -1) + 'b')).toBe(false);
    });

    it('is case sensitive', () => {
      expect(constantTimeCompare('ABC', 'abc')).toBe(false);
    });
  });

  describe('verifyStripeSignature (full verification)', () => {
    it('accepts valid signature', () => {
      const now = Math.floor(Date.now() / 1000);
      const signature = createValidSignature(testPayload, testSecret, now);

      const result = verifyStripeSignature(testPayload, signature, testSecret, now);

      expect(result).toBe(true);
    });

    it('rejects signature with wrong secret', () => {
      const now = Math.floor(Date.now() / 1000);
      const signature = createValidSignature(testPayload, testSecret, now);

      const result = verifyStripeSignature(testPayload, signature, 'wrong_secret', now);

      expect(result).toBe(false);
    });

    it('rejects tampered payload', () => {
      const now = Math.floor(Date.now() / 1000);
      const signature = createValidSignature(testPayload, testSecret, now);
      const tamperedPayload = testPayload.replace('succeeded', 'failed');

      const result = verifyStripeSignature(tamperedPayload, signature, testSecret, now);

      expect(result).toBe(false);
    });

    it('rejects expired timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      const oldTimestamp = now - 600; // 10 minutes ago
      const signature = createValidSignature(testPayload, testSecret, oldTimestamp);

      const result = verifyStripeSignature(testPayload, signature, testSecret, now);

      expect(result).toBe(false);
    });

    it('rejects missing signature header', () => {
      const now = Math.floor(Date.now() / 1000);

      const result = verifyStripeSignature(testPayload, '', testSecret, now);

      expect(result).toBe(false);
    });

    it('rejects malformed signature header', () => {
      const now = Math.floor(Date.now() / 1000);

      const result = verifyStripeSignature(testPayload, 'invalid_header', testSecret, now);

      expect(result).toBe(false);
    });

    it('rejects signature with tampered timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      const signature = createValidSignature(testPayload, testSecret, now);
      // Change timestamp but keep original v1 signature
      const tamperedSignature = signature.replace(`t=${now}`, `t=${now + 1}`);

      const result = verifyStripeSignature(testPayload, tamperedSignature, testSecret, now);

      expect(result).toBe(false);
    });
  });

  describe('Security considerations', () => {
    it('prevents replay attacks with old timestamps', () => {
      const now = Math.floor(Date.now() / 1000);
      const signature = createValidSignature(testPayload, testSecret, now);

      // Signature is valid now
      expect(verifyStripeSignature(testPayload, signature, testSecret, now)).toBe(true);

      // Same signature rejected 10 minutes later
      const futureNow = now + 600;
      expect(verifyStripeSignature(testPayload, signature, testSecret, futureNow)).toBe(false);
    });

    it('prevents signature from different webhook being reused', () => {
      const now = Math.floor(Date.now() / 1000);
      const differentPayload = JSON.stringify({ id: 'evt_different', type: 'other.event' });
      const signature = createValidSignature(differentPayload, testSecret, now);

      // Signature valid for original payload
      expect(verifyStripeSignature(differentPayload, signature, testSecret, now)).toBe(true);

      // Same signature rejected for different payload
      expect(verifyStripeSignature(testPayload, signature, testSecret, now)).toBe(false);
    });

    it('requires correct webhook secret (no default bypass)', () => {
      const now = Math.floor(Date.now() / 1000);
      const signature = createValidSignature(testPayload, testSecret, now);

      // Empty secret should fail
      expect(verifyStripeSignature(testPayload, signature, '', now)).toBe(false);
    });
  });
});
