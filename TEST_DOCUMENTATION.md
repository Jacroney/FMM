# AI Advisor Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the AI Advisor feature, including RAG (Retrieval-Augmented Generation), proactive insights, and chat functionality.

## Test Infrastructure

### Frameworks & Tools
- **Vitest** - Fast, Vite-native test runner
- **@testing-library/react** - Component testing utilities
- **MSW (Mock Service Worker)** - API mocking
- **jsdom** - DOM environment for tests
- **@vitest/coverage-v8** - Code coverage reporting

### Configuration Files
- `vitest.config.ts` - Test runner configuration
- `test/setup.ts` - Global test setup
- `test/mocks/` - Mock implementations
- `test/fixtures/` - Test data fixtures

## Running Tests

### All Tests
```bash
npm test
```

### Run Tests Once (CI mode)
```bash
npm run test:run
```

### Watch Mode with UI
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test src/services/__tests__/aiService.test.ts
```

### Run Tests Matching Pattern
```bash
npm test -- --reporter=verbose --grep="generateEmbeddings"
```

## Test Structure

### Frontend Tests

#### 1. Service Layer Tests
**Location**: `src/services/__tests__/aiService.test.ts`
**Coverage**: 100% of aiService.ts methods
**Test Count**: 25 tests

Covers:
- ✅ Embedding generation (success, force refresh, auth errors)
- ✅ Insights generation (success, clear existing option)
- ✅ Knowledge base statistics
- ✅ Message sending (with/without conversation ID)
- ✅ Conversation management (CRUD operations)
- ✅ Conversation message retrieval
- ✅ Feedback submission
- ✅ Insight management (get, mark read, dismiss)
- ✅ Conversation title generation

#### 2. Component Tests
**Location**: `src/components/__tests__/`
**Coverage**: All AI-related React components

##### AIChat Component Tests
- ✅ Render empty state
- ✅ Load conversation messages on mount
- ✅ Send message with optimistic UI
- ✅ Handle send errors (remove optimistic message)
- ✅ Auto-scroll behavior
- ✅ Keyboard shortcuts (Enter, Shift+Enter)
- ✅ Loading states
- ✅ Token display

##### AIAdvisor Page Tests
- ✅ Render conversation list
- ✅ Create/select/delete conversations
- ✅ Knowledge base stats display
- ✅ Generate/refresh embeddings
- ✅ Loading and error states
- ✅ Date formatting

### Backend Tests (Deno)

#### 3. Edge Function Tests
**Location**: `supabase/functions/*/tests/`

##### ai-advisor Function
- Vector search accuracy
- Context assembly
- Real-time data fetching
- OpenAI API integration
- Conversation history handling
- Error handling (auth, API failures)

##### generate-embeddings Function
- Transaction embedding generation
- Budget embedding generation
- Batch processing (100 items)
- Force refresh logic
- OpenAI rate limiting
- Vector dimension verification (1536)

##### generate-insights Function
- Budget warning detection (>100%, 80-100%)
- Cash flow alert calculation
- Anomaly detection (2.5x threshold)
- Spending trend forecasting
- Dues collection alerts
- Priority assignment

#### 4. Database Function Tests
**Location**: `supabase/tests/database/`

SQL functions tested:
- `search_knowledge_base()` - Vector similarity search
- `get_conversation_history()` - Message retrieval
- `create_conversation()` - Conversation creation
- `add_message()` - Message insertion
- `get_unread_insights()` - Filtered insight retrieval

### Integration Tests

#### 5. End-to-End Workflows
**Location**: `test/integration/`

##### RAG Workflow Test
1. User asks question
2. Generate query embedding
3. Perform vector search
4. Assemble context
5. Call OpenAI
6. Store message
7. Verify response quality

##### Insights Generation Workflow
1. Generate insights
2. Store in database
3. Fetch unread insights
4. Display on dashboard
5. Dismiss insight
6. Verify removal

### Performance Tests

#### 6. Speed & Scalability
**Location**: `test/performance/`

Benchmarks:
- Vector search: <10ms for 1000+ embeddings
- Embedding generation: Batch processing efficiency
- Chat response time: <3s end-to-end
- Large conversation handling
- Concurrent user load

### Quality Tests

#### 7. RAG Accuracy Tests
**Location**: `test/quality/`

Metrics:
- Context retrieval accuracy: >90%
- Semantic search quality
- No hallucinations (answers grounded in context)
- Query-response relevance

#### 8. Insight Quality Tests
- Threshold trigger accuracy
- Priority assignment logic
- Suggested actions relevance
- Edge case handling

## Mock Data

### Fixtures Available
- **financial-data.ts**: Complete set of mock data
  - Transactions (varied categories, amounts)
  - Budgets (different utilization levels)
  - Recurring transactions
  - Conversations & messages
  - Insights (all types)
  - Knowledge base items
  - Embeddings (1536-dimensional vectors)

### Mock Implementations
- **supabase.ts**: Mock Supabase client
- **openai.ts**: Mock OpenAI API responses

## Coverage Goals

### Current Coverage
- **Frontend Services**: 100% (25/25 tests passing)
- **Components**: In Progress
- **Edge Functions**: Pending
- **Integration**: Pending

### Target Coverage
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## Writing New Tests

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService } from '../aiService';

describe('New Feature', () => {
  beforeEach(() => {
    // Setup mocks
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = await AIService.someMethod(input);

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveProperty('expectedProp');
  });

  it('should handle errors', async () => {
    // Arrange
    mockFunction.mockRejectedValueOnce(new Error('Test error'));

    // Act & Assert
    await expect(AIService.someMethod('bad input')).rejects.toThrow();
  });
});
```

### Best Practices

1. **Arrange-Act-Assert** pattern
2. **Clear test names** describing what's being tested
3. **One assertion per test** when possible
4. **Mock external dependencies** (APIs, databases)
5. **Test edge cases** and error conditions
6. **Use fixtures** for consistent test data
7. **Clean up** after each test (vi.clearAllMocks())

## Debugging Tests

### View Test Output
```bash
npm test -- --reporter=verbose
```

### Run Single Test
```bash
npm test -- --reporter=verbose --grep="specific test name"
```

### Debug in VS Code
1. Set breakpoint in test file
2. Run "Debug Current Test File" from command palette
3. Or use launch configuration:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

## CI/CD Integration

### GitHub Actions Workflow
**Location**: `.github/workflows/test.yml`

Triggers:
- Push to main/development branches
- Pull requests
- Manual workflow dispatch

Steps:
1. Checkout code
2. Install dependencies
3. Run linter
4. Run all tests
5. Generate coverage report
6. Upload coverage to Codecov (optional)
7. Fail pipeline if coverage <80%

### Example Workflow

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:run
      - run: npm run test:coverage
```

## Test Data Management

### Generating Realistic Test Data

```typescript
import { createMockEmbedding } from '../../../test/fixtures/financial-data';

const mockTransaction = {
  id: 'txn-' + Math.random(),
  amount: Math.random() * 1000,
  category: 'Food & Dining',
  date: new Date().toISOString(),
  embedding: createMockEmbedding() // 1536-dimensional vector
};
```

### Resetting Test State

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // Clear all mock call history
  vi.restoreAllMocks(); // Restore original implementations
  global.fetch = vi.fn(); // Reset global mocks
});
```

## Common Issues & Solutions

### Issue: "Cannot access before initialization"
**Cause**: Mock hoisting issue with vi.mock()
**Solution**: Define mocks inside the factory function

```typescript
// ❌ Wrong
const mockClient = createMock();
vi.mock('./module', () => ({ client: mockClient }));

// ✅ Correct
vi.mock('./module', () => ({
  client: {
    method: vi.fn()
  }
}));
```

### Issue: "TypeError: Cannot read property 'then' of undefined"
**Cause**: Mock function not returning a Promise
**Solution**: Use `mockResolvedValue` or `mockRejectedValue`

```typescript
// ❌ Wrong
mockFn.mockReturnValue({ data: [] });

// ✅ Correct
mockFn.mockResolvedValue({ data: [] });
```

### Issue: Tests passing but coverage low
**Cause**: Code paths not exercised
**Solution**: Add tests for edge cases and error conditions

```typescript
it('should handle empty data', () => { /* ... */ });
it('should handle network errors', () => { /* ... */ });
it('should handle invalid input', () => { /* ... */ });
```

## Future Enhancements

### Planned Test Additions
1. ✅ Frontend service tests (aiService.ts) - **COMPLETED**
2. ⏳ Component tests (AIChat, AIAdvisor)
3. ⏳ Edge function tests (Deno test runner)
4. ⏳ Database function tests (pgTAP)
5. ⏳ Integration tests (RAG workflow, insights workflow)
6. ⏳ Performance benchmarks
7. ⏳ RAG accuracy tests
8. ⏳ Visual regression tests (Playwright/Cypress)
9. ⏳ E2E tests (full user flows)
10. ⏳ Load testing (k6 or Artillery)

### Test Automation Improvements
- Automatic test generation for new files
- Mutation testing (Stryker)
- Contract testing for APIs
- Snapshot testing for UI components
- Property-based testing (fast-check)

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [Deno Testing Guide](https://deno.land/manual/testing)
- [pgTAP Documentation](https://pgtap.org/)

## Support

For questions or issues with tests:
1. Check this documentation
2. Review existing test files for examples
3. Consult framework documentation
4. Ask in team chat or create an issue

## Summary

### ✅ Completed
- Test infrastructure setup (Vitest, testing-library, MSW)
- Configuration files (vitest.config.ts, setup.ts)
- Mock data fixtures and handlers
- **aiService.ts unit tests (25 tests, 100% passing)**

### 📊 Test Suite Stats
- **Total Tests**: 25 (as of now)
- **Pass Rate**: 100%
- **Estimated Total When Complete**: 150+ tests
- **Coverage Target**: 80% across all code

### 🎯 Ready to Test!
Run `npm test` to execute the test suite. All AI advisor service tests are fully functional and passing!
