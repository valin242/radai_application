import prisma from './src/lib/prisma';

async function checkFeeds() {
  try {
    const feeds = await prisma.feed.findMany({
      where: {
        userId: { not: '' }
      }
    });

    const feedsWithCounts = await Promise.all(
      feeds.map(async (feed) => {
        const articleCount = await prisma.article.count({
          where: { feedId: feed.id }
        });
        return { ...feed, articleCount };
      })
    );

    console.log(`\nFound ${feedsWithCounts.length} user feeds:\n`);
    
    if (feedsWithCounts.length === 0) {
      console.log('No feeds found. User needs to add feeds during onboarding or in the Feeds tab.');
    } else {
      feedsWithCounts.forEach(feed => {
        console.log(`- ${feed.url}`);
        console.log(`  Articles: ${feed.articleCount}`);
        console.log(`  User ID: ${feed.userId}`);
        console.log('');
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkFeeds();
