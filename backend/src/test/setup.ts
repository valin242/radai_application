import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { prisma } from '../lib/prisma';

// Setup before all tests
beforeAll(async () => {
  try {
    // Ensure database connection is ready
    await prisma.$connect();
    console.log('✓ Database connection established');
  } catch (error) {
    console.error('✗ Failed to connect to database:', error);
    console.error('\nPlease ensure:');
    console.error('1. DATABASE_URL is correctly set in .env file');
    console.error('2. Database is accessible and running');
    console.error('3. For Supabase pooler connections, use the direct connection URL for tests');
    console.error('   (Remove ?pgbouncer=true and use port 5432 instead of 6543)');
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Note: We don't use a global beforeEach to clean up data because:
// 1. Tests run in parallel and would interfere with each other
// 2. Each test file should manage its own test data lifecycle
// 3. Tests should create unique data (e.g., unique emails with timestamps)
//    to avoid conflicts

// Helper function to create a test user in the database (without Supabase Auth)
// This is useful for tests that need to test features other than authentication
export async function createTestUser(email?: string, tier: 'free' | 'pro' = 'free') {
  const testEmail = email || `test-${Date.now()}-${Math.random()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      tier,
    },
  });
  return user;
}

// Helper function to clean up a specific user and their related data
export async function cleanupTestUser(userId: string) {
  // Delete all related data first
  await prisma.question.deleteMany({ where: { userId } });
  await prisma.episode.deleteMany({ where: { userId } });
  await prisma.feed.deleteMany({ where: { userId } });
  
  // Then delete the user
  await prisma.user.delete({ where: { id: userId } }).catch(() => {
    // Ignore errors if user doesn't exist
  });
}
