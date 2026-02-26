/**
 * Check article processing status for a user
 */

import prisma from './src/lib/prisma';

async function main() {
  const userEmail = 'testuser@gmail.com';
  
  console.log(`Checking article status for: ${userEmail}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    // Get all articles for this user's feeds
    const articles = await prisma.article.findMany({
      where: {
        feed: {
          userId: user.id
        }
      },
      include: {
        feed: {
          select: {
            name: true,
            url: true
          }
        }
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });

    console.log(`Total articles: ${articles.length}\n`);

    const withSummary = articles.filter(a => a.summary);
    const withoutSummary = articles.filter(a => !a.summary);

    console.log('Processing status:');
    console.log(`  With summary: ${withSummary.length}`);
    console.log(`  Without summary: ${withoutSummary.length}`);

    if (withoutSummary.length > 0) {
      console.log('\nArticles needing summarization:');
      withoutSummary.slice(0, 5).forEach((article, i) => {
        console.log(`  ${i + 1}. ${article.title.substring(0, 60)}...`);
      });
      if (withoutSummary.length > 5) {
        console.log(`  ... and ${withoutSummary.length - 5} more`);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
