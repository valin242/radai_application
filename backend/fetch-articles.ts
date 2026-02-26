/**
 * Manually fetch articles from all user feeds
 * This will fetch articles from RSS feeds and store them in the database
 */

import prisma from './src/lib/prisma';
import { parseRSSFeed } from './src/lib/rss-parser';
import { createLogger } from './src/lib/logger';

const logger = createLogger({ component: 'fetch-articles-script' });

async function fetchArticlesForUser(userId: string, userEmail: string) {
  console.log(`\nFetching articles for user: ${userEmail}`);
  
  // Get user's feeds
  const feeds = await prisma.feed.findMany({
    where: { userId }
  });

  if (feeds.length === 0) {
    console.log('  No feeds found for this user');
    return { total: 0, new: 0, errors: 0 };
  }

  console.log(`  Found ${feeds.length} feeds`);
  
  let totalArticles = 0;
  let newArticles = 0;
  let errors = 0;

  for (const feed of feeds) {
    try {
      console.log(`  Fetching from: ${feed.url}`);
      
      // Parse RSS feed
      const result = await parseRSSFeed(feed.url);
      
      if (!result.success) {
        console.log(`    ❌ Error: ${result.error}`);
        errors++;
        continue;
      }
      
      const articles = result.articles;
      console.log(`    Found ${articles.length} articles in feed`);
      
      // Store articles in database
      for (const article of articles) {
        try {
          // Check if article already exists (by title and feed)
          const existing = await prisma.article.findFirst({
            where: {
              feedId: feed.id,
              title: article.title
            }
          });

          if (existing) {
            totalArticles++;
            continue;
          }

          // Create new article
          await prisma.article.create({
            data: {
              feedId: feed.id,
              title: article.title,
              content: article.content || '',
              publishedAt: article.publishedAt,
            }
          });

          newArticles++;
          totalArticles++;
        } catch (error) {
          logger.error('Error storing article', error, { articleTitle: article.title });
          errors++;
        }
      }
      
      console.log(`    Stored ${newArticles} new articles`);
    } catch (error) {
      logger.error('Error fetching feed', error, { feedUrl: feed.url });
      console.log(`    ❌ Error fetching feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errors++;
    }
  }

  return { total: totalArticles, new: newArticles, errors };
}

async function main() {
  console.log('Starting article fetch...\n');

  try {
    // Get all users with feeds
    const users = await prisma.user.findMany({
      where: {
        feeds: {
          some: {}
        }
      },
      select: {
        id: true,
        email: true
      }
    });

    if (users.length === 0) {
      console.log('No users with feeds found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${users.length} users with feeds\n`);

    let totalNew = 0;
    let totalErrors = 0;

    for (const user of users) {
      const result = await fetchArticlesForUser(user.id, user.email);
      totalNew += result.new;
      totalErrors += result.errors;
    }

    console.log('\n' + '='.repeat(50));
    console.log('Summary:');
    console.log(`  Total new articles: ${totalNew}`);
    console.log(`  Total errors: ${totalErrors}`);
    console.log('='.repeat(50));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
