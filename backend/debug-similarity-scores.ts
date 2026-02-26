/**
 * Debug similarity scores to see why articles are being filtered
 */

import prisma from './src/lib/prisma';
import { getUserInterestProfile } from './src/lib/interest-profile-manager';
import { computeSimilarity } from './src/lib/content-filter';

async function main() {
  const userEmail = 'testuser@gmail.com';
  
  console.log(`Debugging similarity scores for: ${userEmail}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    // Get user's interest profile
    const { embedding: interestEmbedding, relevanceThreshold } = 
      await getUserInterestProfile(user.id);
    
    console.log(`Relevance threshold: ${relevanceThreshold}% (${relevanceThreshold / 100})`);
    console.log(`Interest profile embedding dimensions: ${interestEmbedding.length}\n`);

    // Get articles with embeddings
    const articles = await prisma.$queryRaw<Array<{
      id: string;
      title: string;
      embedding: string;
    }>>`
      SELECT id, title, embedding::text as embedding
      FROM articles
      WHERE feed_id IN (
        SELECT id FROM feeds WHERE user_id = ${user.id}
      )
      AND embedding IS NOT NULL
      LIMIT 10
    `;

    console.log(`Found ${articles.length} articles with embeddings\n`);
    console.log('Similarity scores:');
    console.log('='.repeat(80));

    const scores: Array<{ title: string; similarity: number; passes: boolean }> = [];

    for (const article of articles) {
      // Parse embedding from string
      const embedding = JSON.parse(article.embedding);
      
      // Compute similarity
      const similarity = computeSimilarity(embedding, interestEmbedding);
      const passes = similarity >= (relevanceThreshold / 100);
      
      scores.push({
        title: article.title.substring(0, 60),
        similarity,
        passes
      });
    }

    // Sort by similarity descending
    scores.sort((a, b) => b.similarity - a.similarity);

    scores.forEach((score, i) => {
      const status = score.passes ? '✓ PASS' : '✗ FAIL';
      console.log(`${i + 1}. ${status} ${(score.similarity * 100).toFixed(1)}% - ${score.title}`);
    });

    console.log('='.repeat(80));
    console.log(`\nPassing articles: ${scores.filter(s => s.passes).length} / ${scores.length}`);
    console.log(`Highest score: ${(Math.max(...scores.map(s => s.similarity)) * 100).toFixed(1)}%`);
    console.log(`Lowest score: ${(Math.min(...scores.map(s => s.similarity)) * 100).toFixed(1)}%`);
    console.log(`Average score: ${((scores.reduce((sum, s) => sum + s.similarity, 0) / scores.length) * 100).toFixed(1)}%`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
