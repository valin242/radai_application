import { describe, it, expect } from 'vitest';
import { createInterestProfileText, updateUserInterestProfile, getUserInterestProfile } from './interest-profile-manager';
import { createTestUser, cleanupTestUser } from '../test/setup';

describe('Interest Profile Manager', () => {
  describe('createInterestProfileText', () => {
    it('should combine topics and keywords', () => {
      const topics = ['Technology', 'Finance'];
      const keywords = ['artificial intelligence', 'blockchain'];
      
      const result = createInterestProfileText(topics, keywords);
      
      expect(result).toBe('Topics: Technology, Finance. Keywords: artificial intelligence, blockchain');
    });

    it('should handle only topics', () => {
      const topics = ['Technology', 'Science'];
      const keywords: string[] = [];
      
      const result = createInterestProfileText(topics, keywords);
      
      expect(result).toBe('Topics: Technology, Science');
    });

    it('should handle only keywords', () => {
      const topics: string[] = [];
      const keywords = ['machine learning', 'startups'];
      
      const result = createInterestProfileText(topics, keywords);
      
      expect(result).toBe('Keywords: machine learning, startups');
    });

    it('should return "General interest" when both topics and keywords are empty', () => {
      const topics: string[] = [];
      const keywords: string[] = [];
      
      const result = createInterestProfileText(topics, keywords);
      
      expect(result).toBe('General interest');
    });

    it('should handle single topic', () => {
      const topics = ['Health'];
      const keywords: string[] = [];
      
      const result = createInterestProfileText(topics, keywords);
      
      expect(result).toBe('Topics: Health');
    });

    it('should handle single keyword', () => {
      const topics: string[] = [];
      const keywords = ['cryptocurrency'];
      
      const result = createInterestProfileText(topics, keywords);
      
      expect(result).toBe('Keywords: cryptocurrency');
    });
  });
});

  describe('generateInterestProfile', () => {
    it('should generate 1536-dimension embedding from topics and keywords', async () => {
      const { generateInterestProfile } = await import('./interest-profile-manager');
      
      const topics = ['Technology', 'Finance'];
      const keywords = ['artificial intelligence', 'blockchain'];
      
      const embedding = await generateInterestProfile(topics, keywords);
      
      // Verify embedding is an array of numbers
      expect(Array.isArray(embedding)).toBe(true);
      
      // Verify embedding has exactly 1536 dimensions
      expect(embedding.length).toBe(1536);
      
      // Verify all elements are numbers
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
    });

    it('should generate embedding for empty topics and keywords', async () => {
      const { generateInterestProfile } = await import('./interest-profile-manager');
      
      const topics: string[] = [];
      const keywords: string[] = [];
      
      const embedding = await generateInterestProfile(topics, keywords);
      
      // Should still generate valid embedding for "General interest"
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536);
    });

    it('should use the same embedding function as article embeddings', async () => {
      const { generateInterestProfile } = await import('./interest-profile-manager');
      const { generateArticleEmbedding } = await import('./article-embedding');
      
      const topics = ['Technology'];
      const keywords = ['AI'];
      
      // Generate interest profile embedding
      const interestEmbedding = await generateInterestProfile(topics, keywords);
      
      // Generate article embedding with the same text
      const articleEmbedding = await generateArticleEmbedding('Topics: Technology. Keywords: AI');
      
      // Both should have the same dimensions
      expect(interestEmbedding.length).toBe(articleEmbedding.length);
      expect(interestEmbedding.length).toBe(1536);
    });
  });

  describe('updateUserInterestProfile', () => {
    it('should store topics, keywords, and embedding in database', async () => {
      const user = await createTestUser();
      
      try {
        const topics = ['Technology', 'Finance'];
        const keywords = ['AI', 'blockchain'];
        
        await updateUserInterestProfile(user.id, topics, keywords);
        
        // Retrieve and verify
        const profile = await getUserInterestProfile(user.id);
        
        expect(profile.topics).toEqual(topics);
        expect(profile.keywords).toEqual(keywords);
        expect(profile.embedding.length).toBe(1536);
        expect(profile.relevanceThreshold).toBe(80); // default value
      } finally {
        await cleanupTestUser(user.id);
      }
    });

    it('should update existing profile when called again', async () => {
      const user = await createTestUser();
      
      try {
        // Create initial profile
        const initialTopics = ['Technology'];
        const initialKeywords = ['AI'];
        await updateUserInterestProfile(user.id, initialTopics, initialKeywords);
        
        const initialProfile = await getUserInterestProfile(user.id);
        
        // Update profile
        const updatedTopics = ['Finance', 'Business'];
        const updatedKeywords = ['stocks', 'trading'];
        await updateUserInterestProfile(user.id, updatedTopics, updatedKeywords);
        
        const updatedProfile = await getUserInterestProfile(user.id);
        
        // Verify update
        expect(updatedProfile.topics).toEqual(updatedTopics);
        expect(updatedProfile.keywords).toEqual(updatedKeywords);
        expect(updatedProfile.embedding.length).toBe(1536);
        
        // Verify embedding changed (different topics/keywords should produce different embeddings)
        expect(updatedProfile.embedding).not.toEqual(initialProfile.embedding);
      } finally {
        await cleanupTestUser(user.id);
      }
    });

    it('should handle empty topics and keywords', async () => {
      const user = await createTestUser();
      
      try {
        await updateUserInterestProfile(user.id, [], []);
        
        const profile = await getUserInterestProfile(user.id);
        
        expect(profile.topics).toEqual([]);
        expect(profile.keywords).toEqual([]);
        expect(profile.embedding.length).toBe(1536); // Should still generate embedding for "General interest"
      } finally {
        await cleanupTestUser(user.id);
      }
    });
  });

  describe('getUserInterestProfile', () => {
    it('should retrieve user preferences from database', async () => {
      const user = await createTestUser();
      
      try {
        const topics = ['Health', 'Sports'];
        const keywords = ['fitness', 'nutrition'];
        
        await updateUserInterestProfile(user.id, topics, keywords);
        
        const profile = await getUserInterestProfile(user.id);
        
        expect(profile.topics).toEqual(topics);
        expect(profile.keywords).toEqual(keywords);
        expect(profile.relevanceThreshold).toBe(80);
        expect(Array.isArray(profile.embedding)).toBe(true);
        expect(profile.embedding.length).toBe(1536);
      } finally {
        await cleanupTestUser(user.id);
      }
    });

    it('should throw error when user preferences not found', async () => {
      const nonExistentUserId = 'non-existent-user-id';
      
      await expect(getUserInterestProfile(nonExistentUserId)).rejects.toThrow(
        `User preferences not found for user ${nonExistentUserId}`
      );
    });
  });
