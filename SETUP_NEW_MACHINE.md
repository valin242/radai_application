# Setting Up on a New Machine

This guide explains how to set up the project when you clone it on a new computer.

## Quick Answer

**Yes, you need to create `.env` files with your real keys on each new machine.**

The `.env` files are NOT in the repository (they're in `.gitignore`), so you'll need to create them manually.

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/valin242/radai_application.git
cd radai_application
```

### 2. Create Environment Files

The repository includes `.env.example` files as templates. Copy them to create your `.env` files:

```bash
# Backend
cp backend/.env.example backend/.env

# Mobile
cp mobile/.env.example mobile/.env
```

### 3. Add Your Real API Keys

Edit the `.env` files and replace the placeholders with your actual credentials:

#### `backend/.env`
```bash
# Replace these with your real values:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_real_anon_key_here
SUPABASE_SERVICE_KEY=your_real_service_key_here
OPENAI_API_KEY=sk-proj-your_real_openai_key_here
```

#### `mobile/.env`
```bash
# Replace these with your real values:
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_real_anon_key_here
EXPO_PUBLIC_API_URL=http://YOUR_IP:8000  # or http://localhost:8000
```

### 4. Install Dependencies

```bash
# Backend
cd backend
npm install

# Mobile
cd ../mobile
npm install
```

### 5. Set Up Database

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

## How the Code Uses .env Files

### ✅ Backend (Correctly Configured)

Your backend code uses `dotenv` to load environment variables from `.env`:

```typescript
// backend/src/index.ts
import dotenv from 'dotenv';
dotenv.config();  // Loads .env file

const PORT = process.env.PORT || '3000';
```

**All backend files load `.env` automatically** through:
- `dotenv.config()` at the top of entry files
- `process.env.VARIABLE_NAME` to access values

### ✅ Mobile (Correctly Configured)

Expo automatically loads `.env` files and makes variables starting with `EXPO_PUBLIC_` available:

```typescript
// mobile/src/config/supabase.ts
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
```

**No manual loading needed** - Expo handles it automatically.

## Test Configuration

### ✅ Tests Use .env Files

Your tests are properly configured to use `.env`:

```typescript
// backend/src/test/setup.ts
beforeAll(async () => {
  // Uses DATABASE_URL from .env
  await prisma.$connect();
});
```

**Tests will fail if `.env` is missing** with a helpful error message:

```
✗ Failed to connect to database
Please ensure:
1. DATABASE_URL is correctly set in .env file
2. Database is accessible and running
```

## Common Issues

### Issue 1: "Cannot find module 'dotenv'"

**Solution:** Install dependencies
```bash
cd backend
npm install
```

### Issue 2: Tests fail with database connection error

**Solution:** Check your `.env` file has the correct `DATABASE_URL`

For Supabase, use the direct connection (not pooler) for tests:
```bash
# Use this format for tests:
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres

# NOT this (pooler mode):
DATABASE_URL=postgresql://postgres:PASSWORD@PROJECT.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Issue 3: Mobile app can't connect to backend

**Solution:** Update `EXPO_PUBLIC_API_URL` in `mobile/.env` with your computer's IP address:

```bash
# Find your IP address
# Windows: ipconfig
# Mac/Linux: ifconfig

# Then update .env:
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

## Security Checklist

When setting up on a new machine:

- ✅ Copy `.env.example` to `.env`
- ✅ Add your real API keys to `.env`
- ✅ Verify `.env` is in `.gitignore`
- ✅ Never commit `.env` to git
- ✅ Keep `.env` files private

## Verification

Check that everything is set up correctly:

```bash
# Verify .env files exist
ls backend/.env
ls mobile/.env

# Verify .env is ignored by git
git check-ignore backend/.env mobile/.env
# Should output: backend/.env mobile/.env

# Try to add .env to git (should be ignored)
git add backend/.env
# Should output: nothing (file is ignored)
```

## Summary

| File | On GitHub? | Contains | You Need To |
|------|-----------|----------|-------------|
| `.env.example` | ✅ Yes | Placeholders | Nothing (already there) |
| `.env` | ❌ No | Real secrets | Create it manually |

**Every time you clone the repo on a new machine:**
1. Copy `.env.example` to `.env`
2. Fill in your real API keys
3. Never commit `.env`

The code is already set up to use `.env` files - you just need to create them!
