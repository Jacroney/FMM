/**
 * Create Stripe Customer Edge Function
 *
 * Automatically creates a Stripe Customer for a member when they sign up.
 * This enables saved payment methods, automatic charging, and better payment tracking.
 *
 * Can be called:
 * 1. Directly via HTTP request
 * 2. From a database trigger when new user_profiles are created
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { checkRateLimit, getIdentifier, rateLimitResponse, RATE_LIMITS } from '../_shared/rate-limit.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCorsPreflightRequest(req)
  if (corsResponse) return corsResponse

  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { user_id } = await req.json()

    if (!user_id) {
      throw new Error('user_id is required')
    }

    // SECURITY: Rate limiting to prevent abuse
    const rateLimitIdentifier = getIdentifier(req, user_id, RATE_LIMITS.stripeConnect)
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      'create-stripe-customer',
      rateLimitIdentifier,
      RATE_LIMITS.stripeConnect
    )
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, corsHeaders)
    }

    console.log('Creating Stripe customer for user:', user_id)

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, chapter_id, stripe_customer_id')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError)
      throw new Error('User profile not found')
    }

    // If customer already exists, return it
    if (profile.stripe_customer_id) {
      console.log('Stripe customer already exists:', profile.stripe_customer_id)

      // Verify customer still exists in Stripe
      try {
        const customer = await stripe.customers.retrieve(profile.stripe_customer_id)

        if (!customer.deleted) {
          return new Response(
            JSON.stringify({
              success: true,
              customer_id: profile.stripe_customer_id,
              message: 'Customer already exists'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          console.log('Existing customer was deleted in Stripe, creating new one')
        }
      } catch (error) {
        console.log('Error retrieving existing customer, will create new one:', error.message)
      }
    }

    // Get chapter information for metadata
    let chapterName = ''
    let university = ''

    if (profile.chapter_id) {
      const { data: chapter } = await supabaseAdmin
        .from('chapters')
        .select('name, university')
        .eq('id', profile.chapter_id)
        .single()

      if (chapter) {
        chapterName = chapter.name
        university = chapter.university
      }
    }

    // Create Stripe Customer
    // SECURITY: Minimize PII in metadata - only store IDs for GDPR compliance
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.full_name || undefined,
      metadata: {
        user_id: profile.id,
        chapter_id: profile.chapter_id || '',
        source: 'fmm_automatic_creation'
        // Removed: chapter_name, university (PII minimization)
      },
      description: `FMM Member` // Generic description to minimize PII exposure
    })

    console.log('Stripe customer created:', customer.id)

    // Update user profile with customer ID
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)

    if (updateError) {
      console.error('Error updating user profile with customer ID:', updateError)
      // Don't throw error here - customer was created successfully
      // We can retry the update later
    }

    return new Response(
      JSON.stringify({
        success: true,
        customer_id: customer.id,
        message: 'Stripe customer created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-stripe-customer function:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
