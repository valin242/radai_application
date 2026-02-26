/**
 * Manually trigger article processing (summarization and embeddings)
 */

import prisma from './src/lib/prisma';
import { summarizeArticle } from './src/lib/article-summarization';
import { generateArticleEmbedding } from './src/lib/article-embedding';
import { createLogger } from './src/lib/logger';

const logger = createLogger({ component: 'article-processing-script' });

async function processArticlesForUser(userId: string, userEmail: string) {
  console.log(`\nProcessing articles for: ${userEmail}`);
  
  // Get articles without summaries
  const articles = await prisma.article.findMany({
    where: {
      feed: {
        userId
      },
      summary: null
    },
    take: 10, // Process 10 at a time
    orderBy: {
      publishedAt: 'desc'
    }
  });

  if (articles.length === 0) {
    console.log('  No articles to process');
    return { processed: 0, errors: 0 };
  }

  console.log(`  Found ${articles.length} articles to process`);
  
  let processed = 0;
  let errors = 0;

  for (const article of articles) {
    try {
      console.log(`  Processing: ${article.title.substring(0, 50)}...`);
      
      // Generate summary
      const summary = await summarizeArticle(article.title, article.content);
      
      // Generate embedding from summary
      const embedding = await generateArticleEmbedding(summary);
      
      // Update article with summary and embedding
      await prisma.$executeRaw`
        UPDATE articles 
        SET summary = ${summary}, 
            embedding = ${embedding}::vector 
        WHERE id = ${article.id}
      `;
      
      processed++;
      console.log(`    ✓ Processed`);
    } catch (error) {
      logger.error('Error processing article', error, { articleId: article.id });
      console.log(`    ✗ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      errors++;
    }
  }

  return { processed, errors };
}

async function main() {
  console.log('Starting article processing...\n');

  try {
    const userEmail = 'testuser@gmail.com';
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    const result = await processArticlesForUser(user.id, user.email);

    console.log('\n' + '='.repeat(50));
    console.log('Summary:');
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Errors: ${result.errors}`);
    console.log('='.repeat(50));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
