# Deployment Guide: Personalized Content Filtering

## Prerequisites

- PostgreSQL database with pgvector extension enabled
- Node.js 20+ installed
- Environment variables configured (see `.env.example`)

## Database Migration Steps

### 1. Backup Your Database (Production)

```bash
# Create a backup before running migrations
pg_dump -h your-host -U your-user -d your-database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Run Migrations

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 3. Seed Popular Feeds

```bash
# Run the seed script to populate popular feeds
npm run seed:popular-feeds
# or
npx ts-node seed-popular-feeds.ts
```

### 4. Verify Migration

```bash
# Check that tables were created
npx prisma studio
# Or connect to your database and verify:
# - user_preferences table exists
# - filtering_statistics table exists
# - feeds table has new columns: is_popular, name, category, description
```

## Environment Variables

Ensure these are set in your production environment:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# OpenAI (for embeddings)
OPENAI_API_KEY="sk-..."

# Supabase (for auth and storage)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Redis (for job queues)
REDIS_URL="redis://localhost:6379"

# API
PORT=8000
```

## Post-Deployment Verification

### 1. Test Onboarding Flow

```bash
# Test the onboarding endpoint
curl -X POST http://your-api/onboarding \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topics": ["Technology", "Finance"],
    "feedIds": [],
    "customFeedUrls": []
  }'
```

### 2. Verify Popular Feeds

```bash
# Check popular feeds are available
curl http://your-api/onboarding/popular-feeds \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Content Filtering

```bash
# Trigger article fetch and verify filtering is working
# Check filtering statistics
curl http://your-api/statistics/filtering \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Rollback Plan

If you need to rollback the migration:

```bash
# Restore from backup
psql -h your-host -U your-user -d your-database < backup_TIMESTAMP.sql

# Or manually drop tables
psql -h your-host -U your-user -d your-database -c "
DROP TABLE IF EXISTS filtering_statistics CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
ALTER TABLE feeds DROP COLUMN IF EXISTS is_popular;
ALTER TABLE feeds DROP COLUMN IF EXISTS name;
ALTER TABLE feeds DROP COLUMN IF EXISTS category;
ALTER TABLE feeds DROP COLUMN IF EXISTS description;
"
```

## Monitoring

After deployment, monitor:

1. **Filtering Statistics**: Check that articles are being filtered
2. **Interest Profile Generation**: Verify embeddings are being created
3. **API Performance**: Monitor response times for filtering operations
4. **Error Rates**: Watch for embedding generation failures

## Troubleshooting

### Migration Fails

- **Error**: `extension "vector" does not exist`
  - **Solution**: Enable pgvector extension: `CREATE EXTENSION vector;`

- **Error**: `column "interest_profile_embedding" does not exist`
  - **Solution**: Ensure pgvector extension is enabled before running migrations

### Seed Script Fails

- **Error**: `Cannot find module`
  - **Solution**: Run `npm install` and ensure TypeScript is compiled

### Filtering Not Working

- Check that OpenAI API key is valid
- Verify user has completed onboarding
- Check filtering statistics to see if articles are being processed

## Performance Tuning

### Database Indexes

The migration creates these indexes automatically:
- `user_preferences_user_id_key` (unique)
- `filtering_statistics_user_id_date_idx`

Consider adding additional indexes if needed:

```sql
-- Index for faster embedding similarity searches (if using pgvector search)
CREATE INDEX ON user_preferences USING ivfflat (interest_profile_embedding vector_cosine_ops);
```

### Caching

Consider caching:
- Popular feeds list (rarely changes)
- User interest profiles (only changes when preferences update)
- Filtering statistics (can be cached for 1 hour)

## Next Steps

1. Monitor user onboarding completion rates
2. Analyze filtering statistics to tune default threshold
3. Collect feedback on content relevance
4. Consider A/B testing different threshold defaults
