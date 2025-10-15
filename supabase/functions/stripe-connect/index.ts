/**
 * Stripe Connect Onboarding Edge Function
 *
 * Handles Stripe Connect account creation and onboarding for chapters
 * to accept online dues payments.
 *
 * Actions:
 * - create_account: Create new Stripe Connected Account
 * - create_account_link: Generate onboarding URL
 * - check_status: Check onboarding completion status
 * - refresh_account: Refresh account data from Stripe
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for admin operations
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

    // Get user from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { action, chapter_id } = await req.json()

    if (!chapter_id) {
      throw new Error('chapter_id is required')
    }

    // Verify user has admin access to this chapter
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, chapter_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.chapter_id !== chapter_id || profile.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required')
    }

    // ================================================
    // ACTION: create_account
    // ================================================
    if (action === 'create_account') {
      // Check if account already exists
      const { data: existingAccount } = await supabaseAdmin
        .from('stripe_connected_accounts')
        .select('*')
        .eq('chapter_id', chapter_id)
        .single()

      if (existingAccount) {
        // Account exists, create new account link
        const accountLink = await stripe.accountLinks.create({
          account: existingAccount.stripe_account_id,
          refresh_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/settings?tab=payments&refresh=true`,
          return_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/settings?tab=payments&success=true`,
          type: 'account_onboarding',
        })

        // Update onboarding URL
        await supabaseAdmin
          .from('stripe_connected_accounts')
          .update({
            onboarding_url: accountLink.url,
            onboarding_expires_at: new Date(accountLink.expires_at * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('chapter_id', chapter_id)

        return new Response(
          JSON.stringify({
            success: true,
            onboarding_url: accountLink.url,
            account_id: existingAccount.stripe_account_id,
            message: 'Account already exists, generated new onboarding link'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get chapter information for metadata
      const { data: chapter } = await supabaseAdmin
        .from('chapters')
        .select('name, university')
        .eq('id', chapter_id)
        .single()

      // Create new Stripe Connected Account
      const account = await stripe.accounts.create({
        type: 'express', // Express accounts have simpler onboarding
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          us_bank_account_ach_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'non_profit',
        metadata: {
          chapter_id,
          chapter_name: chapter?.name || '',
          university: chapter?.university || '',
        },
      })

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/settings?tab=payments&refresh=true`,
        return_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/settings?tab=payments&success=true`,
        type: 'account_onboarding',
      })

      // Store in database
      const { error: insertError } = await supabaseAdmin
        .from('stripe_connected_accounts')
        .insert({
          chapter_id,
          stripe_account_id: account.id,
          stripe_account_type: 'express',
          onboarding_completed: false,
          onboarding_url: accountLink.url,
          onboarding_expires_at: new Date(accountLink.expires_at * 1000).toISOString(),
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
        })

      if (insertError) {
        console.error('Error storing Stripe account:', insertError)
        throw new Error('Failed to store Stripe account')
      }

      return new Response(
        JSON.stringify({
          success: true,
          onboarding_url: accountLink.url,
          account_id: account.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ================================================
    // ACTION: create_account_link
    // ================================================
    if (action === 'create_account_link') {
      const { data: stripeAccount } = await supabaseAdmin
        .from('stripe_connected_accounts')
        .select('*')
        .eq('chapter_id', chapter_id)
        .single()

      if (!stripeAccount) {
        throw new Error('No Stripe account found. Please create an account first.')
      }

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccount.stripe_account_id,
        refresh_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/settings?tab=payments&refresh=true`,
        return_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'}/settings?tab=payments&success=true`,
        type: 'account_onboarding',
      })

      // Update onboarding URL
      await supabaseAdmin
        .from('stripe_connected_accounts')
        .update({
          onboarding_url: accountLink.url,
          onboarding_expires_at: new Date(accountLink.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('chapter_id', chapter_id)

      return new Response(
        JSON.stringify({
          success: true,
          onboarding_url: accountLink.url,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ================================================
    // ACTION: check_status
    // ================================================
    if (action === 'check_status') {
      const { data: stripeAccount } = await supabaseAdmin
        .from('stripe_connected_accounts')
        .select('*')
        .eq('chapter_id', chapter_id)
        .single()

      if (!stripeAccount) {
        return new Response(
          JSON.stringify({
            success: true,
            has_account: false,
            onboarding_completed: false,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch fresh data from Stripe
      const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id)

      const isComplete = account.charges_enabled && account.payouts_enabled && account.details_submitted

      // Update database with latest info
      await supabaseAdmin
        .from('stripe_connected_accounts')
        .update({
          onboarding_completed: isComplete,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          details_submitted: account.details_submitted || false,
          has_bank_account: (account.external_accounts?.data?.length ?? 0) > 0,
          updated_at: new Date().toISOString()
        })
        .eq('chapter_id', chapter_id)

      return new Response(
        JSON.stringify({
          success: true,
          has_account: true,
          account_id: account.id,
          onboarding_completed: isComplete,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          has_bank_account: (account.external_accounts?.data?.length ?? 0) > 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ================================================
    // ACTION: refresh_account
    // ================================================
    if (action === 'refresh_account') {
      const { data: stripeAccount } = await supabaseAdmin
        .from('stripe_connected_accounts')
        .select('*')
        .eq('chapter_id', chapter_id)
        .single()

      if (!stripeAccount) {
        throw new Error('No Stripe account found')
      }

      const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id)

      const isComplete = account.charges_enabled && account.payouts_enabled && account.details_submitted

      await supabaseAdmin
        .from('stripe_connected_accounts')
        .update({
          onboarding_completed: isComplete,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          details_submitted: account.details_submitted || false,
          has_bank_account: (account.external_accounts?.data?.length ?? 0) > 0,
          updated_at: new Date().toISOString()
        })
        .eq('chapter_id', chapter_id)

      return new Response(
        JSON.stringify({
          success: true,
          onboarding_completed: isComplete,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          has_bank_account: (account.external_accounts?.data?.length ?? 0) > 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Invalid action
    throw new Error(`Invalid action: ${action}`)

  } catch (error) {
    console.error('Error in stripe-connect function:', error)

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
