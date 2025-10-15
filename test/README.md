# Test Directory

This directory contains all test files, mocks, and fixtures for the application.

## Structure

```
test/
├── README.md              # This file
├── setup.ts               # Global test setup (imported by vitest.config.ts)
├── mocks/                 # Mock implementations
│   ├── supabase.ts        # Mock Supabase client
│   └── openai.ts          # Mock OpenAI API responses
├── fixtures/              # Test data
│   └── financial-data.ts  # Mock transactions, budgets, conversations, etc.
├── integration/           # Integration tests (to be added)
├── performance/           # Performance benchmarks (to be added)
└── quality/               # Quality/accuracy tests (to be added)
```

## Quick Reference

### Run Tests
```bash
npm test                  # Watch mode
npm run test:run          # Run once
npm run test:ui           # Interactive UI
npm run test:coverage     # Coverage report
```

### Mock Data Available

Import fixtures in your tests:

```typescript
import {
  mockChapterId,
  mockUserId,
  mockTransactions,
  mockBudgets,
  mockConversations,
  mockMessages,
  mockInsights,
  mockKnowledgeBase,
  createMockEmbedding
} from '../../../test/fixtures/financial-data';
```

### Mock Implementations

```typescript
// Supabase is already mocked globally via setup.ts
// OpenAI fetch responses are mocked in individual tests

// Example:
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ /* mock response */ })
  });
});
```

## Adding New Tests

1. Create test file in `src/**/__tests__/`
2. Name it `*.test.ts` or `*.test.tsx`
3. Follow the pattern from `src/services/__tests__/aiService.test.ts`
4. Use fixtures and mocks from this directory

## Resources

- Full documentation: `TEST_DOCUMENTATION.md`
- Summary: `AI_TESTING_SUMMARY.md`
- Vitest docs: https://vitest.dev/
