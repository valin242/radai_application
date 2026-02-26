import dotenv from 'dotenv';
import { prisma } from './src/lib/prisma';
import {
  addSummarizeArticlesJob,
  addGenerateEmbeddingsJob,
  addGenerateEpisodesJob,
  closeQueues,
} from './src/jobs/queue';

dotenv.config();

async function triggerQuickEpisode() {
  console.log('Starting quick episode generation...\n');

  try {
    // Get your user
    const user = await prisma.user.findUnique({
      where: { email: 'valin242.vp@gmail.com' },
    });

    if (!user) {
      console.error('User not found!');
      process.exit(1);
    }

    console.log(`Found user: ${user.email}\n`);

    // Get 5 most recent articles without summaries
    const articlesToProcess = await prisma.article.findMany({
      where: {
        summary: null,
        feed: {
          userId: user.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: {
        id: true,
        title: true,
      },
    });

    console.log(`Found ${articlesToProcess.length} articles to process:`);
    articlesToProcess.forEach((article, i) => {
      console.log(`  ${i + 1}. ${article.title}`);
    });
    console.log();

    if (articlesToProcess.length === 0) {
      console.log('No articles to process. All articles already have summaries!');
      console.log('Proceeding to episode generation...\n');
    } else {
      // Step 1: Summarize just these articles
      console.log('Step 1: Summarizing articles...');
      await addSummarizeArticlesJob({
        articleIds: articlesToProcess.map((a) => a.id),
        batchSize: 5,
      });
      console.log('✓ Summarization job queued\n');

      // Wait for summarization
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 2: Generate embeddings for these articles
      console.log('Step 2: Generating embeddings...');
      await addGenerateEmbeddingsJob({
        articleIds: articlesToProcess.map((a) => a.id),
        batchSize: 5,
      });
      console.log('✓ Embedding generation job queued\n');

      // Wait for embeddings
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Step 3: Generate episode for your user only
    console.log('Step 3: Generating episode...');
    await addGenerateEpisodesJob({
      userIds: [user.id],
    });
    console.log('✓ Episode generation job queued\n');

    console.log('All jobs queued successfully!');
    console.log('Check the backend logs to monitor progress.');
    console.log('\nThis should take 1-2 minutes.');
    console.log('Then refresh the Episodes tab in your app!\n');
  } catch (error) {
    console.error('Error triggering episode generation:', error);
    process.exit(1);
  } finally {
    await closeQueues();
    await prisma.$disconnect();
    process.exit(0);
  }
}

triggerQuickEpisode();
