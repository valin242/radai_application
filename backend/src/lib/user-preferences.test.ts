/**
 * User Preferences Management Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import prisma from './prisma';
import {
  addKeyword,
  removeKeyword,
  updateRelevanceThreshold,
  getDefaultThreshold,
} from './user-preferences';
import { updateUserInterestProfile } from './interest-profile-manager';

describe('User Preferences Management', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
      },
    });
    testUserId = user.id;

    // Create initial preferences
    await updateUserInterestProfile(testUserId, ['Technology'], ['AI']);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.userPreferences.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  describe('addKeyword', () => {
    it('should add a keyword to user preferences', async () => {
      await addKeyword(testUserId, 'blockchain');

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
      });

      expect(preferences?.customKeywords).toContain('blockchain');
      expect(preferences?.customKeywords).toContain('AI');
    });

    it('should not duplicate keywords', async () => {
      await addKeyword(testUserId, 'AI');

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
      });

      const aiCount = preferences?.customKeywords.filter(k => k === 'AI').length;
      expect(aiCount).toBe(1);
    });

    it('should throw error for non-existent user', async () => {
      await expect(addKeyword('non-existent-user', 'test')).rejects.toThrow(
        'User preferences not found'
      );
    });
  });

  describe('removeKeyword', () => {
    it('should remove a keyword from user preferences', async () => {
      await removeKeyword(testUserId, 'AI');

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
      });

      expect(preferences?.customKeywords).not.toContain('AI');
    });

    it('should handle removing non-existent keyword', async () => {
      await removeKeyword(testUserId, 'non-existent');

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
      });

      expect(preferences?.customKeywords).toEqual(['AI']);
    });

    it('should throw error for non-existent user', async () => {
      await expect(removeKeyword('non-existent-user', 'test')).rejects.toThrow(
        'User preferences not found'
      );
    });
  });

  describe('updateRelevanceThreshold', () => {
    it('should update threshold with valid value', async () => {
      await updateRelevanceThreshold(testUserId, 75);

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
      });

      expect(preferences?.relevanceThreshold).toBe(75);
    });

    it('should accept threshold of 0', async () => {
      await updateRelevanceThreshold(testUserId, 0);

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
      });

      expect(preferences?.relevanceThreshold).toBe(0);
    });

    it('should accept threshold of 100', async () => {
      await updateRelevanceThreshold(testUserId, 100);

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: testUserId },
      });

      expect(preferences?.relevanceThreshold).toBe(100);
    });

    it('should reject threshold below 0', async () => {
      await expect(updateRelevanceThreshold(testUserId, -1)).rejects.toThrow(
        'Relevance threshold must be between 0 and 100'
      );
    });

    it('should reject threshold above 100', async () => {
      await expect(updateRelevanceThreshold(testUserId, 101)).rejects.toThrow(
        'Relevance threshold must be between 0 and 100'
      );
    });
  });

  describe('getDefaultThreshold', () => {
    it('should return 80 as default threshold', () => {
      expect(getDefaultThreshold()).toBe(80);
    });
  });
});
