# Platform Subscription Billing Guide

## Business Model Overview

Your platform has TWO separate payment flows:

### 1. Member → Chapter Dues Payments (Stripe Connect)
- **Members** pay dues to **their chapter**
- Money goes directly to chapter's bank account
- You never touch this money
- Chapter pays Stripe fees (2.9% + $0.30 for cards, $0.80 for ACH)
- ✅ **Already implemented**

### 2. Chapter → You Platform Subscription (Manual Invoicing)
- **Chapters** pay **you** to use the platform
- $500/year per chapter (annual subscription)
- Manual invoicing and payment collection
- This is YOUR revenue stream
- 📋 **This guide**

---

## Current Setup: Manual Invoicing

### Subscription Model
- **Price:** $500/year per chapter
- **Billing Cycle:** Annual
- **Trial Period:** 30 days free trial
- **Payment Methods:** Check, wire transfer, ACH (manual processing)

### When Chapters Sign Up

1. **Automatic Trial:**
   - All new chapters get 30-day free trial automatically
   - Trial starts on signup date
   - Full access to all features during trial

2. **Trial Expiration:**
   - System tracks expiration date
   - You'll get notifications for expiring trials
   - Chapter continues to have access (you control this)

### Manual Payment Workflow

#### Step 1: Generate Invoice (External)

Use your preferred invoicing tool:
- **Invoice Amount:** $500
- **Payment Terms:** Net 30 (or your preference)
- **Include:**
  - Chapter name and contact
  - Subscription period (e.g., "Jan 1, 2025 - Dec 31, 2025")
  - Payment instructions (where to send check/wire)
  - Invoice number for reference

Recommended tools:
- QuickBooks
- FreshBooks
- Wave (free)
- Simple Excel invoice template

#### Step 2: Record Payment in Platform

Once you receive payment, record it in the platform:

**Option A: Via Supabase SQL Editor**

```sql
-- Record a subscription payment
SELECT record_subscription_payment(
  p_chapter_id := '[chapter-uuid]'::UUID,
  p_amount := 500.00,
  p_payment_date := '2025-01-15'::DATE,
  p_payment_method := 'check', -- or 'wire', 'ach', 'cash'
  p_period_months := 12,
  p_reference_number := 'Check #1234', -- optional
  p_invoice_number := 'INV-2025-001', -- optional
  p_notes := 'Annual subscription 2025' -- optional
);
```

**Option B: Via Admin UI** (Coming soon - see Implementation section below)

This will:
- Record the payment
- Set subscription status to 'active'
- Set expiration date to 1 year from now
- Update chapter's last payment date

#### Step 3: Verify in Dashboard

Check the subscription was recorded correctly:

```sql
-- View all subscription statuses
SELECT * FROM subscription_status_summary;

-- View specific chapter
SELECT * FROM subscription_status_summary
WHERE chapter_name ILIKE '%[chapter-name]%';
```

### Monitoring Subscriptions

#### Check Expiring Subscriptions

```sql
-- Chapters expiring in next 30 days
SELECT
  chapter_name,
  subscription_end_date,
  days_until_expiration
FROM subscription_status_summary
WHERE status_alert = 'Expiring Soon'
ORDER BY subscription_end_date;
```

#### Check Expired Subscriptions

```sql
-- Expired subscriptions
SELECT
  chapter_name,
  subscription_end_date,
  days_until_expiration
FROM subscription_status_summary
WHERE status_alert = 'Expired'
ORDER BY subscription_end_date DESC;
```

#### Run Daily Expiration Check

```sql
-- Update any expired subscriptions
SELECT check_expired_subscriptions();
```

Set this up as a daily cron job in Supabase Dashboard.

### Payment Collection Tips

#### Best Practices

1. **Send Invoice 30 Days Before Expiration**
   - Gives chapters time to process payment
   - Send reminders at 30, 15, and 7 days before expiration

2. **Accept Multiple Payment Methods**
   - Checks (most common for organizations)
   - Wire transfers (faster)
   - ACH transfers (if you set up business banking)

3. **Follow Up Promptly**
   - Email reminder when trial expires
   - Call if payment is 15+ days overdue
   - Be professional but persistent

4. **Offer Payment Plans** (Optional)
   - $45/month instead of $500/year
   - Helps cash-strapped chapters
   - Record as monthly payments in system

#### Sample Email Templates

**Trial Ending Soon:**
```
Subject: [Chapter Name] - Trial ending in 7 days

Hi [Treasurer Name],

Your 30-day free trial of Greek Pay ends on [date]. We hope you've found the platform helpful for managing your chapter's finances!

To continue using Greek Pay, your annual subscription is $500. I've attached an invoice and payment instructions.

Benefits you'll keep:
- Automated dues collection with Stripe
- Real-time expense tracking
- Budget management
- Financial reporting
- And more!

Please let me know if you have any questions.

Best regards,
[Your Name]
```

**Payment Received:**
```
Subject: Payment Received - Thank you!

Hi [Treasurer Name],

Thank you! I've received your payment of $500 for Greek Pay.

Your subscription is now active through [expiration date].

If you need anything, just let me know!

Best regards,
[Your Name]
```

**Payment Overdue:**
```
Subject: Past Due Invoice - [Chapter Name]

Hi [Treasurer Name],

I wanted to follow up on invoice [#] for $500 which was due on [date].

Has this been processed? Please let me know if there are any issues or if you need a payment plan.

I'd hate to have to suspend your account, so please reach out!

Best regards,
[Your Name]
```

---

## Future: Automated Billing (Optional)

When you're ready to automate, you can:

### Option 1: Stripe Billing
- Create Stripe Billing subscriptions
- Automatic annual charges
- Automatic receipts and invoices
- Handles retries for failed payments

### Option 2: Stripe Checkout
- Send payment link to chapters
- One-time payment collection
- Less automation but simpler

### Implementation Plan
1. Keep current manual workflow
2. Once you have 10+ chapters, evaluate automation
3. Migrate existing subscriptions to Stripe Billing
4. Automatic renewals for new chapters

---

## Admin UI Implementation (Coming Soon)

### Recommended Admin Panel Features

**Subscription Dashboard:**
- List all chapters with subscription status
- Color-coded status (Active, Trial, Expiring, Expired)
- Quick actions (Record Payment, Send Invoice)
- Revenue analytics

**Record Payment Form:**
- Chapter selector
- Amount input
- Payment date
- Payment method dropdown
- Reference number (check #, etc.)
- Notes field
- Automatically calculates expiration date

**Notifications:**
- Email alerts for expiring subscriptions
- Dashboard badge showing expiring count
- Weekly digest of upcoming expirations

### Quick Implementation

Add to your Settings page or create new "Admin" section:

```tsx
// PlatformBillingAdmin.tsx component
// Lists all chapters with subscription status
// Button to record payment (opens modal)
// Shows revenue metrics
// Filters for trial/active/expired/expiring
```

### Database Queries You'll Need

```sql
-- For dropdown: List chapters needing payment
SELECT id, name, subscription_end_date
FROM chapters
WHERE subscription_status IN ('trial', 'expired')
  OR subscription_end_date < CURRENT_DATE + INTERVAL '30 days'
ORDER BY subscription_end_date;

-- After recording payment: Refresh subscription list
SELECT * FROM subscription_status_summary;

-- Revenue metrics
SELECT
  COUNT(*) as total_chapters,
  SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active_chapters,
  SUM(CASE WHEN subscription_status = 'trial' THEN 1 ELSE 0 END) as trial_chapters,
  SUM(CASE WHEN subscription_status = 'active' THEN subscription_amount ELSE 0 END) as arr
FROM chapters;
```

---

## Pricing Strategy

### Current: $500/year

**Pros:**
- Simple, straightforward
- One invoice per year
- Easy for chapters to budget

**Cons:**
- Large upfront cost
- Might lose price-sensitive chapters

### Alternative Pricing Models

**Monthly: $45/month ($540/year)**
- Easier for chapters to afford
- More cash flow throughout year
- More invoices to manage

**Per-Member: $2/member/month**
- Fairer for small chapters
- Scales with chapter size
- More complex billing

**Tiered:**
- Small (< 50 members): $300/year
- Medium (50-100): $500/year
- Large (100+): $750/year

**Freemium:**
- Basic features free
- Advanced features (Stripe integration, reports): $500/year
- Gets more chapters in the door

### Recommendation

Start with **$500/year flat fee**:
- ✅ Simple to manage manually
- ✅ Predictable revenue
- ✅ Easy for chapters to understand
- ✅ Can adjust later based on feedback

---

## Financial Projections

### Revenue Model

| Chapters | Annual Revenue | Monthly MRR |
|----------|---------------|-------------|
| 5        | $2,500        | $208        |
| 10       | $5,000        | $417        |
| 25       | $12,500       | $1,042      |
| 50       | $25,000       | $2,083      |
| 100      | $50,000       | $4,167      |

### Cost Structure

**Fixed Costs (Monthly):**
- Supabase Pro: ~$25/month
- Stripe fees: Minimal (only on dues, not your revenue)
- Domain/hosting: ~$10/month
- Total: ~$35/month

**Variable Costs:**
- Edge function calls (scales with usage)
- Database storage (scales with chapters)
- Support time (scales with chapters)

**Break-even:** ~5-10 chapters (covers your fixed costs)

---

## Checklist

- [ ] Run the subscription tracking migration
- [ ] Set trial periods for existing chapters
- [ ] Create invoice template
- [ ] Set up payment collection (bank account, checks)
- [ ] Document your invoicing workflow
- [ ] Set calendar reminders to check expirations monthly
- [ ] Send first invoice to a chapter
- [ ] Record first payment in system
- [ ] Verify subscription extended correctly
- [ ] Set up daily cron job for expiration checks
- [ ] Create email templates for common scenarios
- [ ] Consider building admin UI (when you have 5+ chapters)
- [ ] Evaluate automated billing (when you have 10+ chapters)

---

## Questions & Support

### Common Questions

**Q: Can chapters pay monthly instead of annually?**
A: Yes! Record 12 monthly payments of ~$42 instead of one $500 payment. Just call `record_subscription_payment` with `p_period_months := 1`

**Q: What if a chapter stops paying?**
A: Up to you! You can suspend access, give grace period, or work out payment plan.

**Q: How do I give a chapter a discount?**
A: Just record the discounted amount: `p_amount := 400.00` instead of 500

**Q: What if I want to change pricing?**
A: Update `subscription_amount` in chapters table. Affects future invoices, not current subscriptions.

**Q: Can I see my total revenue?**
A: Yes! `SELECT SUM(amount) FROM subscription_payments;`

---

**Remember:** The Stripe Connect implementation handles member dues payments automatically. This manual invoicing system is just for tracking what chapters pay YOU for platform access. Keep them separate!
