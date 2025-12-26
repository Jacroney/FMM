# Greek Pay

A multi-tenant financial management platform for fraternity chapters, handling dues collection, payment processing, bank account synchronization, and budget tracking. Built as a production SaaS application serving real organizations.

## Technology Stack

### Frontend
- **React 18** with functional components and hooks
- **Vite** for fast builds and HMR
- **TypeScript** for type safety across the codebase
- **TailwindCSS** for utility-first styling with custom theme system
- **React Router v6** for client-side routing with protected routes

### Backend
- **Supabase** as the backend-as-a-service layer
- **PostgreSQL 17** for relational data storage
- **Deno Edge Functions** for serverless API endpoints and webhook handlers
- **Row-Level Security (RLS)** for multi-tenant data isolation

### Integrations
- **Stripe** for payment processing (Connect, Payment Intents, Webhooks)
- **Plaid** for bank account linking and transaction synchronization
- **Resend** for transactional email delivery

### Infrastructure
- **Vercel** for frontend hosting with edge network distribution
- **Supabase Cloud** for managed database and serverless functions
- **GitHub Actions** for CI/CD pipeline

---

## System Architecture

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|  React Frontend  |<--->|  Supabase Auth    |<--->|  PostgreSQL DB   |
|  (Vercel)        |     |  + Edge Functions |     |  (RLS-enabled)   |
|                  |     |                   |     |                  |
+------------------+     +-------------------+     +------------------+
         |                        |
         |                        |
         v                        v
+------------------+     +-------------------+
|                  |     |                   |
|  Stripe API      |     |  Plaid API        |
|  (Payments)      |     |  (Banking)        |
|                  |     |                   |
+------------------+     +-------------------+
```

The application follows a client-server architecture with event-driven patterns for payment and banking operations. The frontend communicates with Supabase for authentication and data, while edge functions handle third-party integrations that require server-side secrets.

---

## Integration Architecture

### Payment Processing (Stripe)

The payment system implements a platform payment model using Stripe Connect, allowing each chapter to receive funds directly while the platform collects fees.

**Payment Flow:**
1. Frontend requests a payment intent from an edge function
2. Edge function creates a Stripe PaymentIntent with calculated fees and transfer amounts
3. Frontend renders the Stripe Elements payment form
4. On submission, Stripe processes the payment asynchronously
5. Webhook receives `payment_intent.succeeded` or `payment_intent.failed` events
6. Webhook handler updates local payment records and member balances
7. Confirmation email queued for delivery

**Fee Model:**
- ACH transfers use percentage-based fees capped at a maximum
- Card payments use percentage plus fixed fee structure
- Platform fee calculated separately from processor fees
- Fees can be absorbed by chapter or passed to member based on configuration

**Stripe Connect:**
- Each chapter onboards through OAuth flow
- Platform acts as the connected account facilitator
- Transfers split between platform and chapter accounts
- Handles account status webhooks for compliance updates

### Bank Synchronization (Plaid)

Bank account integration uses Plaid for secure account linking and transaction retrieval.

**Link Flow:**
1. Frontend requests a link token from edge function
2. Plaid Link UI opens for user bank authentication
3. Public token exchanged for access token server-side
4. Access token encrypted and stored for future syncs

**Transaction Sync:**
- Uses cursor-based pagination for incremental updates
- Tracks last sync cursor per connection to fetch only new transactions
- Handles transaction modifications and removals from Plaid
- Deduplication logic prevents duplicate entries from overlapping syncs

**Categorization:**
- Transactions tagged with Plaid's category taxonomy
- Custom mapping layer translates to application-specific categories
- Pattern matching for recurring transaction detection

### Email System

Transactional emails use a queue-based architecture for reliability.

**Queue Processing:**
- Emails inserted into queue table with status tracking
- Scheduled edge function processes pending emails in batches
- Failed emails marked for retry with exponential backoff
- Successful deliveries logged for audit trail

**Email Types:**
- Dues assignment notifications
- Payment confirmations and receipts
- Overdue payment reminders
- Member invitation links

---

## Database Design

### Multi-Tenancy

Data isolation implemented through PostgreSQL Row-Level Security. Every table with tenant-specific data includes a `chapter_id` foreign key, and RLS policies ensure users can only access rows matching their chapter membership.

**Access Control:**
- Policies check authenticated user's chapter assignment
- Service role bypasses RLS for system operations (webhooks, cron jobs)
- Cross-chapter queries prevented at the database level

### Domain Models

**Financial Core:**
- Dues configurations define payment periods, amounts, and late fee rules
- Member dues track individual assignments with balance calculations
- Payment intents link to Stripe for status synchronization
- Dues payments record successful transactions

**Budgeting:**
- Budget periods support multiple timeframes (quarterly, semester, annual)
- Category allocations track planned vs. actual spending
- Transactions link to budget categories for real-time tracking

**Member Management:**
- User profiles store role and chapter assignments
- Invitation system handles new member onboarding
- Role hierarchy controls feature access

### Computed Data

Database views aggregate complex queries for dashboard displays. Triggers maintain calculated fields like running balances, preventing expensive queries on read operations.

---

## Key Technical Patterns

### Service Layer
Business logic encapsulated in service modules that abstract Supabase client calls. Services handle data transformation, error normalization, and provide a clean API for components.

### State Management
React Context provides global state for authentication, chapter selection, and theme. Financial data uses a dedicated context with caching to minimize database calls.

### Protected Routing
Route guards check authentication status and role permissions. Unauthorized access redirects to appropriate pages based on context.

### Webhook Idempotency
Stripe webhooks include idempotency keys. The handler checks for existing records before processing to prevent duplicate operations from webhook retries.

### Real-time Updates
Supabase Realtime subscriptions push changes to connected clients. Used selectively for high-value updates like payment status changes.

---

## Development

### Code Quality
- ESLint with React hooks plugin for static analysis
- Prettier for consistent formatting
- Vitest for unit and integration testing
- Testing Library for component tests

### CI/CD
GitHub Actions workflow runs linting and build verification on pull requests. Production deployments triggered on merge to main branch.

---

## Project Structure

```
src/
  components/    React components organized by feature
  pages/         Route-level page components
  services/      Business logic and API abstraction
  context/       React Context providers
  hooks/         Custom React hooks
  utils/         Shared utility functions

supabase/
  functions/     Deno edge functions
  migrations/    Database schema migrations
```

---

## Status

Production application actively used by fraternity chapters for dues collection and financial management.
