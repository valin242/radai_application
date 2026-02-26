import { Worker, Job } from 'bullmq';
import { redisOptions } from '../config/redis';
import {
  JobType,
  FetchArticlesJobData,
  SummarizeArticlesJobData,
  GenerateEmbeddingsJobData,
  GenerateEpisodesJobData,
} from './queue';
import { prisma } from '../lib/prisma';
import { parseRSSFeed } from '../lib/rss-parser';
import { storeArticlesWithDeduplication } from '../lib/article-deduplication';
import { createLogger } from '../lib/logger';

const logger = createLogger({ component: 'background-jobs' });

// Worker processors
const processFetchArticles = async (
  job: Job<FetchArticlesJobData>
): Promise<void> => {
  const jobLogger = logger.child({ jobId: job.id, jobType: JobType.FETCH_ARTICLES });
  jobLogger.info('Processing fetch articles job', { data: job.data });

  const { feedIds } = job.data;

  // Fetch all feeds or specific feeds if feedIds provided
  const feeds = feedIds
    ? await prisma.feed.findMany({
        where: { id: { in: feedIds } },
      })
    : await prisma.feed.findMany();

  jobLogger.info(`Fetching articles from ${feeds.length} feeds`);

  let totalStored = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  // Process each feed
  for (const feed of feeds) {
    try {
      jobLogger.info(`Fetching feed: ${feed.url}`, { feedId: feed.id });

      // Parse RSS feed
      const parseResult = await parseRSSFeed(feed.url);

      if (!parseResult.success) {
        const errorMsg = `Failed to parse feed ${feed.url}: ${parseResult.error}`;
        jobLogger.error(errorMsg, undefined, { feedId: feed.id, feedUrl: feed.url });
        errors.push(errorMsg);
        continue; // Continue processing other feeds
      }

      jobLogger.info(
        `Parsed ${parseResult.articles.length} articles from ${feed.url}`,
        { feedId: feed.id, articleCount: parseResult.articles.length }
      );

      // Store articles with deduplication
      const storeResult = await storeArticlesWithDeduplication(
        feed.id,
        parseResult.articles
      );

      totalStored += storeResult.stored;
      totalSkipped += storeResult.skipped;

      if (storeResult.errors.length > 0) {
        errors.push(...storeResult.errors);
      }

      jobLogger.info(
        `Feed ${feed.url}: stored ${storeResult.stored}, skipped ${storeResult.skipped}`,
        { feedId: feed.id, stored: storeResult.stored, skipped: storeResult.skipped }
      );
    } catch (error) {
      const errorMsg = `Error processing feed ${feed.url}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      jobLogger.error(errorMsg, error, { feedId: feed.id, feedUrl: feed.url });
      errors.push(errorMsg);
      // Continue processing other feeds
    }
  }

  jobLogger.info(
    `Article fetch job completed: ${totalStored} stored, ${totalSkipped} skipped, ${errors.length} errors`,
    { totalStored, totalSkipped, errorCount: errors.length }
  );

  if (errors.length > 0) {
    jobLogger.error('Errors during article fetch', undefined, { errors });
  }

  // Update job progress
  await job.updateProgress(100);
};

const processSummarizeArticles = async (
  job: Job<SummarizeArticlesJobData>
): Promise<void> => {
  const jobLogger = logger.child({ jobId: job.id, jobType: JobType.SUMMARIZE_ARTICLES });
  jobLogger.info('Processing summarize articles job', { data: job.data });

  const { articleIds, batchSize = 10 } = job.data;

  // Query articles where summary IS NULL
  const whereClause = {
    summary: null,
    ...(articleIds && articleIds.length > 0 ? { id: { in: articleIds } } : {}),
  };

  const articlesToSummarize = await prisma.article.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      content: true,
    },
  });

  jobLogger.info(`Found ${articlesToSummarize.length} articles to summarize`);

  if (articlesToSummarize.length === 0) {
    jobLogger.info('No articles to summarize');
    await job.updateProgress(100);
    return;
  }

  let totalSummarized = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  // Process articles in batches
  for (let i = 0; i < articlesToSummarize.length; i += batchSize) {
    const batch = articlesToSummarize.slice(i, i + batchSize);
    jobLogger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
        articlesToSummarize.length / batchSize
      )} (${batch.length} articles)`
    );

    // Process each article in the batch
    for (const article of batch) {
      try {
        // Import summarizeArticle function
        const { summarizeArticle } = await import('../lib/article-summarization');
        
        // Generate summary
        const summary = await summarizeArticle(article.title, article.content);

        // Update article record with summary
        await prisma.article.update({
          where: { id: article.id },
          data: { summary },
        });

        totalSummarized++;
        jobLogger.info(`Summarized article: ${article.title}`, { articleId: article.id });
      } catch (error) {
        totalFailed++;
        const errorMsg = `Failed to summarize article "${article.title}": ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        jobLogger.error(errorMsg, error, { articleId: article.id, articleTitle: article.title });
        errors.push(errorMsg);
        // Continue processing other articles
      }
    }

    // Update job progress
    const progress = Math.min(
      100,
      Math.floor(((i + batch.length) / articlesToSummarize.length) * 100)
    );
    await job.updateProgress(progress);
  }

  jobLogger.info(
    `Summarization job completed: ${totalSummarized} summarized, ${totalFailed} failed`,
    { totalSummarized, totalFailed }
  );

  if (errors.length > 0) {
    jobLogger.error('Errors during summarization', undefined, { errors });
  }

  await job.updateProgress(100);
};

const processGenerateEmbeddings = async (
  job: Job<GenerateEmbeddingsJobData>
): Promise<void> => {
  const jobLogger = logger.child({ jobId: job.id, jobType: JobType.GENERATE_EMBEDDINGS });
  jobLogger.info('Processing generate embeddings job', { data: job.data });

  const { articleIds, batchSize = 10 } = job.data;

  // Query articles where embedding IS NULL and summary IS NOT NULL using raw SQL
  // since Prisma doesn't support querying Unsupported fields
  const articlesToEmbed: Array<{ id: string; summary: string }> = articleIds && articleIds.length > 0
    ? await prisma.$queryRaw`
        SELECT id, summary 
        FROM articles 
        WHERE id::text = ANY(${articleIds})
          AND embedding IS NULL 
          AND summary IS NOT NULL
      `
    : await prisma.$queryRaw`
        SELECT id, summary 
        FROM articles 
        WHERE embedding IS NULL 
          AND summary IS NOT NULL
      `;

  jobLogger.info(`Found ${articlesToEmbed.length} articles to generate embeddings for`);

  if (articlesToEmbed.length === 0) {
    jobLogger.info('No articles to generate embeddings for');
    await job.updateProgress(100);
    return;
  }

  let totalEmbedded = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  // Process articles in batches
  for (let i = 0; i < articlesToEmbed.length; i += batchSize) {
    const batch = articlesToEmbed.slice(i, i + batchSize);
    jobLogger.info(
      `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
        articlesToEmbed.length / batchSize
      )} (${batch.length} articles)`
    );

    // Import embedding generation function
    const { generateArticleEmbeddingsBatch } = await import('../lib/article-embedding');

    // Generate embeddings for batch
    const results = await generateArticleEmbeddingsBatch(
      batch.map((article) => ({
        id: article.id,
        summary: article.summary,
      }))
    );

    // Update article records with embeddings
    for (const result of results) {
      if (result.success && result.embedding) {
        try {
          // Update article with embedding using raw SQL for pgvector
          const embeddingJson = JSON.stringify(result.embedding);
          await prisma.$executeRawUnsafe(
            `UPDATE articles SET embedding = $1::vector WHERE id = $2`,
            embeddingJson,
            result.id
          );

          totalEmbedded++;
          jobLogger.info(`Generated embedding for article ${result.id}`, { articleId: result.id });
        } catch (error) {
          totalFailed++;
          const errorMsg = `Failed to store embedding for article ${result.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
          jobLogger.error(errorMsg, error, { articleId: result.id });
          errors.push(errorMsg);
        }
      } else {
        totalFailed++;
        const errorMsg = `Failed to generate embedding for article ${result.id}: ${
          result.error || 'Unknown error'
        }`;
        jobLogger.error(errorMsg, undefined, { articleId: result.id });
        errors.push(errorMsg);
      }
    }

    // Update job progress
    const progress = Math.min(
      100,
      Math.floor(((i + batch.length) / articlesToEmbed.length) * 100)
    );
    await job.updateProgress(progress);
  }

  jobLogger.info(
    `Embedding generation job completed: ${totalEmbedded} embedded, ${totalFailed} failed`,
    { totalEmbedded, totalFailed }
  );

  if (errors.length > 0) {
    jobLogger.error('Errors during embedding generation', undefined, { errors });
  }

  await job.updateProgress(100);
};

const processGenerateEpisodes = async (
  job: Job<GenerateEpisodesJobData>
): Promise<void> => {
  const jobLogger = logger.child({ jobId: job.id, jobType: JobType.GENERATE_EPISODES });
  jobLogger.info('Processing generate episodes job', { data: job.data });

  const { userIds } = job.data;

  // Query all users or specific users if userIds provided
  const users = userIds
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, tier: true },
      })
    : await prisma.user.findMany({
        select: { id: true, email: true, tier: true },
      });

  console.log(`Generating episodes for ${users.length} users`);

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  // Process each user
  for (const user of users) {
    try {
      jobLogger.info(`Processing user: ${user.email} (${user.id})`, { userId: user.id, userEmail: user.email });

      // Check if episode already exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingEpisode = await prisma.episode.findFirst({
        where: {
          userId: user.id,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existingEpisode) {
        jobLogger.info(`Episode already exists for user ${user.email} today, skipping`, { userId: user.id });
        totalSkipped++;
        continue;
      }

      // Import required functions
      const { generateEpisodeScriptWithCache } = await import('../lib/episode-script-generation');
      const { audioGenerationService } = await import('../lib/audio-generation');

      // Generate script from recent articles
      // Note: For users with completed onboarding and interest profiles,
      // only filtered articles (stored by article-processing-pipeline) are used.
      // For users without interest profiles, all articles are used (fail open).
      // Requirements: 3.5, 9.2, 9.3
      jobLogger.info(`Generating script for user ${user.email}...`, { userId: user.id });
      const scriptResult = await generateEpisodeScriptWithCache(user.id);

      const { scriptText, articleIds, durationMinutes, cachedAudioUrl } = scriptResult;

      jobLogger.info(`Script generated: ${scriptText.length} characters, ${articleIds.length} articles`, {
        userId: user.id,
        scriptLength: scriptText.length,
        articleCount: articleIds.length
      });

      // Generate or retrieve cached audio
      let audioUrl: string;
      if (cachedAudioUrl) {
        jobLogger.info(`Using cached audio for user ${user.email}`, { userId: user.id });
        audioUrl = cachedAudioUrl;
      } else {
        jobLogger.info(`Generating new audio for user ${user.email}...`, { userId: user.id });
        const audioResult = await audioGenerationService.generateEpisodeAudio(scriptText);
        audioUrl = audioResult.audioUrl;
        jobLogger.info(`Audio generated: ${audioUrl}`, { userId: user.id, audioUrl });
      }

      // Calculate audio duration (estimate based on script length)
      const calculatedDuration = audioGenerationService.calculateEstimatedDuration(scriptText);

      // Create episode record with all metadata
      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText,
          audioUrl,
          durationMinutes: Math.min(calculatedDuration, durationMinutes), // Use the smaller of calculated or tier limit
        },
      });

      jobLogger.info(`Episode created: ${episode.id}`, { userId: user.id, episodeId: episode.id });

      // Link articles to episode via junction table
      if (articleIds.length > 0) {
        await prisma.episodeArticle.createMany({
          data: articleIds.map((articleId) => ({
            episodeId: episode.id,
            articleId,
          })),
        });
        jobLogger.info(`Linked ${articleIds.length} articles to episode ${episode.id}`, {
          userId: user.id,
          episodeId: episode.id,
          articleCount: articleIds.length
        });
      }

      totalGenerated++;
      jobLogger.info(`Successfully generated episode for user ${user.email}`, { userId: user.id, episodeId: episode.id });
    } catch (error) {
      totalFailed++;
      const errorMsg = `Failed to generate episode for user ${user.email}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      jobLogger.error(errorMsg, error, { userId: user.id, userEmail: user.email });
      errors.push(errorMsg);
      // Continue processing other users
    }
  }

  jobLogger.info(
    `Episode generation job completed: ${totalGenerated} generated, ${totalSkipped} skipped, ${totalFailed} failed`,
    { totalGenerated, totalSkipped, totalFailed }
  );

  if (errors.length > 0) {
    jobLogger.error('Errors during episode generation', undefined, { errors });
  }

  await job.updateProgress(100);
};

// Create workers
export const articleFetchWorker = new Worker<FetchArticlesJobData>(
  JobType.FETCH_ARTICLES,
  processFetchArticles,
  {
    connection: redisOptions,
    concurrency: 1, // Process one job at a time
  }
);

export const summarizationWorker = new Worker<SummarizeArticlesJobData>(
  JobType.SUMMARIZE_ARTICLES,
  processSummarizeArticles,
  {
    connection: redisOptions,
    concurrency: 2, // Process up to 2 jobs concurrently
  }
);

export const embeddingWorker = new Worker<GenerateEmbeddingsJobData>(
  JobType.GENERATE_EMBEDDINGS,
  processGenerateEmbeddings,
  {
    connection: redisOptions,
    concurrency: 2,
  }
);

export const episodeWorker = new Worker<GenerateEpisodesJobData>(
  JobType.GENERATE_EPISODES,
  processGenerateEpisodes,
  {
    connection: redisOptions,
    concurrency: 1,
  }
);

// Worker event handlers
articleFetchWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`, { jobId: job.id, jobType: JobType.FETCH_ARTICLES });
});

articleFetchWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed`, err, { jobId: job?.id, jobType: JobType.FETCH_ARTICLES });
});

articleFetchWorker.on('retries-exhausted', (job, err) => {
  logger.error(`Job ${job.id} exhausted all retry attempts`, err, { 
    jobId: job.id, 
    jobType: JobType.FETCH_ARTICLES,
    attempts: job.attemptsMade 
  });
});

summarizationWorker.on('completed', (job) => {
  logger.info(`Summarization job ${job.id} completed successfully`, { jobId: job.id, jobType: JobType.SUMMARIZE_ARTICLES });
});

summarizationWorker.on('failed', (job, err) => {
  logger.error(`Summarization job ${job?.id} failed`, err, { jobId: job?.id, jobType: JobType.SUMMARIZE_ARTICLES });
});

summarizationWorker.on('retries-exhausted', (job, err) => {
  logger.error(`Summarization job ${job.id} exhausted all retry attempts`, err, { 
    jobId: job.id, 
    jobType: JobType.SUMMARIZE_ARTICLES,
    attempts: job.attemptsMade 
  });
});

embeddingWorker.on('completed', (job) => {
  logger.info(`Embedding job ${job.id} completed successfully`, { jobId: job.id, jobType: JobType.GENERATE_EMBEDDINGS });
});

embeddingWorker.on('failed', (job, err) => {
  logger.error(`Embedding job ${job?.id} failed`, err, { jobId: job?.id, jobType: JobType.GENERATE_EMBEDDINGS });
});

embeddingWorker.on('retries-exhausted', (job, err) => {
  logger.error(`Embedding job ${job.id} exhausted all retry attempts`, err, { 
    jobId: job.id, 
    jobType: JobType.GENERATE_EMBEDDINGS,
    attempts: job.attemptsMade 
  });
});

episodeWorker.on('completed', (job) => {
  logger.info(`Episode job ${job.id} completed successfully`, { jobId: job.id, jobType: JobType.GENERATE_EPISODES });
});

episodeWorker.on('failed', (job, err) => {
  logger.error(`Episode job ${job?.id} failed`, err, { jobId: job?.id, jobType: JobType.GENERATE_EPISODES });
});

episodeWorker.on('retries-exhausted', (job, err) => {
  logger.error(`Episode job ${job.id} exhausted all retry attempts`, err, { 
    jobId: job.id, 
    jobType: JobType.GENERATE_EPISODES,
    attempts: job.attemptsMade 
  });
});

// Graceful shutdown function
export const closeWorkers = async (): Promise<void> => {
  logger.info('Closing workers...');
  await Promise.all([
    articleFetchWorker.close(),
    summarizationWorker.close(),
    embeddingWorker.close(),
    episodeWorker.close(),
  ]);
  logger.info('All workers closed');
};
