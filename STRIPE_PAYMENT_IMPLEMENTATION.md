# Stripe Payment Collection - Implementation Guide

## 📋 Overview

This document outlines the complete implementation of online dues collection via Stripe for Greek Pay. Members can pay dues with ACH bank transfer ($0.80 fee) or credit card (2.9% + $0.30).

**Status:** Backend Complete ✅ | Frontend Components Pending

---

## ✅ What's Been Built

### 1. Database Layer
**File:** `supabase/migrations/20250115000001_payment_processing.sql`

**Tables Created:**
- `stripe_connected_accounts` - Chapter Stripe accounts
- `payment_intents` - Payment sessions/attempts
- `dues_payments` - Enhanced with Stripe fields

**Functions Created:**
- `record_dues_payment()` - Records payment and updates balance
- `get_chapter_payment_summary()` - Payment analytics

**Security:** Row Level Security (RLS) policies for all tables

### 2. Edge Functions
**Location:** `supabase/functions/`

#### A) `stripe-connect/` - Stripe Account Management
Actions:
- `create_account` - Create chapter's Stripe Connected Account
- `create_account_link` - Generate onboarding URL
- `check_status` - Check onboarding completion
- `refresh_account` - Refresh account data

#### B) `create-payment-intent/` - Payment Processing
- Creates Stripe Payment Intent
- Supports ACH and card payments
- Handles platform fees
- Stores intent in database

#### C) `stripe-webhook/` - Webhook Handler
Handles events:
- `payment_intent.succeeded` - Mark payment complete
- `payment_intent.payment_failed` - Handle failures
- `payment_intent.canceled` - Handle cancellations
- `account.updated` - Update account status

### 3. Frontend Services
**File:** `src/services/paymentService.ts`

Complete service with methods for:
- Stripe account management
- Payment intent creation
- Payment history
- Payment summaries
- Utility formatters

**File:** `src/services/types.ts`

Added types:
- `StripeConnectedAccount`
- `PaymentIntent`
- `DuesPaymentOnline`
- `StripeConnectResponse`
- `CreatePaymentIntentResponse`
- `PaymentSummary`

---

## 🚧 Next Steps: Frontend Components

### Component 1: Payments Settings Page

**File:** `src/components/PaymentsSettings.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { PaymentService } from '../services/paymentService';
import { StripeConnectedAccount } from '../services/types';
import { useChapter } from '../context/ChapterContext';
import toast from 'react-hot-toast';

export const PaymentsSettings: React.FC = () => {
  const { currentChapter } = useChapter();
  const [stripeAccount, setStripeAccount] = useState<StripeConnectedAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    loadStripeAccount();
  }, [currentChapter]);

  const loadStripeAccount = async () => {
    if (!currentChapter) return;

    try {
      setChecking(true);
      const account = await PaymentService.getStripeAccount(currentChapter.id);
      setStripeAccount(account);

      // If account exists but onboarding not complete, check status
      if (account && !account.onboarding_completed) {
        const status = await PaymentService.checkStripeAccountStatus(currentChapter.id);
        if (status.onboarding_completed) {
          // Refresh to get updated account
          const updated = await PaymentService.getStripeAccount(currentChapter.id);
          setStripeAccount(updated);
        }
      }
    } catch (error) {
      console.error('Error loading Stripe account:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleConnectStripe = async () => {
    if (!currentChapter) return;

    setLoading(true);
    try {
      const result = await PaymentService.createStripeAccount(currentChapter.id);

      if (result.onboarding_url) {
        // Redirect to Stripe onboarding
        window.location.href = result.onboarding_url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect Stripe');
      setLoading(false);
    }
  };

  const handleRefreshAccount = async () => {
    if (!currentChapter) return;

    setLoading(true);
    try {
      await PaymentService.refreshStripeAccount(currentChapter.id);
      await loadStripeAccount();
      toast.success('Account status refreshed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh account');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Processing</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Enable online dues collection with Stripe
        </p>
      </div>

      {!stripeAccount || !stripeAccount.onboarding_completed ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Enable Online Dues Collection</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Connect your chapter's bank account to start collecting dues online.
            Members can pay with bank transfer (ACH) or credit card.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">ACH (Bank Transfer)</p>
              <p className="text-2xl font-bold text-green-600">$0.80</p>
              <p className="text-xs text-gray-500">flat fee per transaction</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded">
              <p className="text-sm text-gray-600 dark:text-gray-400">Credit Card</p>
              <p className="text-2xl font-bold text-blue-600">2.9% + $0.30</p>
              <p className="text-xs text-gray-500">per transaction</p>
            </div>
          </div>

          <button
            onClick={handleConnectStripe}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Connecting...' : '🚀 Connect Stripe Account (2 minutes)'}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                ✅ Payment Processing Active
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your chapter can now accept online dues payments!
              </p>
            </div>
            <button
              onClick={handleRefreshAccount}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Refresh Status
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Charges Enabled</p>
              <p className="font-semibold">{stripeAccount.charges_enabled ? '✅ Yes' : '❌ No'}</p>
            </div>
            <div>
              <p className="text-gray-500">Payouts Enabled</p>
              <p className="font-semibold">{stripeAccount.payouts_enabled ? '✅ Yes' : '❌ No'}</p>
            </div>
            <div>
              <p className="text-gray-500">Bank Linked</p>
              <p className="font-semibold">{stripeAccount.has_bank_account ? '✅ Yes' : '❌ No'}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded">
            <h4 className="font-medium mb-2">Account Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Account ID:</span>
                <span className="font-mono text-gray-900 dark:text-white">{stripeAccount.stripe_account_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Type:</span>
                <span className="font-medium">{stripeAccount.stripe_account_type}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="font-semibold mb-3">How It Works</h3>
        <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>1. Connect your chapter's Stripe account (one-time setup)</li>
          <li>2. Link your chapter's bank account through Stripe</li>
          <li>3. Members can pay dues online with ACH or card</li>
          <li>4. Money is deposited directly to your bank in 2-5 business days</li>
          <li>5. Payments are automatically recorded in Greek Pay</li>
        </ol>
      </div>
    </div>
  );
};
```

**Integration:**
Add to `src/pages/Settings.tsx` as a new tab:
```typescript
<Tab name="Payments">
  <PaymentsSettings />
</Tab>
```

### Component 2: Member Payment Modal

**File:** `src/components/MemberPaymentModal.tsx`

```typescript
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { PaymentService } from '../services/paymentService';
import { MemberDuesSummary } from '../services/types';
import toast from 'react-hot-toast';

// Initialize Stripe (do this outside component to avoid recreating)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface MemberPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberDues: MemberDuesSummary;
  onSuccess: () => void;
}

export const MemberPaymentModal: React.FC<MemberPaymentModalProps> = ({
  isOpen,
  onClose,
  memberDues,
  onSuccess
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'us_bank_account' | 'card'>('us_bank_account');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleStartPayment = async () => {
    setLoading(true);
    try {
      const result = await PaymentService.createPaymentIntent(
        memberDues.id,
        paymentMethod
      );

      if (result.client_secret) {
        setClientSecret(result.client_secret);
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const achFee = 0.80;
  const cardFee = (memberDues.balance * 0.029) + 0.30;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Pay Your Dues</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Amount Due:
          </p>
          <p className="text-3xl font-bold text-red-600">
            ${memberDues.balance.toFixed(2)}
          </p>
        </div>

        {!clientSecret ? (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Choose Payment Method</h3>

              <div className="space-y-2">
                <button
                  onClick={() => setPaymentMethod('us_bank_account')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    paymentMethod === 'us_bank_account'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Bank Account (ACH)</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">3-5 business days</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${achFee.toFixed(2)} fee</p>
                      <p className="text-xs text-gray-500">Recommended</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    paymentMethod === 'card'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Credit/Debit Card</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Instant</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">${cardFee.toFixed(2)} fee</p>
                      <p className="text-xs text-gray-500">2.9% + $0.30</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={handleStartPayment}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Continue to Payment'}
            </button>
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: 'stripe' }
            }}
          >
            <PaymentForm
              clientSecret={clientSecret}
              amount={memberDues.balance}
              onSuccess={() => {
                onSuccess();
                onClose();
              }}
            />
          </Elements>
        )}
      </div>
    </div>
  );
};

// Separate component for Stripe Elements (must be inside Elements provider)
const PaymentForm: React.FC<{
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
}> = ({ clientSecret, amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dues/payment-complete`,
      },
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setProcessing(false);
    } else {
      toast.success('Payment submitted successfully!');
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
      >
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Powered by Stripe • Secure payment processing
      </p>
    </form>
  );
};
```

### Component 3: Update Member Dashboard

**File:** `src/components/MemberDashboard.tsx`

Add payment button to existing dues display:

```typescript
import { MemberPaymentModal } from './MemberPaymentModal';

// Inside component:
const [showPaymentModal, setShowPaymentModal] = useState(false);

// In the render:
{myDues && myDues.balance > 0 && (
  <>
    <button
      onClick={() => setShowPaymentModal(true)}
      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold text-lg"
    >
      💳 Pay ${myDues.balance.toFixed(2)} Now
    </button>

    <MemberPaymentModal
      isOpen={showPaymentModal}
      onClose={() => setShowPaymentModal(false)}
      memberDues={myDues}
      onSuccess={() => {
        // Reload dues data
        loadMyDues();
        toast.success('Payment successful!');
      }}
    />
  </>
)}
```

---

## 🚀 Deployment Steps

### 1. Set Up Stripe Account

1. **Create Stripe Account:**
   - Go to https://dashboard.stripe.com/register
   - Complete business profile

2. **Enable Connect:**
   - Dashboard → Settings → Connect
   - Select "Platform or marketplace"

3. **Get API Keys:**
   - Dashboard → Developers → API keys
   - Copy both Test and Live keys

### 2. Configure Supabase Secrets

```bash
# Set Stripe keys (use test keys for development)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PLATFORM_FEE_PERCENTAGE=1.0
supabase secrets set FRONTEND_URL=https://yourapp.com
```

### 3. Deploy Database Migration

```bash
cd /Users/joe/Desktop/Projects/FMM
supabase db push
```

Or manually run in Supabase SQL Editor:
```sql
-- Copy contents of supabase/migrations/20250115000001_payment_processing.sql
```

### 4. Deploy Edge Functions

```bash
# Deploy all three functions
supabase functions deploy stripe-connect
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook
```

### 5. Set Up Stripe Webhook

1. **Get Webhook Endpoint URL:**
   ```
   https://<your-project>.supabase.co/functions/v1/stripe-webhook
   ```

2. **Add Webhook in Stripe Dashboard:**
   - Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Enter webhook URL
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `payment_intent.processing`
     - `account.updated`
   - Copy webhook signing secret

3. **Update Secret:**
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 6. Configure Frontend Environment

Add to `.env`:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 7. Install Stripe Dependencies

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

---

## 🧪 Testing

### Test Mode (Stripe Test Keys)

1. **Connect Test Account:**
   - Use test API keys
   - Treasurer clicks "Connect Stripe"
   - Uses Stripe test data

2. **Test Payment Flow:**
   - Member navigates to dues
   - Clicks "Pay Now"
   - **For ACH (Test):**
     - Account: 000123456789
     - Routing: 110000000
   - **For Card (Test):**
     - Card: 4242 4242 4242 4242
     - Exp: Any future date
     - CVC: Any 3 digits

3. **Verify:**
   - Payment shows as "Processing" → "Completed"
   - Member dues balance updates
   - Payment appears in dues_payments table
   - Webhook events received

### Production Testing

1. **Switch to Live Keys:**
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   ```

2. **Real Bank Account:**
   - Connect actual chapter bank account
   - Test with small amount ($0.50)

3. **Monitor:**
   - Stripe Dashboard → Payments
   - Supabase logs
   - Database payments table

---

## 📊 Monitoring & Analytics

### Stripe Dashboard
- View all payments
- See failed payments
- Monitor payouts to bank
- Download reports

### Greek Pay Analytics
```sql
-- Payment summary
SELECT * FROM get_chapter_payment_summary('chapter-uuid', 'Fall 2025');

-- Recent payments
SELECT * FROM dues_payments
WHERE chapter_id = 'chapter-uuid'
ORDER BY payment_date DESC
LIMIT 20;

-- Payment success rate
SELECT
  COUNT(*) FILTER (WHERE status = 'succeeded') * 100.0 / COUNT(*) as success_rate
FROM payment_intents
WHERE chapter_id = 'chapter-uuid'
AND created_at > NOW() - INTERVAL '30 days';
```

---

## 🔒 Security Notes

1. **Never expose Stripe secret keys in frontend**
   - Only use publishable keys in React
   - All secret operations in Edge Functions

2. **Verify webhook signatures**
   - Webhook handler validates Stripe signature
   - Prevents fake payment notifications

3. **RLS policies protect data**
   - Members see only their payments
   - Admins see only their chapter's data

4. **PCI Compliance**
   - Stripe handles all card data
   - App never stores card numbers
   - Stripe Elements are PCI compliant

---

## 💰 Revenue Model (Optional)

Platform fee is configurable:
```bash
supabase secrets set STRIPE_PLATFORM_FEE_PERCENTAGE=1.0
```

**Example:**
- Member pays $800 dues
- Stripe charges $0.80 ACH fee
- Platform fee: $800 × 1% = $8.00
- Chapter receives: $800 - $0.80 - $8.00 = $791.20
- You earn: $8.00 per payment

**Annual Revenue (100 chapters × 2 semesters × 50 members × 1%):**
- 100 × 2 × 50 × $800 × 0.01 = **$80,000/year**

---

## 📝 Next Actions

1. ✅ **Backend Complete** - All Edge Functions and database ready
2. ⏳ **Add PaymentsSettings component** to Settings page
3. ⏳ **Create MemberPaymentModal** component
4. ⏳ **Update MemberDashboard** with payment button
5. ⏳ **Install Stripe npm packages**
6. ⏳ **Deploy to production**
7. ⏳ **Test with real bank account**
8. ⏳ **Launch to first beta chapter**

---

## 🎯 Success Metrics

After launch, track:
- **Payment collection rate**: Target 95%+ (vs 70% manual)
- **Time saved**: Treasurer saves 5-10 hours/semester
- **Payment speed**: Average 2 minutes (vs 2-3 days for Venmo)
- **Member satisfaction**: Survey NPS score
- **Revenue**: Platform fees collected

---

## 🆘 Troubleshooting

### "Chapter has not set up payment processing"
- Chapter hasn't completed Stripe onboarding
- Redirect treasurer to Settings → Payments

### "Webhook signature verification failed"
- Wrong webhook secret
- Update: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

### Payment succeeded but dues not updated
- Check webhook logs in Supabase
- Verify RLS policies
- Check `payment_intents` and `dues_payments` tables

### "Payment failed"
- Check Stripe Dashboard for error details
- ACH: Insufficient funds or invalid account
- Card: Declined, expired, or invalid

---

## 📚 Additional Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Stripe React Elements](https://stripe.com/docs/stripe-js/react)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Implementation Date:** 2025-01-15
**Status:** Backend Complete ✅ | Frontend In Progress ⏳
**Estimated Completion:** 2-3 days for frontend components
