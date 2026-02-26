# Quick Start Guide: Personalized Content Filtering

Get the personalized content filtering feature up and running in 10 minutes.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL with pgvector extension
- OpenAI API key
- Supabase account (for auth)

## Step 1: Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add:
# - PORT=8000 (IMPORTANT: Must be 8000, not 3000)
# - DATABASE_URL
# - OPENAI_API_KEY
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed popular feeds
npx ts-node seed-popular-feeds.ts

# Start the server
npm run dev
```

Backend should now be running on `http://localhost:8000`

## Step 2: Mobile Setup (3 minutes)

```bash
# Navigate to mobile
cd mobile

# Install dependencies
npm install

# Install slider component
npm install @react-native-community/slider

# Set up environment variables
cp .env.example .env
# Edit .env and add:
# EXPO_PUBLIC_API_URL=http://192.168.x.x:8000 (use your computer's local IP)
# For localhost testing: http://localhost:8000
# For Android emulator: http://10.0.2.2:8000
# For physical device: http://YOUR_LOCAL_IP:8000

# Start the app
npm start
```

**Important**: Make sure the port in `EXPO_PUBLIC_API_URL` matches the backend port (8000).

## Step 3: Test the Feature (2 minutes)

### Create a Test User

1. Open the mobile app
2. Tap "Create Account"
3. Enter email: `testuser@gmail.com` (use a real-looking email, not @example.com)
4. Enter password: `TestPassword123!`
5. Tap "Create Account"

Note: Supabase rejects @example.com emails. Use @gmail.com, @test.dev, or any real-looking domain.

### Complete Onboarding

1. **Step 1**: Select 2-3 topics (e.g., Technology, Finance)
2. **Step 2**: Select 2-3 popular feeds (e.g., TechCrunch, The Verge)
3. **Step 3**: Optionally add a custom feed URL
4. Tap "Complete"

### Verify It Works

1. Go to "Preferences" tab
2. See your selected topics and feeds
3. Adjust the relevance threshold slider
4. Add a custom keyword

### Trigger Article Filtering

```bash
# In backend directory
npx ts-node trigger-quick-episode.ts
```

### Check Results

1. Go to "Preferences" tab in mobile app
2. See filtering statistics:
   - Total articles processed
   - Articles included
   - Articles filtered out
   - Inclusion percentage

## Quick Verification Checklist

- [ ] Backend server running on port 8000
- [ ] Mobile app connects to backend
- [ ] Can create a new user account
- [ ] Onboarding flow works (3 steps)
- [ ] Can select topics and feeds
- [ ] Preferences screen shows selections
- [ ] Can adjust relevance threshold
- [ ] Can add/remove keywords
- [ ] Article filtering works (run trigger script)
- [ ] Statistics appear in preferences

## Common Issues

### "Cannot connect to backend"
- Check backend is running: `curl http://localhost:8000/health`
- Verify `EXPO_PUBLIC_API_URL` in mobile `.env` uses port 8000
- Verify backend `.env` has `PORT=8000`
- For Android emulator, use `http://10.0.2.2:8000`
- For physical device, use your computer's local IP (e.g., `http://192.168.1.100:8000`)
- Restart both backend and mobile app after changing .env files

### "Nothing happens when I click Sign In/Sign Up"
- Check the console logs for error messages
- Common causes:
  - Backend not running (check with `curl http://localhost:8000/health`)
  - Wrong API URL port (should be 8000, not 3000)
  - Supabase credentials incorrect
  - Using @example.com email (use @gmail.com, @test.dev, etc.)
  - Email rate limit exceeded (disable "Confirm email" in Supabase dashboard)
- The app now shows error messages on the login/signup screens

### "Onboarding screen not showing"
- Check user is authenticated (look for "AuthContext: Sign in successful" in logs)
- Verify onboarding status: `curl http://localhost:8000/onboarding/status -H "Authorization: Bearer TOKEN"`
- Check console for "Failed to check onboarding status" errors

### "Slider not working"
- Install package: `npm install @react-native-community/slider`
- Restart metro bundler

### "No popular feeds"
- Run seed script: `npx ts-node seed-popular-feeds.ts`
- Verify in database: `SELECT * FROM feeds WHERE is_popular = true;`

## Next Steps

1. ✅ Feature is working locally
2. Read [E2E Testing Guide](E2E_TESTING_GUIDE.md) for comprehensive testing
3. Follow [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) for production deployment
4. Review [Implementation Summary](IMPLEMENTATION_SUMMARY.md) for full details

## API Endpoints Quick Reference

```bash
# Onboarding
GET  /onboarding/topics
GET  /onboarding/popular-feeds
POST /onboarding
GET  /onboarding/status

# Preferences
GET    /preferences
PUT    /preferences/topics
POST   /preferences/keywords
DELETE /preferences/keywords/:keyword
PUT    /preferences/threshold

# Statistics
GET /statistics/filtering

# Feeds
GET    /feeds
POST   /feeds
DELETE /feeds/:feedId
```

## Database Quick Check

```sql
-- Check user preferences
SELECT * FROM user_preferences WHERE onboarding_completed = true;

-- Check popular feeds
SELECT * FROM feeds WHERE is_popular = true;

-- Check filtering statistics
SELECT * FROM filtering_statistics ORDER BY date DESC LIMIT 10;
```

## Success!

If you've completed all steps and the checklist, the personalized content filtering feature is working! 🎉

For production deployment, follow the [Deployment Checklist](DEPLOYMENT_CHECKLIST.md).
