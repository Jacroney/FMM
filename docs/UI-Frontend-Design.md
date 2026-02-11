# UI/Frontend design

## Goals
- Answer three questions within 3–8 seconds: what this is, why it matters, what to do next.
- Modernize layout, hierarchy, and tone for sales demos.
- Prioritize clarity, scan-ability, accessibility, and confidence over decoration.
- Keep marketing pages visually consistent with a unified navbar and logo system.

## Section Plan (Home Page)
### 1) Hero (Above the Fold)
- **Value clarity:** short headline (6–12 words).
- **Subheadline:** who it’s for + outcome.
- **Primary CTA:** “Launch interactive demo”.
- **Secondary CTA:** “Sign in”.
- **Visual:** calm product snapshot focusing on outcomes (cash position, dues status).

### 2) Credibility Ribbon
- Small logo row or metric line early.
- Keep testimonial but place near hero to reinforce trust.

### 3) Core Benefits (Existing 3 items)
- Use icon + bold title + 2-line description.
- Tight grid with ample spacing and consistent rhythm.

### 4) Outcomes Walkthrough
- Keep “Live view” concept, but split into 3–4 mini outcome cards:
  - Bank sync status
  - Dues collection progress
  - Budget health
  - Reporting snapshot

### 5) Demo / CTA Section (Existing)
- Retain demo CTA + sign-in CTA.
- Reduce gradient intensity; keep calm, high-contrast CTA.

### 6) Footer (Existing)
- Keep current links and structure.

## Features Page Plan
### 1) Features Hero
- Dark, Mercury‑inspired hero with a clear product promise.
- Two CTAs: “Launch interactive demo” + “Talk to sales.”
### 2) Feature Grid (9 areas)
- Dashboard, Transactions, Budgets, Members & Dues, Reports, Bank Sync, Recurring, AI Advisor, Settings.
- Each card: icon, title, short description, 2–3 bullet benefits.
### 3) Why It Sells
- Four selling points in compact cards.
- CTA to demo.

## Navigation + Branding System
- **Unified navbar** across Home, Pricing, Features, Demo, Contact.
- **Centered nav** with consistent spacing and scale.
- **Gold badge logo** with dark icon, matching demo branding.
- **Scroll behavior:** navbar blends into the page at the top; border appears on scroll.

## UI Principles
- **Typography:** strong headline, concise subhead; ensure high contrast on white cards.
- **Spacing:** consistent 8px scale.
- **Color:** primary accent used sparingly; subtle blue accents for secondary chips.
- **Motion:** subtle hover/focus only (150–300ms).
- **Accessibility:** WCAG contrast, focus rings, 16px minimum text.

## CTA Strategy
- One primary CTA per section.
- Secondary CTA visually de-emphasized.
- CTA copy focuses on outcomes (“Launch interactive demo”).

## Copy Wire (Draft)
- **Headline:** “One treasury workspace. Zero spreadsheet chaos.”
- **Subheadline:** “Unify dues, bank sync, budgets, and reporting for every chapter.”
- **Primary CTA:** “Launch interactive demo”
- **Secondary CTA:** “Sign in”
- **Social proof:** “Dues collected • Members active • Bank accounts linked”

## Implementation Notes
- Files updated: `src/pages/Home.tsx`, `src/pages/Features.tsx`, `src/pages/Pricing.tsx`, `src/pages/Demo.tsx`, `src/pages/Contact.tsx`.
- New route: `/features` wired in `src/App.jsx`.
- Reuse existing brand tokens (`--brand-*`) for consistency.
