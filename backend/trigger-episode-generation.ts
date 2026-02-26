import dotenv from 'dotenv';
import {
  addFetchArticlesJob,
  addSummarizeArticlesJob,
  addGenerateEmbeddingsJob,
  addGenerateEpisodesJob,
  closeQueues,
} from './src/jobs/queue';

dotenv.config();

async function triggerEpisodeGeneration() {
  console.log('Starting episode generation workflow...\n');

  try {
    // Step 1: Fetch articles from all feeds
    console.log('Step 1: Fetching articles from RSS feeds...');
    await addFetchArticlesJob({});
    console.log('✓ Article fetch job queued\n');

    // Wait a bit for articles to be fetched
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Summarize articles
    console.log('Step 2: Summarizing articles...');
    await addSummarizeArticlesJob({});
    console.log('✓ Summarization job queued\n');

    // Wait for summarization
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 3: Generate embeddings
    console.log('Step 3: Generating embeddings...');
    await addGenerateEmbeddingsJob({});
    console.log('✓ Embedding generation job queued\n');

    // Wait for embeddings
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 4: Generate episodes
    console.log('Step 4: Generating episodes...');
    await addGenerateEpisodesJob({});
    console.log('✓ Episode generation job queued\n');

    console.log('All jobs queued successfully!');
    console.log('Check the backend logs to monitor progress.');
    console.log('\nNote: The jobs will process in the background.');
    console.log('Episode generation may take several minutes depending on:');
    console.log('  - Number of articles to process');
    console.log('  - OpenAI API response times');
    console.log('  - TTS generation time\n');
  } catch (error) {
    console.error('Error triggering episode generation:', error);
    process.exit(1);
  } finally {
    // Close queues
    await closeQueues();
    process.exit(0);
  }
}

triggerEpisodeGeneration();
