# Prisma Database Setup

This directory contains the Prisma schema and migrations for the RadiAi backend.

## Prerequisites

- PostgreSQL database (Supabase recommended)
- Node.js 20.11+
- Valid DATABASE_URL in `.env` file

## Database Schema

The schema includes the following tables:
- `users` - User accounts with tier information
- `feeds` - RSS feed URLs per user
- `articles` - Fetched articles with summaries and embeddings
- `episodes` - Generated audio episodes
- `episode_articles` - Junction table linking episodes to articles
- `questions` - Q&A interactions for episodes

## pgvector Extension

The schema uses the `pgvector` extension for storing article embeddings (1536-dimension vectors).

### Enabling pgvector in Supabase

1. Go to your Supabase project dashboard
2. Navigate to Database → Extensions
3. Search for "vector" and enable the extension
4. Alternatively, run in SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

## Running Migrations

### Initial Setup

When you have a valid database connection, run:

```bash
# Apply all pending migrations
npx prisma migrate deploy

# Or for development (creates migration if schema changed)
npx prisma migrate dev
```

### Generate Prisma Client

After any schema changes:

```bash
npx prisma generate
```

### Reset Database (Development Only)

To reset the database and reapply all migrations:

```bash
npx prisma migrate reset
```

## Database Connection

Update the `DATABASE_URL` in `.env` with your Supabase connection string:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

For connection pooling (recommended for serverless):

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Prisma Studio

To explore your database with a GUI:

```bash
npx prisma studio
```

## Troubleshooting

### Migration Fails

If migrations fail due to missing pgvector extension:
1. Enable the extension manually in Supabase dashboard
2. Or run: `CREATE EXTENSION IF NOT EXISTS vector;` in SQL Editor
3. Then retry the migration

### Connection Issues

- Verify DATABASE_URL is correct
- Check if database is accessible from your network
- Ensure Supabase project is active
- Verify credentials are valid

## Schema Updates

When modifying the schema:

1. Update `schema.prisma`
2. Create a new migration: `npx prisma migrate dev --name description_of_change`
3. Generate client: `npx prisma generate`
4. Commit both schema and migration files
