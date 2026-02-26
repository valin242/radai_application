import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function verifyPopularFeeds() {
  console.log('Verifying popular feeds in database...\n');

  try {
    // Get all popular feeds
    const popularFeeds = await prisma.feed.findMany({
      where: { isPopular: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    console.log(`Total popular feeds found: ${popularFeeds.length}\n`);

    // Group by category
    const categories = [...new Set(popularFeeds.map(f => f.category))];
    
    categories.forEach(category => {
      console.log(`\n${category?.toUpperCase()}:`);
      const categoryFeeds = popularFeeds.filter(f => f.category === category);
      categoryFeeds.forEach(feed => {
        console.log(`  ✓ ${feed.name}`);
        console.log(`    URL: ${feed.url}`);
        console.log(`    Description: ${feed.description}`);
        console.log(`    isPopular: ${feed.isPopular}`);
      });
    });

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('Error verifying popular feeds:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyPopularFeeds()
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
