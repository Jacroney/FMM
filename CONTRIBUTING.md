# Contributing to Greek Pay

This guide outlines our development workflow to avoid conflicts and maintain production stability.

## Branch Strategy

```
main (protected - production)
  └── feature/[name]-[description]
```

### Branch Naming Convention

- `feature/joe-*` - Joe's feature branches
- `feature/peter-*` - Peter's feature branches

Examples:
- `feature/joe-payment-retry`
- `feature/peter-member-ui`

## Development Workflow

### Starting New Work

```bash
# Always start from latest main
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/[your-name]-[description]
```

### While Working

```bash
# Sync with main daily to reduce conflicts
git fetch origin
git rebase origin/main
```

### Submitting Changes

```bash
# Push your branch
git push origin feature/[your-name]-[description]
```

Then create a Pull Request on GitHub:
1. Wait for CI to pass (lint, tests, build)
2. Request review from the other developer
3. Address feedback
4. Merge after approval

## Before Opening a PR

- [ ] Run `npm run lint` - passes
- [ ] Run `npm run test:run` - passes
- [ ] Run `npm run build` - passes
- [ ] Branch is rebased on latest main

## High-Conflict Areas

Coordinate with each other before editing these files:

| Area | Files | Risk |
|------|-------|------|
| Services | `src/services/*.ts` | Business logic changes |
| Context | `src/context/*.tsx` | Shared state changes |
| Dashboard | `src/components/Dashboard.tsx` | Main UI |
| Migrations | `supabase/migrations/*.sql` | Database schema |
| Edge Functions | `supabase/functions/*` | Backend logic |

## Conflict Resolution

If you encounter merge conflicts:

1. **Don't auto-resolve** - Review each conflict manually
2. **Communicate** - Talk to the other person about their intent
3. **Test thoroughly** - Run full validation after resolving
4. **Document** - Explain resolution in commit message

Example commit message:
```
Resolve conflict in Dashboard.tsx

- Kept Peter's chart styling
- Merged Joe's new metrics section
- Combined both import statements

Tested: Dashboard renders correctly with both features
```

## Code Review Guidelines

When reviewing PRs, check:

- [ ] Code follows existing patterns
- [ ] No hardcoded credentials
- [ ] Tests added for new features
- [ ] No console.log statements in production code
- [ ] TypeScript types are properly defined
- [ ] Database migrations are safe

## Questions?

Open an issue or reach out to a team member.
