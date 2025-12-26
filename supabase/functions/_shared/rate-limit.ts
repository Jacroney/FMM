/**
 * Rate Limiting Utilities for Supabase Edge Functions
 *
 * SECURITY: Implements sliding window rate limiting to prevent abuse
 * Uses in-memory tracking for the current request + database for persistence
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

export interface RateLimitConfig {
  // Maximum number of requests allowed in the window
  maxRequests: number
  // Time window in seconds
  windowSeconds: number
  // Identifier type: 'user' (authenticated), 'ip', or 'both'
  identifierType: 'user' | 'ip' | 'both'
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number // seconds until they can retry
}

// Default rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // Payment creation - stricter limits
  payment: {
    maxRequests: 10,
    windowSeconds: 60, // 10 requests per minute
    identifierType: 'user' as const,
  },
  // Stripe Connect operations
  stripeConnect: {
    maxRequests: 5,
    windowSeconds: 60, // 5 requests per minute
    identifierType: 'user' as const,
  },
  // Email sending
  email: {
    maxRequests: 20,
    windowSeconds: 3600, // 20 per hour
    identifierType: 'user' as const,
  },
  // General API calls
  general: {
    maxRequests: 100,
    windowSeconds: 60, // 100 per minute
    identifierType: 'ip' as const,
  },
}

/**
 * Check rate limit for a given identifier
 * Uses database to track request counts
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  endpoint: string,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

  try {
    // Check existing requests in the window
    const { count, error: countError } = await supabase
      .from('rate_limit_requests')
      .select('*', { count: 'exact', head: true })
      .eq('endpoint', endpoint)
      .eq('identifier', identifier)
      .gte('created_at', windowStart.toISOString())

    if (countError) {
      console.error('Rate limit check error:', countError)
      // If we can't check, allow the request but log the error
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
      }
    }

    const requestCount = count || 0
    const remaining = Math.max(0, config.maxRequests - requestCount - 1)
    const resetAt = new Date(now.getTime() + config.windowSeconds * 1000)

    if (requestCount >= config.maxRequests) {
      // Rate limited
      const oldestRequest = await supabase
        .from('rate_limit_requests')
        .select('created_at')
        .eq('endpoint', endpoint)
        .eq('identifier', identifier)
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const retryAfter = oldestRequest.data
        ? Math.ceil(
            (new Date(oldestRequest.data.created_at).getTime() +
              config.windowSeconds * 1000 -
              now.getTime()) /
              1000
          )
        : config.windowSeconds

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.max(1, retryAfter),
      }
    }

    // Record this request
    const { error: insertError } = await supabase
      .from('rate_limit_requests')
      .insert({
        endpoint,
        identifier,
        created_at: now.toISOString(),
      })

    if (insertError) {
      console.error('Rate limit insert error:', insertError)
      // Still allow the request if we can't record it
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // On error, allow the request
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
    }
  }
}

/**
 * Get identifier from request based on config
 */
export function getIdentifier(
  req: Request,
  userId: string | null,
  config: RateLimitConfig
): string {
  const ip = getClientIP(req)

  switch (config.identifierType) {
    case 'user':
      return userId || ip || 'anonymous'
    case 'ip':
      return ip || 'unknown'
    case 'both':
      return `${userId || 'anon'}_${ip || 'unknown'}`
    default:
      return userId || ip || 'unknown'
  }
}

/**
 * Extract client IP from request headers
 */
function getClientIP(req: Request): string | null {
  // Check various headers that might contain the real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
  ]

  for (const header of headers) {
    const value = req.headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return value.split(',')[0].trim()
    }
  }

  return null
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter || 60),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toISOString(),
      },
    }
  )
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult
): Record<string, string> {
  return {
    ...headers,
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  }
}

/**
 * Clean up old rate limit records (call periodically)
 * This should be called by a cron job, not on every request
 */
export async function cleanupRateLimitRecords(
  supabase: SupabaseClient,
  maxAgeSeconds: number = 3600
): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeSeconds * 1000)

  const { error } = await supabase
    .from('rate_limit_requests')
    .delete()
    .lt('created_at', cutoff.toISOString())

  if (error) {
    console.error('Rate limit cleanup error:', error)
  }
}
