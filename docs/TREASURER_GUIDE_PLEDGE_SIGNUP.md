# Treasurer Guide: Pledge Signup & Manual Payment Tracking

This guide explains how to set up new pledges with dues assignments, send them signup links, and manually mark them as paid.

---

## Overview

The system allows you to:
1. Assign dues to pledges before they have accounts
2. Send them invitation emails with signup links
3. Manually record payments (cash, check, Venmo, etc.)
4. Track payment status automatically

---

## Step 1: Assign Dues to a New Pledge

1. **Navigate to Dues Management**
   - Go to the "Dues Management" section in your dashboard
   - Make sure you have an active dues configuration (if not, create one first)

2. **Click "Assign by Email"**
   - Find and click the "Assign by Email" button
   - This opens the dues assignment modal

3. **Fill in Pledge Information:**
   - **Member Email**: Enter the pledge's email address
   - **Amount**: Enter the dues amount (pre-filled with default from configuration)
   - **Due Date**: Set when payment is due (pre-filled from configuration)
   - **Instructions for Member**: This is important! Add custom instructions like:
     ```
     Welcome to Spring 2024 pledge class!

     After signing up:
     - Check your email for the GroupMe link
     - Attend orientation on Friday at 7 PM
     - Payment can be made in cash at weekly meetings
     - Contact me at treasurer@example.com with questions
     ```

4. **Send Email** (Recommended)
   - Keep the "Send invitation email" checkbox checked
   - This will send them a professional email with:
     - Dues amount and due date
     - Your custom instructions (prominently displayed)
     - Signup link
     - Next steps

5. **Click "Assign Dues"**
   - The system creates the dues assignment
   - Sends the invitation email automatically
   - The pledge will appear in your dues list with status "Pending Invite"

---

## Step 2: What the Pledge Sees

### Email Invitation
The pledge receives an email containing:
- Chapter name and GreekPay branding
- **Dues Amount** in large text with due date
- **Your custom instructions** in a highlighted yellow box
- **Next Steps** checklist:
  1. Create account
  2. Complete profile
  3. View dues balance
  4. Contact treasurer for payment
- **"Create Account & View Dues"** button with unique signup link

### Signup Page
When they click the link, they see:
- **Left side (desktop)**: All their dues information
  - Dues amount
  - Due date
  - Period name (e.g., "Spring 2024")
  - **Your instructions** prominently displayed
  - Next steps checklist

- **Right side**: Account creation form
  - Email (pre-filled)
  - Password
  - Full Name (required)
  - Phone Number (optional)
  - Year (optional dropdown)
  - Major (optional)

### After Signup
- Account is created automatically
- Dues are linked to their new account
- Status changes from "Pending Invite" to "Pending"
- They can view their balance in the dashboard
- You can now track their payment

---

## Step 3: Manually Record Payment

When a pledge pays you in person (cash, check, Venmo, etc.):

1. **Find the Pledge in Dues Management**
   - They should now appear in your dues list
   - Status will show "Pending" or "Partial" (if they've made a partial payment)

2. **Click "Record" Button**
   - Located in the Actions column next to their name
   - This opens the payment recording modal

3. **Fill in Payment Details:**
   - **Amount**: Enter the amount they paid (can be partial or full)
   - **Payment Method**: Select from:
     - Cash
     - Check
     - Venmo
     - Zelle
     - ACH
     - Credit Card
     - Other
   - **Payment Date**: Date payment was received (defaults to today)
   - **Reference #**: Optional (e.g., "Check #1234", "Venmo @username")
   - **Notes**: Optional (e.g., "Paid at weekly meeting")

4. **Click "Record Payment"**
   - Payment is recorded in the system
   - Balance is automatically updated
   - Status changes automatically:
     - If fully paid → Status: **"Paid"** ✅
     - If partially paid → Status: **"Partial"** 🔄
     - If nothing paid → Status: **"Pending"** ⏳

---

## Payment Tracking Features

### Automatic Status Updates
The system automatically tracks:
- **Total Amount**: What they owe
- **Amount Paid**: How much they've paid so far
- **Balance**: How much they still owe
- **Status**: Updated automatically based on balance
- **Paid Date**: Set automatically when fully paid

### Multiple Payments
You can record multiple payments for one pledge:
- Example: They pay $50 now, $50 later
- Each payment is tracked separately
- Balance updates automatically after each payment

### Payment History
All payments are recorded with:
- Date and time
- Amount
- Payment method
- Who recorded it (your account)
- Reference numbers and notes

---

## Common Scenarios

### Scenario 1: Pledge Pays Full Amount Immediately
1. Assign dues and send invitation
2. They create their account
3. They pay you $300 in cash
4. You click "Record" and enter:
   - Amount: $300
   - Method: Cash
   - Date: Today
5. Status automatically changes to "Paid" ✅

### Scenario 2: Pledge Makes Partial Payments
1. Assign dues for $300
2. They create account and pay $100
3. You record $100 payment → Status: "Partial", Balance: $200
4. Next week they pay another $100
5. You record $100 payment → Status: "Partial", Balance: $100
6. Finally they pay last $100
7. You record $100 payment → Status: "Paid", Balance: $0 ✅

### Scenario 3: Multiple Pledges at Once
1. Use "Assign by Email" for each pledge
2. Keep "Send invitation email" checked for all
3. Each gets their own unique signup link
4. Track each pledge's payments individually

---

## Tips for Success

### Writing Good Instructions
In the "Instructions for Member" field, include:
- **Welcome message**: Make them feel included
- **Important dates**: Meetings, events, deadlines
- **Payment options**: How and where to pay
- **Next steps**: What to do after signing up
- **Contact info**: How to reach you with questions

**Example:**
```
Welcome to our Spring 2024 pledge class! 🎉

IMPORTANT INFO:
- Orientation: Friday, Feb 2 at 7 PM in Student Center Room 301
- GroupMe link will be sent separately to your email
- Payment accepted: Cash, Venmo (@treasurerhandle), or Check

PAYMENT SCHEDULE:
- First payment ($150): Due by Feb 15
- Second payment ($150): Due by Mar 15

Questions? Text me at (555) 123-4567 or email treasurer@chapter.com
```

### Keeping Track
- Check your dues management page regularly
- Use the "Pending" filter to see who hasn't paid
- Use the "Overdue" filter after due dates pass
- Record payments promptly to keep accurate records

### Communication
- The invitation email includes all key information
- Pledges can always log in to see their balance
- They can see their payment history in their dashboard
- If they lose the link, you can resend the invitation

---

## Troubleshooting

### "They never received the email"
- Check spam/junk folders
- Verify email address is correct
- You can get the signup link from the dues list:
  - Click on the pledge's row to see details
  - Share the invitation URL directly

### "They already created an account but dues aren't showing"
- Have them sign out and click the invitation link again
- The system will link their existing account to the dues

### "They paid but I can't click Record"
- Make sure they've signed up first (status not "Pending Invite")
- In demo mode, Record button is disabled
- Check that their balance isn't already $0

### "I entered the wrong amount"
- Currently, you'll need to contact the system admin to correct
- Future versions will allow payment editing/deletion
- Be careful when entering amounts!

---

## Summary Checklist

For each new pledge:
- [ ] Create dues configuration (one-time setup)
- [ ] Click "Assign by Email"
- [ ] Enter email, amount, due date
- [ ] **Write clear instructions** in the Instructions field
- [ ] Keep "Send invitation email" checked
- [ ] Click "Assign Dues"
- [ ] Wait for pledge to sign up (status changes from "Pending Invite" to "Pending")
- [ ] When they pay, click "Record"
- [ ] Enter payment details
- [ ] Verify balance and status updated correctly

---

## Need Help?

If you encounter any issues:
1. Check this guide first
2. Ask other officers who have used the system
3. Contact technical support
4. Submit feedback to help improve the system

---

**System Status:** ✅ All features tested and working
**Last Updated:** 2025-10-30
**Version:** 1.0
