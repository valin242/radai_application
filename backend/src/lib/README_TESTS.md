# Database Model Tests

## Overview

This directory contains comprehensive unit tests for all database models defined in the Prisma schema. The tests verify:

- Model creation with all required fields
- Relationships between models
- Unique constraints enforcement
- Cascade delete behavior

## Requirements

These tests validate Requirements 12.3-12.9 from the RadiAi MVP specification:
- 12.3: Users table implementation
- 12.4: Feeds table implementation
- 12.5: Articles table implementation
- 12.6: Episodes table implementation
- 12.7: Episode_articles junction table implementation
- 12.8: Questions table implementation
- 12.9: pgvector extension support

## Running Tests

### Prerequisites

1. Ensure you have a PostgreSQL database with pgvector extension enabled
2. Configure your DATABASE_URL in the `.env` file

**Important for Supabase users:**
- For tests, use the **direct connection URL** (not the pooler URL)
- Direct URL format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- Pooler URL (for production): `postgresql://postgres:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run src/lib/models.test.ts
```

## Test Structure

### User Model Tests
- ✓ Create user with all required fields
- ✓ Enforce unique email constraint
- ✓ Create user with pro tier
- ✓ Cascade delete related feeds

### Feed Model Tests
- ✓ Create feed with all required fields
- ✓ Enforce unique constraint on userId + url
- ✓ Allow same URL for different users
- ✓ Maintain relationship with user
- ✓ Cascade delete articles when feed is deleted

### Article Model Tests
- ✓ Create article with all required fields
- ✓ Enforce unique constraint on feedId + title
- ✓ Allow same title for different feeds
- ✓ Store summary when provided
- ✓ Maintain relationship with feed
- ✓ Cascade delete when feed is deleted

### Episode Model Tests
- ✓ Create episode with all required fields
- ✓ Maintain relationship with user
- ✓ Cascade delete when user is deleted

### EpisodeArticle Junction Table Tests
- ✓ Link episodes and articles
- ✓ Enforce composite primary key
- ✓ Allow multiple articles per episode
- ✓ Cascade delete when episode is deleted

### Question Model Tests
- ✓ Create question with all required fields
- ✓ Maintain relationship with episode
- ✓ Maintain relationship with user
- ✓ Cascade delete when episode is deleted
- ✓ Allow multiple questions per episode

## Test Isolation

Each test runs in isolation with a clean database state:
- `beforeEach` hook deletes all records before each test
- Tests can safely create data without affecting other tests
- Database connection is established once and reused

## Troubleshooting

### Connection Errors

If you see "Tenant or user not found" or connection errors:
1. Verify DATABASE_URL is correct in `.env`
2. For Supabase, ensure you're using the direct connection URL (port 5432)
3. Check that your database password is correct
4. Ensure the database is accessible from your network

### Migration Errors

If you see schema-related errors:
1. Run migrations: `npm run prisma:migrate:dev`
2. Regenerate Prisma Client: `npm run prisma:generate`

### Test Failures

If tests fail unexpectedly:
1. Check that pgvector extension is enabled in your database
2. Verify all migrations have been applied
3. Ensure no other process is modifying the test database
