import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  JobType,
  articleFetchQueue,
  summarizationQueue,
  embeddingQueue,
  episodeQueue,
  closeQueues,
} from './queue';

describe('Job Queue Configuration', () => {
  afterAll(async () => {
    // Clean up queues after tests
    // Note: This may timeout if Redis is not running, which is expected in test environments
    try {
      await Promise.race([
        closeQueues(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 2000)
        ),
      ]);
    } catch (error) {
      // Ignore timeout errors during cleanup when Redis is not available
      console.log('Queue cleanup skipped (Redis not available)');
    }
  }, 3000); // Increase timeout for cleanup

  it('should create article fetch queue with correct name', () => {
    expect(articleFetchQueue.name).toBe(JobType.FETCH_ARTICLES);
  });

  it('should create summarization queue with correct name', () => {
    expect(summarizationQueue.name).toBe(JobType.SUMMARIZE_ARTICLES);
  });

  it('should create embedding queue with correct name', () => {
    expect(embeddingQueue.name).toBe(JobType.GENERATE_EMBEDDINGS);
  });

  it('should create episode queue with correct name', () => {
    expect(episodeQueue.name).toBe(JobType.GENERATE_EPISODES);
  });

  it('should have retry configuration for article fetch queue', () => {
    const opts = articleFetchQueue.opts.defaultJobOptions;
    expect(opts?.attempts).toBe(5);
    expect(opts?.backoff).toEqual({
      type: 'exponential',
      delay: 5000,
    });
  });

  it('should have retry configuration for summarization queue', () => {
    const opts = summarizationQueue.opts.defaultJobOptions;
    expect(opts?.attempts).toBe(3);
    expect(opts?.backoff).toEqual({
      type: 'exponential',
      delay: 2000,
    });
  });

  it('should have job retention settings', () => {
    const opts = articleFetchQueue.opts.defaultJobOptions;
    expect(opts?.removeOnComplete).toEqual({
      count: 100,
      age: 24 * 3600,
    });
    expect(opts?.removeOnFail).toEqual({
      count: 500,
      age: 7 * 24 * 3600,
    });
  });
});
