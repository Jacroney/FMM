# FMM - Dues Collection System (Final Sprint)

**DEADLINE**: 2 days until dues go out

## Priority Focus Areas (In Order)

1. **Dues Collection** - Member receives email, clicks link, pays dues
2. **Stripe Sync** - Payments process correctly, balances update, receipts send
3. **Member Dashboard** - Members can view/pay dues, see history

**NOT A PRIORITY**: Budget tools, treasurer analytics, Plaid integration

---

## Critical Path: Dues Collection Flow

```
Treasurer assigns dues → Member gets invitation email → Member clicks link
→ Signs up (if new) → Views dues balance → Pays via Stripe
→ Webhook fires → Payment recorded → Balance updates → Confirmation email
```

---

## Known Issues to Fix

### CRITICAL (Must Fix Before Launch)

1. **Hardcoded localhost URL** - `supabase/functions/send-dues-invitation/index.ts:147`
   ```typescript
   // CURRENTLY: localhost for testing
   const frontendUrl = 'http://localhost:5173'
   // PRODUCTION (switch before launch):
   const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://greekpay.org'
   ```
   **Production URL**: `https://greekpay.org`

2. **Environment Variables** - Must be set in Supabase Secrets:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `FRONTEND_URL`

3. **Stripe Webhook** - Must configure in Stripe Dashboard:
   - URL: `https://ffgeptjhhhifuuhjlsow.supabase.co/functions/v1/stripe-webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `payment_intent.processing`, `account.updated`

4. **Cron Jobs** - Must be enabled in Supabase:
   - `process-overdue-dues` - midnight UTC daily
   - `send-payment-reminders` - 2 PM UTC daily
   - `process-email-queue` - every few minutes

---

## Key Files Reference

### Edge Functions (supabase/functions/)
| File | Purpose |
|------|---------|
| `send-dues-invitation/index.ts` | Sends email invitations to members |
| `create-payment-intent/index.ts` | Creates Stripe payment intents |
| `stripe-webhook/index.ts` | Handles Stripe webhook events |
| `stripe-connect/index.ts` | Chapter Stripe account setup |
| `process-email-queue/index.ts` | Sends queued emails |
| `process-overdue-dues/index.ts` | Marks overdue, applies late fees |
| `send-payment-reminders/index.ts` | 7-day reminder emails |

### Frontend Components (src/components/)
| File | Purpose |
|------|---------|
| `MemberDashboard.tsx` | Member portal - dues view and payment |
| `StripeCheckoutModal.tsx` | Payment UI with card/ACH options |
| `PayDuesButton.tsx` | Payment action button |
| `DuesManagementSection.tsx` | Treasurer dues admin |
| `StripeConnectSetup.tsx` | Chapter Stripe onboarding |

### Services (src/services/)
| File | Purpose |
|------|---------|
| `paymentService.ts` | Stripe API calls, fee calculations |
| `duesService.ts` | Dues CRUD, assignment, stats |

### Database
| Table | Purpose |
|-------|---------|
| `member_dues` | Individual dues assignments |
| `dues_payments` | Payment records |
| `payment_intents` | Stripe payment tracking |
| `dues_configuration` | Period and fee settings |
| `email_queue` | Pending emails |
| `member_dues_summary` (VIEW) | Aggregated dues data |

---

## Fee Structure

**ACH (Bank Transfer)**:
- Stripe: 0.8% capped at $5
- Platform: 1%
- **Member pays**: Just dues (NO fees)
- **Chapter receives**: Dues - Stripe fee - Platform fee

**Card**:
- Stripe: 2.9% + $0.30
- Platform: 1%
- **Member pays**: Dues + Stripe fee
- **Chapter receives**: Dues - Platform fee (1%)

---

## Testing Checklist Before Launch

### Treasurer Flow
- [ ] Create dues configuration for current period
- [ ] Auto-assign dues to all active members
- [ ] Send invitation emails (verify they arrive with correct links)
- [ ] View dues statistics

### Member Flow
- [ ] Receive invitation email
- [ ] Click link and sign up (new member)
- [ ] View dashboard with dues balance
- [ ] Pay with card - verify fees shown correctly
- [ ] Pay with ACH - verify "no fees" messaging
- [ ] Receive payment confirmation email
- [ ] Check payment history shows transaction

### Stripe Integration
- [ ] Webhook receives events (check Supabase logs)
- [ ] Payment intent status updates correctly
- [ ] Balance updates after payment
- [ ] Saved payment methods work
- [ ] Duplicate payment prevention works

### Error Handling
- [ ] Payment failure shows helpful message
- [ ] Expired session refreshes properly
- [ ] Member can't pay someone else's dues

---

## Quick Commands

```bash
# Deploy all edge functions
supabase functions deploy

# Check function logs
supabase functions logs send-dues-invitation --tail
supabase functions logs stripe-webhook --tail
supabase functions logs create-payment-intent --tail

# Test webhook locally
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Check Supabase secrets
supabase secrets list
```

---

## Database Quick Queries

```sql
-- Check recent payment intents
SELECT id, status, amount, stripe_fee, created_at
FROM payment_intents
ORDER BY created_at DESC LIMIT 10;

-- Check dues balances
SELECT first_name, last_name, total_amount, amount_paid, balance, status
FROM member_dues_summary
WHERE chapter_id = 'your-chapter-id';

-- Check email queue
SELECT * FROM email_queue
WHERE status = 'pending'
ORDER BY created_at DESC LIMIT 10;

-- Check pending invitations
SELECT email, first_name, status, invitation_token
FROM member_invitations
WHERE status = 'pending';
```
