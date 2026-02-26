import { Queue, QueueEvents } from 'bullmq';
import { redisOptions } from '../config/redis';

// Define job types
export enum JobType {
  FETCH_ARTICLES = 'fetch_articles',
  SUMMARIZE_ARTICLES = 'summarize_articles',
  GENERATE_EMBEDDINGS = 'generate_embeddings',
  GENERATE_EPISODES = 'generate_episodes',
}

// Job data interfaces
export interface FetchArticlesJobData {
  feedIds?: string[];
}

export interface SummarizeArticlesJobData {
  articleIds?: string[];
  batchSize?: number;
}

export interface GenerateEmbeddingsJobData {
  articleIds?: string[];
  batchSize?: number;
}

export interface GenerateEpisodesJobData {
  userIds?: string[];
}

// Create queues for different job types
export const articleFetchQueue = new Queue<FetchArticlesJobData>(
  JobType.FETCH_ARTICLES,
  {
    connection: redisOptions,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5 seconds initial delay
      },
      removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
        age: 24 * 3600, // Keep for 24 hours
      },
      removeOnFail: {
        count: 500, // Keep last 500 failed jobs
        age: 7 * 24 * 3600, // Keep for 7 days
      },
    },
  }
);

export const summarizationQueue = new Queue<SummarizeArticlesJobData>(
  JobType.SUMMARIZE_ARTICLES,
  {
    connection: redisOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600,
      },
    },
  }
);

export const embeddingQueue = new Queue<GenerateEmbeddingsJobData>(
  JobType.GENERATE_EMBEDDINGS,
  {
    connection: redisOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600,
      },
    },
  }
);

export const episodeQueue = new Queue<GenerateEpisodesJobData>(
  JobType.GENERATE_EPISODES,
  {
    connection: redisOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600,
      },
    },
  }
);

// Queue events for monitoring
export const articleFetchQueueEvents = new QueueEvents(JobType.FETCH_ARTICLES, {
  connection: redisOptions,
});

export const summarizationQueueEvents = new QueueEvents(
  JobType.SUMMARIZE_ARTICLES,
  {
    connection: redisOptions,
  }
);

export const embeddingQueueEvents = new QueueEvents(JobType.GENERATE_EMBEDDINGS, {
  connection: redisOptions,
});

export const episodeQueueEvents = new QueueEvents(JobType.GENERATE_EPISODES, {
  connection: redisOptions,
});

// Helper function to add jobs to queues
export const addFetchArticlesJob = async (
  data: FetchArticlesJobData = {}
): Promise<void> => {
  await articleFetchQueue.add(JobType.FETCH_ARTICLES, data);
  console.log('Added fetch articles job to queue');
};

export const addSummarizeArticlesJob = async (
  data: SummarizeArticlesJobData = {}
): Promise<void> => {
  await summarizationQueue.add(JobType.SUMMARIZE_ARTICLES, data);
  console.log('Added summarize articles job to queue');
};

export const addGenerateEmbeddingsJob = async (
  data: GenerateEmbeddingsJobData = {}
): Promise<void> => {
  await embeddingQueue.add(JobType.GENERATE_EMBEDDINGS, data);
  console.log('Added generate embeddings job to queue');
};

export const addGenerateEpisodesJob = async (
  data: GenerateEpisodesJobData = {}
): Promise<void> => {
  await episodeQueue.add(JobType.GENERATE_EPISODES, data);
  console.log('Added generate episodes job to queue');
};

// Graceful shutdown function
export const closeQueues = async (): Promise<void> => {
  console.log('Closing job queues...');
  await Promise.all([
    articleFetchQueue.close(),
    summarizationQueue.close(),
    embeddingQueue.close(),
    episodeQueue.close(),
    articleFetchQueueEvents.close(),
    summarizationQueueEvents.close(),
    embeddingQueueEvents.close(),
    episodeQueueEvents.close(),
  ]);
  console.log('All queues closed');
};
