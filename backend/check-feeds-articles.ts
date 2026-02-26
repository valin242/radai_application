import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFeedsAndArticles() {
  try {
    console.log('Checking feeds and articles...\n');

    // Get user
    const user = await prisma.user.findFirst({
      where: {
        email: 'valin242.vp@gmail.com',
      },
    });

    if (!user) {
      console.log('User not found.');
      return;
    }

    console.log(`User: ${user.email}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Tier: ${user.tier}\n`);

    // Check feeds
    const feeds = await prisma.feed.findMany({
      where: {
        userId: user.id,
      },
    });

    console.log(`Total Feeds: ${feeds.length}`);
    if (feeds.length > 0) {
      console.log('\nFeeds:');
      feeds.forEach((feed, idx) => {
        console.log(`  ${idx + 1}. ${feed.url}`);
        console.log(`     Created: ${feed.createdAt}`);
      });
    } else {
      console.log('  No feeds found for this user.');
    }

    // Check articles
    const articles = await prisma.article.findMany({
      where: {
        feed: {
          userId: user.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log(`\nTotal Articles: ${await prisma.article.count({
      where: {
        feed: {
          userId: user.id,
        },
      },
    })}`);

    if (articles.length > 0) {
      console.log('\nRecent Articles (last 10):');
      articles.forEach((article, idx) => {
        console.log(`  ${idx + 1}. ${article.title}`);
        console.log(`     Published: ${article.publishedAt || 'Unknown'}`);
        console.log(`     Has Summary: ${article.summary ? 'Yes' : 'No'}`);
        console.log(`     Created: ${article.createdAt}`);
      });
    } else {
      console.log('  No articles found for this user.');
    }

    // Check articles with summaries from last 48 hours
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 48);

    const recentArticlesWithSummaries = await prisma.article.count({
      where: {
        feed: {
          userId: user.id,
        },
        summary: {
          not: null,
        },
        createdAt: {
          gte: cutoffDate,
        },
      },
    });

    console.log(`\nArticles with summaries from last 48 hours: ${recentArticlesWithSummaries}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFeedsAndArticles();
