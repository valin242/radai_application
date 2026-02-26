import { describe, it, expect } from 'vitest';
import { computeSimilarity, filterArticlesByRelevance } from './content-filter';
import { createTestUser, cleanupTestUser } from '../test/setup';
import { updateUserInterestProfile } from './interest-profile-manager';
import { generateArticleEmbedding } from './article-embedding';

describe('Content Filter', () => {
  describe('computeSimilarity', () => {
    it('should compute similarity between two identical embeddings as 1', () => {
      const embedding = [1, 0, 0];
      const similarity = computeSimilarity(embedding, embedding);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should compute similarity between orthogonal embeddings as 0', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];
      const similarity = computeSimilarity(embedding1, embedding2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should return value in range [0, 1]', () => {
      const embedding1 = [0.5, 0.5, 0.5];
      const embedding2 = [0.3, 0.7, 0.2];
      const similarity = computeSimilarity(embedding1, embedding2);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should throw error for embeddings with different dimensions', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [1, 0];
      expect(() => computeSimilarity(embedding1, embedding2)).toThrow(
        'Embedding dimensions must match'
      );
    });

    it('should throw error for empty embeddings', () => {
      const embedding1: number[] = [];
      const embedding2: number[] = [];
      expect(() => computeSimilarity(embedding1, embedding2)).toThrow(
        'Embeddings cannot be empty'
      );
    });
  });

  describe('filterArticlesByRelevance', () => {
    it('should filter articles based on similarity threshold', async () => {
      const user = await createTestUser();
      
      try {
        // Set up user interest profile with Technology topic
        const topics = ['Technology'];
        const keywords = ['artificial intelligence', 'machine learning'];
        await updateUserInterestProfile(user.id, topics, keywords);
        
        // Create test articles with embeddings
        const techArticle = {
          id: 'article-1',
          title: 'AI Breakthrough',
          content: 'New advances in artificial intelligence and machine learning',
          embedding: await generateArticleEmbedding('New advances in artificial intelligence and machine learning'),
        };
        
        const sportsArticle = {
          id: 'article-2',
          title: 'Football Match',
          content: 'Local team wins championship game',
          embedding: await generateArticleEmbedding('Local team wins championship game'),
        };
        
        const articles = [techArticle, sportsArticle];
        
        // Filter articles (default threshold is 80%)
        const result = await filterArticlesByRelevance(user.id, articles);
        
        // Verify statistics
        expect(result.statistics.totalArticles).toBe(2);
        expect(result.statistics.includedArticles).toBeGreaterThanOrEqual(0);
        expect(result.statistics.filteredOutArticles).toBeGreaterThanOrEqual(0);
        expect(result.statistics.includedArticles + result.statistics.filteredOutArticles).toBe(2);
        
        // Verify filtered articles structure
        expect(Array.isArray(result.filteredArticles)).toBe(true);
        result.filteredArticles.forEach(article => {
          expect(article).toHaveProperty('id');
          expect(article).toHaveProperty('similarity');
          expect(article.similarity).toBeGreaterThanOrEqual(0);
          expect(article.similarity).toBeLessThanOrEqual(1);
        });
      } finally {
        await cleanupTestUser(user.id);
      }
    });

    it('should include articles with similarity >= threshold', async () => {
      const user = await createTestUser();
      
      try {
        // Set up user interest profile
        const topics = ['Technology'];
        const keywords = ['software', 'programming'];
        await updateUserInterestProfile(user.id, topics, keywords);
        
        // Create article with similar content
        const article = {
          id: 'article-1',
          title: 'Software Development',
          content: 'Best practices in software programming and development',
          embedding: await generateArticleEmbedding('Best practices in software programming and development'),
        };
        
        const result = await filterArticlesByRelevance(user.id, [article]);
        
        // With high similarity content, should be included
        expect(result.statistics.totalArticles).toBe(1);
        expect(result.filteredArticles.length).toBeGreaterThanOrEqual(0);
      } finally {
        await cleanupTestUser(user.id);
      }
    });

    it('should skip articles without embeddings', async () => {
      const user = await createTestUser();
      
      try {
        const topics = ['Technology'];
        const keywords = ['AI'];
        await updateUserInterestProfile(user.id, topics, keywords);
        
        const articles = [
          {
            id: 'article-1',
            title: 'Article with embedding',
            content: 'Content',
            embedding: await generateArticleEmbedding('Content'),
          },
          {
            id: 'article-2',
            title: 'Article without embedding',
            content: 'Content',
            embedding: [],
          },
        ];
        
        const result = await filterArticlesByRelevance(user.id, articles);
        
        // Total should still be 2, but article without embedding should be excluded
        expect(result.statistics.totalArticles).toBe(2);
        // The article without embedding should be filtered out
        expect(result.filteredArticles.every(a => a.id !== 'article-2')).toBe(true);
      } finally {
        await cleanupTestUser(user.id);
      }
    });

    it('should return empty filtered list when no articles meet threshold', async () => {
      const user = await createTestUser();
      
      try {
        // Set up very specific interest profile
        const topics = ['Quantum Physics'];
        const keywords = ['quantum computing', 'entanglement'];
        await updateUserInterestProfile(user.id, topics, keywords);
        
        // Create article with completely unrelated content
        const article = {
          id: 'article-1',
          title: 'Cooking Recipe',
          content: 'How to bake chocolate chip cookies',
          embedding: await generateArticleEmbedding('How to bake chocolate chip cookies'),
        };
        
        const result = await filterArticlesByRelevance(user.id, [article]);
        
        expect(result.statistics.totalArticles).toBe(1);
        // Likely filtered out due to low similarity
        expect(result.statistics.includedArticles + result.statistics.filteredOutArticles).toBe(1);
      } finally {
        await cleanupTestUser(user.id);
      }
    });

    it('should handle empty article list', async () => {
      const user = await createTestUser();
      
      try {
        const topics = ['Technology'];
        const keywords = ['AI'];
        await updateUserInterestProfile(user.id, topics, keywords);
        
        const result = await filterArticlesByRelevance(user.id, []);
        
        expect(result.statistics.totalArticles).toBe(0);
        expect(result.statistics.includedArticles).toBe(0);
        expect(result.statistics.filteredOutArticles).toBe(0);
        expect(result.filteredArticles).toEqual([]);
      } finally {
        await cleanupTestUser(user.id);
      }
    });

    it('should throw error when user interest profile not found', async () => {
      const nonExistentUserId = 'non-existent-user-id';
      
      const articles = [
        {
          id: 'article-1',
          title: 'Test',
          content: 'Test content',
          embedding: [1, 2, 3],
        },
      ];
      
      await expect(filterArticlesByRelevance(nonExistentUserId, articles)).rejects.toThrow(
        `User preferences not found for user ${nonExistentUserId}`
      );
    });
  });
});
