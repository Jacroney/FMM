// Supabase Edge Function for Plaid Integration
// Handles: Link token creation, public token exchange, transaction syncing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'npm:plaid@16.0.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Plaid client
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[Deno.env.get('PLAID_ENV') || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID'),
      'PLAID-SECRET': Deno.env.get('PLAID_SECRET'),
    },
  },
})
const plaidClient = new PlaidApi(plaidConfig)

// Helper function to compute transaction hash
function computeTxnHash(externalId: string, source: string, date: string, amount: number, description: string): string {
  const data = `${externalId || ''}|${source || ''}|${date || ''}|${amount || ''}|${description || ''}`
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  return crypto.subtle.digest('SHA-256', dataBuffer).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  })
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { action, chapter_id, public_token, connection_id, cursor } = await req.json()

    // ========================================================================
    // ACTION: create_link_token
    // Creates a Plaid Link token for the frontend to initialize Plaid Link
    // ========================================================================
    if (action === 'create_link_token') {
      // Get user profile to verify chapter access
      const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('chapter_id, full_name')
        .eq('id', user.id)
        .single()

      if (!profile || profile.chapter_id !== chapter_id) {
        throw new Error('Unauthorized access to chapter')
      }

      const response = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: user.id,
        },
        client_name: 'FMM Treasurer App',
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: 'en',
        webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-webhook`,
      })

      return new Response(
        JSON.stringify({ link_token: response.data.link_token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // ACTION: exchange_token
    // Exchanges public token for access token and stores connection
    // ========================================================================
    if (action === 'exchange_token') {
      // Exchange public token for access token
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token,
      })

      const accessToken = exchangeResponse.data.access_token
      const itemId = exchangeResponse.data.item_id

      // Get institution info
      const itemResponse = await plaidClient.itemGet({ access_token: accessToken })
      const institutionId = itemResponse.data.item.institution_id

      let institutionName = 'Unknown Bank'
      if (institutionId) {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
        })
        institutionName = instResponse.data.institution.name
      }

      // Store connection in database
      const { data: connection, error: connError } = await supabaseClient
        .from('plaid_connections')
        .insert({
          chapter_id,
          institution_name: institutionName,
          institution_id: institutionId,
          access_token: accessToken,
          item_id: itemId,
          created_by: user.id,
        })
        .select()
        .single()

      if (connError) throw connError

      return new Response(
        JSON.stringify({
          success: true,
          connection_id: connection.id,
          institution_name: institutionName
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // ACTION: sync_transactions
    // Syncs transactions from Plaid to staging table
    // ========================================================================
    if (action === 'sync_transactions') {
      // Get connection
      const { data: connection, error: connError } = await supabaseClient
        .from('plaid_connections')
        .select('*')
        .eq('id', connection_id)
        .eq('chapter_id', chapter_id)
        .single()

      if (connError || !connection) {
        throw new Error('Connection not found')
      }

      // Create sync history record
      const { data: syncHistory, error: syncError } = await supabaseClient
        .from('plaid_sync_history')
        .insert({
          connection_id: connection.id,
          chapter_id: connection.chapter_id,
          cursor_before: connection.cursor,
          sync_status: 'running',
        })
        .select()
        .single()

      if (syncError) throw syncError

      try {
        // Sync transactions using Plaid's transactions/sync endpoint
        const syncRequest = {
          access_token: connection.access_token,
          ...(connection.cursor ? { cursor: connection.cursor } : {}),
        }

        const syncResponse = await plaidClient.transactionsSync(syncRequest)

        const { added, modified, removed, next_cursor } = syncResponse.data
        let insertedCount = 0
        let modifiedCount = 0

        // Insert new transactions into staging
        for (const txn of added) {
          const hash = await computeTxnHash(
            txn.transaction_id,
            'PLAID',
            txn.date,
            txn.amount,
            txn.name
          )

          const { error: insertError } = await supabaseClient
            .from('plaid_txn_staging')
            .insert({
              chapter_id: connection.chapter_id,
              source: 'PLAID',
              external_id: txn.transaction_id,
              date: txn.date,
              amount: -txn.amount, // Plaid uses negative for debits, we use positive
              description: txn.name,
              raw_data: txn,
              hash,
              status: 'new',
            })

          // Skip if duplicate (idempotency constraint)
          if (!insertError || insertError.code === '23505') {
            if (!insertError) insertedCount++
          } else {
            console.error('Error inserting transaction:', insertError)
          }
        }

        // Handle modified transactions
        for (const txn of modified) {
          const hash = await computeTxnHash(
            txn.transaction_id,
            'PLAID',
            txn.date,
            txn.amount,
            txn.name
          )

          // Update or insert
          const { error: upsertError } = await supabaseClient
            .from('plaid_txn_staging')
            .upsert({
              chapter_id: connection.chapter_id,
              source: 'PLAID',
              external_id: txn.transaction_id,
              date: txn.date,
              amount: -txn.amount,
              description: txn.name,
              raw_data: txn,
              hash,
              status: 'new',
            }, {
              onConflict: 'source,external_id,chapter_id'
            })

          if (!upsertError) modifiedCount++
        }

        // Update connection cursor and last_synced_at
        await supabaseClient
          .from('plaid_connections')
          .update({
            cursor: next_cursor,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', connection.id)

        // Update sync history
        await supabaseClient
          .from('plaid_sync_history')
          .update({
            transactions_added: insertedCount,
            transactions_modified: modifiedCount,
            transactions_removed: removed.length,
            cursor_after: next_cursor,
            sync_status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncHistory.id)

        return new Response(
          JSON.stringify({
            success: true,
            added: insertedCount,
            modified: modifiedCount,
            removed: removed.length,
            has_more: syncResponse.data.has_more,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (syncError) {
        // Update sync history with error
        await supabaseClient
          .from('plaid_sync_history')
          .update({
            sync_status: 'failed',
            error_message: syncError.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncHistory.id)

        throw syncError
      }
    }

    // ========================================================================
    // ACTION: sync_all
    // Syncs all active connections for a chapter (for scheduled jobs)
    // ========================================================================
    if (action === 'sync_all') {
      const { data: connections } = await supabaseClient
        .from('plaid_connections')
        .select('id, chapter_id')
        .eq('chapter_id', chapter_id)
        .eq('is_active', true)

      const results = []
      for (const conn of connections || []) {
        try {
          // Recursively call sync_transactions
          const syncReq = await fetch(req.url, {
            method: 'POST',
            headers: req.headers,
            body: JSON.stringify({
              action: 'sync_transactions',
              connection_id: conn.id,
              chapter_id: conn.chapter_id,
            })
          })
          const syncResult = await syncReq.json()
          results.push({ connection_id: conn.id, ...syncResult })
        } catch (err) {
          results.push({ connection_id: conn.id, error: err.message })
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // ACTION: get_connections
    // Gets all Plaid connections for a chapter
    // ========================================================================
    if (action === 'get_connections') {
      const { data: connections } = await supabaseClient
        .from('plaid_connections')
        .select('id, institution_name, last_synced_at, is_active, created_at, error_message')
        .eq('chapter_id', chapter_id)
        .order('created_at', { ascending: false })

      return new Response(
        JSON.stringify({ connections }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ========================================================================
    // ACTION: deactivate_connection
    // Deactivates a Plaid connection
    // ========================================================================
    if (action === 'deactivate_connection') {
      await supabaseClient
        .from('plaid_connections')
        .update({ is_active: false })
        .eq('id', connection_id)
        .eq('chapter_id', chapter_id)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
