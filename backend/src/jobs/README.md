# Background Job System

This directory contains the background job processing system for RadiAi, implemented using BullMQ and Redis.

## Overview

The job system handles asynchronous tasks such as:
- Fetching articles from RSS feeds
- Summarizing articles with AI
- Generating embeddings for semantic search
- Creating daily audio episodes

## Architecture

### Components

1. **Redis Connection** (`../config/redis.ts`)
   - Manages Redis connection for job queue
   - Configured via environment variables

2. **Queue Configuration** (`queue.ts`)
   - Defines job queues for different task types
   - Configures retry policies and job retention
   - Provides helper functions to add jobs

3. **Workers** (`workers.ts`)
   - Processes jobs from queues
   - Implements job handlers (to be completed in future tasks)
   - Manages concurrency and error handling

## Job Types

### 1. Fetch Articles (`FETCH_ARTICLES`)
- Fetches articles from RSS feeds
- Retry: 5 attempts with exponential backoff (5s initial delay)
- Concurrency: 1

### 2. Summarize Articles (`SUMMARIZE_ARTICLES`)
- Generates AI summaries for articles
- Retry: 3 attempts with exponential backoff (2s initial delay)
- Concurrency: 2

### 3. Generate Embeddings (`GENERATE_EMBEDDINGS`)
- Creates vector embeddings for semantic search
- Retry: 3 attempts with exponential backoff (2s initial delay)
- Concurrency: 2

### 4. Generate Episodes (`GENERATE_EPISODES`)
- Creates daily audio episodes for users
- Retry: 3 attempts with exponential backoff (5s initial delay)
- Concurrency: 1

## Configuration

### Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Queue Options

Each queue is configured with:
- **Retry Policy**: Exponential backoff with configurable attempts
- **Job Retention**: 
  - Completed jobs: Keep last 100 for 24 hours
  - Failed jobs: Keep last 500 for 7 days

## Usage

### Adding Jobs to Queue

```typescript
import { 
  addFetchArticlesJob,
  addSummarizeArticlesJob,
  addGenerateEmbeddingsJob,
  addGenerateEpisodesJob 
} from './jobs';

// Add a job to fetch articles
await addFetchArticlesJob({ feedIds: ['feed-id-1', 'feed-id-2'] });

// Add a job to summarize articles
await addSummarizeArticlesJob({ articleIds: ['article-id-1'], batchSize: 10 });

// Add a job to generate embeddings
await addGenerateEmbeddingsJob({ articleIds: ['article-id-1'], batchSize: 10 });

// Add a job to generate episodes
await addGenerateEpisodesJob({ userIds: ['user-id-1'] });
```

### Starting Workers

Workers are automatically started when imported. To start all workers:

```typescript
import './jobs/workers';
```

### Graceful Shutdown

```typescript
import { closeQueues, closeWorkers } from './jobs';

// On application shutdown
await closeWorkers();
await closeQueues();
```

## Development

### Prerequisites

1. Install Redis locally or use a Redis service
2. Configure Redis connection in `.env` file
3. Install dependencies: `npm install`

### Testing

Job processors will be implemented in future tasks:
- Task 4.5: Implement `processFetchArticles`
- Task 6.3: Implement `processSummarizeArticles`
- Task 7.4: Implement `processGenerateEmbeddings`
- Task 10.1: Implement `processGenerateEpisodes`

### Monitoring

Queue events are available for monitoring:
- `articleFetchQueueEvents`
- `summarizationQueueEvents`
- `embeddingQueueEvents`
- `episodeQueueEvents`

Example:
```typescript
import { articleFetchQueueEvents } from './jobs';

articleFetchQueueEvents.on('completed', ({ jobId }) => {
  console.log(`Job ${jobId} completed`);
});

articleFetchQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed: ${failedReason}`);
});
```

## Future Enhancements

- Add scheduled jobs using BullMQ's repeat functionality
- Implement job progress tracking
- Add job priority levels
- Create admin dashboard for queue monitoring
- Add metrics and alerting
