/**
 * Process Stripe Customer Queue - Scheduled Edge Function
 *
 * Runs every minute to process pending Stripe customer creation requests.
 * This function is triggered by a cron schedule: "* * * * *" (every minute)
 *
 * Workflow:
 * 1. Fetch pending items from stripe_customer_queue
 * 2. For each item, create a Stripe customer
 * 3. Update user_profiles with customer ID
 * 4. Mark queue item as completed or failed
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
})

serve(async (req) => {
  try {
    // SECURITY: Verify request is from Supabase Cron or has valid service role key
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!authHeader || !authHeader.includes(serviceRoleKey || '')) {
      console.error('Unauthorized cron job access attempt')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Starting Stripe customer queue processing...')

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

    // Get pending queue items
    const { data: queueItems, error: queueError } = await supabaseAdmin
      .rpc('get_pending_stripe_customer_queue')

    if (queueError) {
      console.error('Error fetching queue items:', queueError)
      throw queueError
    }

    console.log(`Found ${queueItems?.length || 0} pending items in queue`)

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No pending items in queue'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let succeeded = 0
    let failed = 0

    // Process each queue item
    for (const item of queueItems) {
      try {
        console.log(`Processing queue item ${item.queue_id} for user ${item.user_id}`)

        // Mark as processing
        await supabaseAdmin.rpc('update_stripe_customer_queue_status', {
          p_queue_id: item.queue_id,
          p_status: 'processing'
        })

        // Get chapter info for metadata
        let chapterName = ''
        let university = ''

        if (item.chapter_id) {
          const { data: chapter } = await supabaseAdmin
            .from('chapters')
            .select('name, university')
            .eq('id', item.chapter_id)
            .single()

          if (chapter) {
            chapterName = chapter.name
            university = chapter.university
          }
        }

        // Create Stripe customer
        const customer = await stripe.customers.create({
          email: item.email,
          name: item.full_name || undefined,
          metadata: {
            user_id: item.user_id,
            chapter_id: item.chapter_id || '',
            chapter_name: chapterName,
            university: university,
            source: 'fmm_automated_queue'
          },
          description: `Member: ${item.full_name || item.email} - Chapter: ${chapterName}`
        })

        console.log(`Created Stripe customer ${customer.id} for user ${item.user_id}`)

        // Update user profile with customer ID
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            stripe_customer_id: customer.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.user_id)

        if (updateError) {
          console.error(`Error updating user profile ${item.user_id}:`, updateError)
          throw new Error(`Failed to update user profile: ${updateError.message}`)
        }

        // Mark as completed
        await supabaseAdmin.rpc('update_stripe_customer_queue_status', {
          p_queue_id: item.queue_id,
          p_status: 'completed'
        })

        processed++
        succeeded++
        console.log(`✓ Successfully processed queue item ${item.queue_id}`)

      } catch (error) {
        console.error(`Error processing queue item ${item.queue_id}:`, error)

        // Mark as failed
        await supabaseAdmin.rpc('update_stripe_customer_queue_status', {
          p_queue_id: item.queue_id,
          p_status: 'failed',
          p_error_message: error.message || 'Unknown error'
        })

        processed++
        failed++
      }
    }

    const result = {
      success: true,
      processed,
      succeeded,
      failed,
      message: `Processed ${processed} items: ${succeeded} succeeded, ${failed} failed`
    }

    console.log('Queue processing complete:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-stripe-customer-queue function:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
