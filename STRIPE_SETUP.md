# Stripe Payment Integration Setup Guide

This guide covers setting up Stripe payment processing for dues collection in the Greek Pay application.

## Overview

The Stripe integration allows chapters to:
- Accept credit/debit card payments (2.9% + $0.30 per transaction)
- Accept ACH/bank account payments ($0.80 flat fee per transaction)
- Automatically track and reconcile payments
- Receive funds directly to their bank account

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Admin/Treasurer access to your chapter
3. Chapter's EIN (Tax ID) and bank account information

## Step 1: Get Stripe API Keys

### For Development (Test Mode)

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### For Production (Live Mode)

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_live_`)
3. Copy your **Secret key** (starts with `sk_live_`)

## Step 2: Configure Environment Variables

### Frontend (.env)

Add to your `.env` file:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

For production, replace with your live publishable key.

### Backend (Supabase Secrets)

Set secrets in Supabase CLI:

```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY="sk_test_your_secret_key_here"

# Set webhook secret (see Step 3)
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Optional: Set platform fee percentage (0-100)
supabase secrets set STRIPE_PLATFORM_FEE_PERCENTAGE="0"
```

Or via Supabase Dashboard:
1. Go to Project Settings → Edge Functions → Secrets
2. Add the secrets listed above

## Step 3: Deploy Edge Functions

Deploy the Stripe-related edge functions:

```bash
# Deploy all functions at once
supabase functions deploy stripe-connect
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook

# Or deploy all functions
supabase functions deploy
```

## Step 4: Set Up Stripe Webhooks

Webhooks are crucial for receiving payment confirmations from Stripe.

### Development (Local Testing)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Forward webhooks to your local development:
   ```bash
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```
3. Copy the webhook signing secret (starts with `whsec_`) and update your secrets

### Production

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://[your-project-ref].supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `payment_intent.processing`
   - `account.updated`
5. Copy the webhook signing secret
6. Update your Supabase secrets with the webhook secret

## Step 5: Run Database Migrations

Apply the Stripe-related migrations:

```bash
# Apply all pending migrations
supabase db push

# Or apply specific migrations
supabase migration up
```

The migrations will create:
- `stripe_connected_accounts` table
- `payment_intents` table
- Updates to `dues_payments` table
- Helper functions for payment processing

## Step 6: Chapter Setup (Treasurer)

### For Treasurers:

1. Log in to the application
2. Navigate to **Dues** → **Dues Management** tab
3. Look for the "Online Payment Setup" section
4. Click "Start Stripe Setup"
5. You'll be redirected to Stripe to complete onboarding:
   - Provide chapter's legal information
   - Add bank account for deposits
   - Verify authorized officer information
6. Complete the Stripe onboarding process
7. Return to Greek Pay - the system will automatically detect completion

### What You'll Need:
- Chapter's legal name and EIN (Tax ID)
- Bank account and routing number
- Authorized officer's personal information (name, DOB, SSN)
- Chapter's physical address

## Step 7: Testing Payment Flow

### Test Card Numbers (Test Mode Only)

Use these test cards in test mode:

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Exp: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Declined Card:**
- Card: `4000 0000 0000 0002`

**Insufficient Funds:**
- Card: `4000 0000 0000 9995`

**For ACH/Bank Account Testing:**
- Routing: `110000000`
- Account: `000123456789`

### Testing Workflow:

1. **As Admin/Treasurer:**
   - Complete Stripe Connect setup
   - Create a dues configuration
   - Assign dues to members
   - Verify online payments are enabled

2. **As Member:**
   - View your dues balance
   - Click "Pay" button
   - Complete payment with test card
   - Verify payment success page
   - Check payment appears in history

3. **Verify in Stripe Dashboard:**
   - Go to https://dashboard.stripe.com/test/payments
   - Confirm payment appears
   - Check transfer to connected account

## Troubleshooting

### "Online payments are not set up"

**Solution:**
- Ensure treasurer has completed Stripe Connect onboarding
- Verify `onboarding_completed` and `charges_enabled` are true
- Check Stripe account status in dashboard

### "Failed to create payment intent"

**Solutions:**
- Check `STRIPE_SECRET_KEY` is set correctly in Supabase secrets
- Verify edge functions are deployed
- Check browser console for detailed error messages
- Ensure member has an outstanding balance

### Webhook Events Not Received

**Solutions:**
- Verify webhook URL is correct
- Check `STRIPE_WEBHOOK_SECRET` is set in Supabase
- View webhook logs in Stripe Dashboard → Webhooks
- Test webhook endpoint: `curl -X POST [your-webhook-url]`

### Payments Not Updating in Database

**Solutions:**
- Check webhook events are being received
- Review edge function logs: `supabase functions logs stripe-webhook`
- Verify `record_dues_payment` function exists in database
- Check RLS policies allow inserting payments

## Production Checklist

Before going live with real payments:

- [ ] Switch to live Stripe API keys
- [ ] Update `VITE_STRIPE_PUBLISHABLE_KEY` with live key
- [ ] Update `STRIPE_SECRET_KEY` in Supabase with live key
- [ ] Set up production webhook endpoint
- [ ] Update `STRIPE_WEBHOOK_SECRET` with production webhook secret
- [ ] Test with live bank account (use small amounts first)
- [ ] Complete Stripe account verification
- [ ] Review Stripe fee structure and payment timelines
- [ ] Set up email notifications for payment confirmations
- [ ] Train treasurers on the system
- [ ] Have support documentation ready for members

## Security Best Practices

1. **Never commit secrets to git**
   - API keys should only be in `.env` (not committed)
   - Use `.env.example` as template

2. **Use RLS policies**
   - Database tables have Row Level Security enabled
   - Members can only pay their own dues
   - Admins can view chapter payments

3. **Validate on server**
   - All payment validation happens in edge functions
   - Client-side is just UI

4. **Monitor for fraud**
   - Review Stripe Dashboard regularly
   - Set up Stripe Radar (fraud detection)
   - Monitor for unusual payment patterns

## Support Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe Support:** https://support.stripe.com
- **Supabase Docs:** https://supabase.com/docs
- **Project Issues:** [Your GitHub repo]

## Payment Flow Architecture

```
Member → PayDuesButton
  ↓
  → createPaymentIntent() → Edge Function
  ↓
  → Stripe Payment Intent Created
  ↓
  → StripeCheckoutModal (Stripe Elements)
  ↓
  → Member enters payment details
  ↓
  → Stripe processes payment
  ↓
  → Webhook notification → stripe-webhook edge function
  ↓
  → record_dues_payment() → Database update
  ↓
  → Member sees success/failure page
```

## Database Schema

### stripe_connected_accounts
Stores chapter Stripe Connect accounts for receiving payments.

### payment_intents
Tracks all Stripe payment intents created for dues payments.

### dues_payments
Records completed payments (both Stripe and manual/cash).
Links to `payment_intents` via `payment_intent_id`.

## File Structure

```
src/
├── components/
│   ├── StripeCheckoutModal.tsx    # Payment form with Stripe Elements
│   ├── PayDuesButton.tsx          # Initiates payment flow
│   ├── StripeConnectSetup.tsx     # Treasurer onboarding
│   ├── PaymentHistoryModal.tsx    # Shows payment history
│   └── DuesManagementSection.tsx  # Integrates all components
├── pages/
│   ├── PaymentSuccess.tsx         # Success confirmation page
│   └── PaymentFailure.tsx         # Error handling page
└── services/
    └── paymentService.ts          # API calls to edge functions

supabase/
├── functions/
│   ├── stripe-connect/            # Account setup
│   ├── create-payment-intent/     # Payment initiation
│   └── stripe-webhook/            # Payment confirmations
└── migrations/
    ├── *_create_stripe_payment_tables.sql
    └── *_add_stripe_columns_to_dues_payments.sql
```

## Next Steps

1. Complete Step 1-5 for initial setup
2. Have your treasurer complete Step 6
3. Test the payment flow with Step 7
4. Review the Production Checklist before launch
5. Monitor payments in both Greek Pay and Stripe Dashboard

---

**Need Help?** Contact your system administrator or open an issue in the project repository.
