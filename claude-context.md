Goal:
Build a functional “Dues System” that allows treasurers to assign dues by email, invite members to join a chapter, and let those members view and pay their balances through Stripe.

GreekPay already uses:

React + Vite + Tailwind (frontend)

Supabase (database + auth + RLS)

Stripe Connect (each chapter has its own connected account)

🧭 User Roles

Treasurer (Admin of a Chapter)

Can assign dues to members by email

Can view all dues and payment statuses

Can see total collected and unpaid amounts

Member

Gets an invite email to join the chapter

Signs up for a GreekPay account

Sees assigned dues and balance

Can pay dues via Stripe (ACH or card)

⚙️ Functional Flow
1️⃣ Treasurer Assigns Dues

Treasurer opens the “Dues” tab in the dashboard

Clicks “Assign Dues” → modal appears

Inputs: member email, amount, description, and due date

On submit:

Insert a record into member_dues_assignments table in Supabase

Send an invite email to that member’s email with a unique signup link

Example record:

id | chapter_id | email | amount | description | due_date | status | created_at

Initial status = 'pending_invite'.

2️⃣ Member Receives Invite & Signs Up

Email link example:
https://greekpay.app/invite?email=user@email.com&chapter_id=123&token=abc123

When clicked:

Member signs up via Supabase Auth

After signup, GreekPay links their new member_id to the corresponding dues assignment row

Status changes from pending_invite → unpaid

3️⃣ Member Dashboard

Members see a simple list of dues assignments:

Fall 2025 Dues – $800 – Unpaid – [Pay Now]
Spring Formal Fee – $100 – Paid ✅

A balance summary appears at the top (total unpaid amount).

Dues data is pulled with:

SELECT \* FROM member_dues_assignments WHERE member_id = current_user.id;

4️⃣ Member Pays via Stripe

When they click Pay Now, the app:

Calls the backend (create-payment-intent function)

Passes the dues_assignment_id and chapter’s stripe_account_id

Stripe creates a PaymentIntent:

transfer_data: { destination: chapter.stripe_account_id }

The member pays via card or ACH in a Stripe Checkout modal.

5️⃣ Payment Confirmation (Webhook)

When payment succeeds, Stripe sends a payment_intent.succeeded webhook.

Webhook handler finds the matching dues assignment using metadata:

dues_assignment_id

Updates that record’s status to paid

Inserts a row in dues_payments:

id | member_id | chapter_id | dues_assignment_id | stripe_payment_id | amount | status | paid_at

6️⃣ Treasurer Dashboard

Treasurers see:

Member Email Amount Status Paid At
John Smith john@email.com
$800 Paid ✅ Oct 17
Jack Miller jack@email.com
$800 Unpaid ❌ —

Totals are automatically aggregated:

Total Collected: $8,000
Outstanding: $2,400

🧾 Database Tables Involved
member_dues_assignments

Stores all dues assigned to members.

Column Type Description
id uuid PK
chapter_id uuid FK
member_id uuid FK (nullable until signup)
email text assigned email
amount numeric dues amount
description text description (e.g. Fall Dues)
due_date date optional
status text pending_invite / unpaid / paid
created_at timestamp default now()
dues_payments

Logs all successful payments.

Column Type Description
id uuid PK
member_id uuid FK
chapter_id uuid FK
dues_assignment_id uuid FK
stripe_payment_id text Stripe payment intent ID
amount numeric paid amount
status text succeeded / failed
paid_at timestamp date paid
members

Already exists — stores user info + role + chapter_id.

🧩 Key Stripe Integration Details

Use Stripe Connect Express accounts for each chapter.

When creating a payment intent:

{
amount: duesAmountInCents,
currency: "usd",
transfer_data: { destination: chapter.stripe_account_id },
metadata: { dues_assignment_id },
}

Webhook updates dues status and inserts payment record.

✅ MVP Feature Goals

Treasurer can assign dues to members via email.

Members receive an invite email → create account → see dues list.

Members can pay dues via Stripe Checkout.

Stripe webhook updates dues status in Supabase automatically.

Treasurer dashboard shows all payments and unpaid balances.
