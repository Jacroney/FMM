# UI/Frontend design

## Goals
- Answer three questions within 3–8 seconds: what this is, why it matters, what to do next.
- Modernize layout, hierarchy, and tone for sales demos.
- Prioritize clarity, scan-ability, accessibility, and confidence over decoration.

## Section Plan (Keep Features, Refresh UI)
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

## UI Principles
- **Typography:** strong headline, concise subhead.
- **Spacing:** consistent 8px scale.
- **Color:** primary accent used sparingly.
- **Motion:** subtle hover/focus only (150–300ms).
- **Accessibility:** WCAG contrast, focus rings, 16px minimum text.

## CTA Strategy
- One primary CTA per section.
- Secondary CTA visually de-emphasized.
- CTA copy focuses on outcomes (“Launch interactive demo”).

## Copy Wire (Draft)
- **Headline:** “Treasury‑grade finance for Greek life.”
- **Subheadline:** “Unify dues, bank sync, budgets, and reporting for every chapter.”
- **Primary CTA:** “Launch interactive demo”
- **Secondary CTA:** “Sign in”
- **Social proof:** “Trusted by X chapters • $Y dues collected”

## Implementation Notes
- File to update: `src/pages/Home.tsx`
- Keep routes, demo link, and existing feature anchors.
- Reuse existing brand tokens (`--brand-*`) for consistency.
