/**
 * Test the full article processing pipeline for testuser@gmail.com
 * This will help identify any snake_case vs camelCase issues
 */

import prisma from './src/lib/prisma';
import { processArticlesForUser } from './src/lib/article-processing-pipeline';
import { createLogger } from './src/lib/logger';

const logger = createLogger({ component: 'pipeline-test' });

async function main() {
  const userEmail = 'testuser@gmail.com';
  
  console.log(`Testing full pipeline for: ${userEmail}\n`);
  console.log('This will:');
  console.log('1. Fetch articles from RSS feeds');
  console.log('2. Generate embeddings');
  console.log('3. Apply content filtering');
  console.log('4. Store with deduplication');
  console.log('5. Record statistics\n');

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found user: ${user.email} (${user.id})`);
    console.log('Starting pipeline...\n');

    // Run the full pipeline
    const result = await processArticlesForUser(user.id);

    console.log('\n' + '='.repeat(60));
    console.log('Pipeline Result:');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Total Fetched: ${result.totalFetched}`);
    console.log(`Total Filtered Out: ${result.totalFiltered}`);
    console.log(`Total Stored: ${result.totalStored}`);
    console.log(`Total Skipped (duplicates): ${result.totalSkipped}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    console.log('='.repeat(60));

    // Check statistics were recorded
    console.log('\nChecking recorded statistics...');
    const stats = await prisma.filteringStatistics.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 1
    });

    if (stats.length > 0) {
      const stat = stats[0];
      console.log('✓ Statistics recorded:');
      console.log(`  Included: ${stat.includedArticles}`);
      console.log(`  Filtered out: ${stat.filteredOutArticles}`);
      console.log(`  Total: ${stat.includedArticles + stat.filteredOutArticles}`);
      console.log(`  Date: ${stat.date}`);
    } else {
      console.log('⚠ No statistics found');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Pipeline failed with error:');
    console.error(error);
    logger.error('Pipeline test failed', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
