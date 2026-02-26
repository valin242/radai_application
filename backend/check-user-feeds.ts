/**
 * Check feeds for a specific user
 */

import prisma from './src/lib/prisma';

async function main() {
  const userEmail = 'testuser@gmail.com';
  
  console.log(`Checking feeds for: ${userEmail}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        feeds: {
          include: {
            articles: {
              take: 3,
              orderBy: { publishedAt: 'desc' }
            }
          }
        },
        preferences: true
      }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    console.log('User ID:', user.id);
    console.log('Onboarding completed:', user.preferences?.onboardingCompleted || false);
    console.log('\nFeeds:', user.feeds.length);
    
    let totalArticles = 0;
    user.feeds.forEach((feed, i) => {
      console.log(`\n${i + 1}. ${feed.name || 'Unnamed'}`);
      console.log(`   URL: ${feed.url}`);
      console.log(`   Category: ${feed.category || 'None'}`);
      console.log(`   Popular: ${feed.isPopular}`);
      console.log(`   Articles: ${feed.articles.length}`);
      totalArticles += feed.articles.length;
      
      feed.articles.forEach((article, j) => {
        console.log(`     ${j + 1}. ${article.title.substring(0, 60)}...`);
      });
    });

    console.log(`\nTotal articles across all feeds: ${totalArticles}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
