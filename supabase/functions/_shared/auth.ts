/**
 * Authentication & Authorization Utilities for Supabase Edge Functions
 *
 * SECURITY: Server-side authorization checks to prevent client-side bypass
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type UserRole = 'admin' | 'exec' | 'member';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  chapter_id: string;
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when authorization fails
 */
export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Create Supabase client with service role key
 * @returns Supabase client
 */
export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Extract and validate authorization token from request
 * @param req - The incoming request
 * @returns Authorization token
 */
export function extractAuthToken(req: Request): string {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new AuthenticationError('Missing authorization header');
  }

  // Remove 'Bearer ' prefix
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    throw new AuthenticationError('Invalid authorization header format');
  }

  return token;
}

/**
 * Authenticate user and get their profile with role information
 * @param req - The incoming request
 * @param supabase - Supabase client
 * @returns Authenticated user with role and chapter
 */
export async function authenticateUser(
  req: Request,
  supabase: SupabaseClient
): Promise<AuthenticatedUser> {
  const token = extractAuthToken(req);

  // Verify token and get user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new AuthenticationError('Invalid or expired token');
  }

  // Get user profile with role and chapter
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, chapter_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new AuthenticationError('User profile not found');
  }

  return {
    id: user.id,
    email: user.email || '',
    role: profile.role as UserRole,
    chapter_id: profile.chapter_id,
  };
}

/**
 * Check if user has admin role
 * @param user - Authenticated user
 */
export function requireAdmin(user: AuthenticatedUser): void {
  if (user.role !== 'admin') {
    throw new AuthorizationError('Admin role required');
  }
}

/**
 * Check if user has admin or exec role
 * @param user - Authenticated user
 */
export function requireAdminOrExec(user: AuthenticatedUser): void {
  if (user.role !== 'admin' && user.role !== 'exec') {
    throw new AuthorizationError('Admin or exec role required');
  }
}

/**
 * Check if user has specific role
 * @param user - Authenticated user
 * @param requiredRoles - Array of allowed roles
 */
export function requireRole(user: AuthenticatedUser, requiredRoles: UserRole[]): void {
  if (!requiredRoles.includes(user.role)) {
    throw new AuthorizationError(
      `One of the following roles required: ${requiredRoles.join(', ')}`
    );
  }
}

/**
 * Verify user has access to a specific chapter
 * @param user - Authenticated user
 * @param chapterId - Chapter ID to check
 */
export function requireChapterAccess(user: AuthenticatedUser, chapterId: string): void {
  if (user.chapter_id !== chapterId) {
    throw new AuthorizationError('Access denied to this chapter');
  }
}

/**
 * Sanitize error message for client response
 * SECURITY: Never expose internal error details to clients
 * @param error - The error object
 * @returns Safe error message
 */
export function sanitizeError(error: any): { error: string; statusCode: number } {
  // Known error types with safe messages
  if (error instanceof AuthenticationError) {
    return { error: 'Authentication failed', statusCode: 401 };
  }

  if (error instanceof AuthorizationError) {
    return { error: 'Access denied', statusCode: 403 };
  }

  // For validation errors, we can return the message as it's user input related
  if (error.name === 'ValidationError') {
    return { error: error.message, statusCode: 400 };
  }

  // For all other errors, return generic message
  console.error('Internal error:', error);
  return { error: 'Internal server error', statusCode: 500 };
}
