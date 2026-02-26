import { prisma } from './src/lib/prisma';

async function cleanupTestData() {
  try {
    console.log('Starting cleanup of test data...\n');

    // Delete test users and all their related data (cascades to feeds, episodes, etc.)
    const deleteResult = await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test' } },
          { email: { contains: 'example.com' } },
        ],
      },
    });

    console.log(`✓ Deleted ${deleteResult.count} test users and their related data\n`);

    // Check remaining users
    const remainingUsers = await prisma.user.findMany({
      select: {
        email: true,
        _count: {
          select: {
            feeds: true,
            episodes: true,
          },
        },
      },
    });

    console.log('Remaining users:');
    remainingUsers.forEach((user) => {
      console.log(`  - ${user.email} (${user._count.feeds} feeds, ${user._count.episodes} episodes)`);
    });

    console.log('\nCleanup complete!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData();
