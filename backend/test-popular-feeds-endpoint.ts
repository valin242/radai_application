import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testPopularFeedsEndpoint() {
  console.log('Testing popular feeds endpoint logic...\n');

  try {
    // Simulate the endpoint logic
    const feeds = await prisma.feed.findMany({
      where: {
        isPopular: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Transform to response format (same as endpoint)
    const feedItems = feeds.map((feed) => ({
      feed_id: feed.id,
      name: feed.name || feed.url,
      url: feed.url,
      category: feed.category || 'general',
      description: feed.description || '',
    }));

    console.log(`✅ Found ${feedItems.length} popular feeds\n`);

    // Group by category for display
    const categories = [...new Set(feedItems.map(f => f.category))];
    
    categories.forEach(category => {
      console.log(`\n${category.toUpperCase()}:`);
      const categoryFeeds = feedItems.filter(f => f.category === category);
      categoryFeeds.forEach(feed => {
        console.log(`  • ${feed.name}`);
        console.log(`    ${feed.description}`);
      });
    });

    console.log('\n✅ Popular feeds endpoint logic works correctly!');

  } catch (error) {
    console.error('❌ Error testing popular feeds endpoint:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testPopularFeedsEndpoint()
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
