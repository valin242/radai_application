/**
 * Record test statistics for testuser@gmail.com
 */

import prisma from './src/lib/prisma';

async function main() {
  const userEmail = 'testuser@gmail.com';
  
  console.log(`Recording test statistics for: ${userEmail}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    // Count articles for this user
    const totalArticles = await prisma.article.count({
      where: {
        feed: {
          userId: user.id
        }
      }
    });

    console.log(`Found ${totalArticles} articles for user`);

    // For testing, let's say 80% were included and 20% filtered
    const includedArticles = Math.floor(totalArticles * 0.8);
    const filteredOutArticles = totalArticles - includedArticles;

    // Record statistics
    await prisma.filteringStatistics.create({
      data: {
        userId: user.id,
        date: new Date(),
        includedArticles,
        filteredOutArticles,
      }
    });

    console.log('\n✓ Statistics recorded successfully!');
    console.log(`  Total articles: ${totalArticles}`);
    console.log(`  Included: ${includedArticles}`);
    console.log(`  Filtered out: ${filteredOutArticles}`);
    console.log(`  Inclusion rate: ${((includedArticles / totalArticles) * 100).toFixed(1)}%`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
