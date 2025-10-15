# Security Testing Directory

This directory contains security tests for the GreekPay application.

## Purpose

Test all security improvements implemented in the security audit to ensure:
- Authentication and authorization work correctly
- Input validation catches malicious inputs
- CORS policies are enforced
- Role-based access control functions properly

## Test Files

### `auth-tests.ts`
Tests authentication and authorization:
- Profile load failure handling
- Token validation
- Role-based access control
- Chapter isolation

### `cors-tests.ts`
Tests CORS security:
- Allowed origins (greekpay.org, localhost)
- Blocked unauthorized origins
- Preflight request handling

### `input-validation-tests.ts`
Tests input validation:
- XSS prevention
- SQL injection prevention
- UUID validation
- String length limits
- Type validation

### `plaid-security-tests.ts`
Tests Plaid integration security:
- Token exchange security
- Connection authorization
- Transaction sync permissions
- Access token protection

## Running Tests

```bash
# Run all security tests
npm run test security

# Run specific test file
npm run test test/security/auth-tests.ts

# Run with coverage
npm run test:coverage security
```

## Test Environment

Make sure to:
1. Use a test database (not production)
2. Set `ENVIRONMENT=test` in .env
3. Use Plaid sandbox environment
4. Use test OpenAI API key

## Adding New Tests

When adding security features:
1. Create test file in this directory
2. Test both success and failure cases
3. Test edge cases and boundary conditions
4. Test with different user roles

## Security Test Principles

- **Test the negative**: Try to break security, not just prove it works
- **Test as attacker**: Think like someone trying to exploit the system
- **Test all roles**: Test as member, exec, and admin
- **Test isolation**: Verify users can't access other chapters' data

---

Last Updated: January 14, 2025
