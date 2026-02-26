import { prisma } from './prisma';
import { openaiClient } from './openai-client';
import { UserTier } from '@prisma/client';

/**
 * Tier-based duration limits for episodes
 */
export const TIER_LIMITS = {
  free: {
    maxEpisodeDurationMinutes: 12,
  },
  pro: {
    maxEpisodeDurationMinutes: 30,
  },
} as const;

/**
 * Get duration limit for a user based on their tier
 */
export function getDurationLimitForTier(tier: UserTier): number {
  return TIER_LIMITS[tier].maxEpisodeDurationMinutes;
}

/**
 * Fetch recent articles for a user from the last 24-48 hours
 * Returns articles that have summaries and are from the user's feeds
 * 
 * For users with completed onboarding and interest profiles, only articles
 * that passed content filtering are included (filtered articles are stored in DB).
 * For users without interest profiles, all articles are included (fail open).
 * 
 * Requirements: 3.5, 9.2, 9.3
 */
export async function fetchRecentArticlesForUser(
  userId: string,
  hoursBack: number = 48
): Promise<Array<{ id: string; title: string; summary: string; publishedAt: Date | null }>> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursBack);

  // Check if user has completed onboarding and has an interest profile
  // If they do, articles in the database are already filtered by the
  // article-processing-pipeline (Requirements 9.2, 9.3)
  let hasInterestProfile = false;
  
  try {
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { 
        onboardingCompleted: true,
        interestProfileEmbedding: true,
      },
    });

    hasInterestProfile = 
      userPreferences?.onboardingCompleted === true && 
      userPreferences?.interestProfileEmbedding !== null;
  } catch (error) {
    // If UserPreferences table doesn't exist or query fails, fail open
    // This handles cases where migrations haven't been run yet
    console.log(`Could not check user preferences for ${userId}, using all articles`);
  }

  // Fetch articles from user's feeds
  // Note: If user has an interest profile, articles in the database have already
  // been filtered by the article-processing-pipeline before storage.
  // If user doesn't have an interest profile, we include all articles (fail open).
  const articles = await prisma.article.findMany({
    where: {
      feed: {
        userId: userId,
      },
      summary: {
        not: null,
      },
      createdAt: {
        gte: cutoffDate,
      },
    },
    select: {
      id: true,
      title: true,
      summary: true,
      publishedAt: true,
    },
    orderBy: {
      publishedAt: 'desc',
    },
  });

  // Filter out articles with null summaries (TypeScript type narrowing)
  const filteredArticles = articles.filter(
    (a): a is typeof a & { summary: string } => a.summary !== null
  );

  // Log filtering status for transparency
  if (hasInterestProfile) {
    console.log(
      `Fetched ${filteredArticles.length} filtered articles for user ${userId} (interest profile active)`
    );
  } else {
    console.log(
      `Fetched ${filteredArticles.length} articles for user ${userId} (no interest profile, using all articles)`
    );
  }

  return filteredArticles;
}

/**
 * Generate episode script for a user
 * Fetches recent articles, determines duration limit based on tier,
 * and generates a cohesive script with intro/outro using GPT-4o
 */
export async function generateEpisodeScript(userId: string): Promise<{
  scriptText: string;
  articleIds: string[];
  durationMinutes: number;
}> {
  // Fetch user to get tier
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Determine duration limit based on tier
  const durationLimit = getDurationLimitForTier(user.tier);

  // Fetch recent articles
  const articles = await fetchRecentArticlesForUser(userId);

  if (articles.length === 0) {
    throw new Error('No recent articles found for user');
  }

  // Prepare summaries for script generation
  const summaries = articles.map((a) => ({
    title: a.title,
    summary: a.summary,
  }));

  // Generate script using OpenAI
  const scriptText = await openaiClient.generateEpisodeScript(summaries, durationLimit);

  // Extract article IDs
  const articleIds = articles.map((a) => a.id);

  return {
    scriptText,
    articleIds,
    durationMinutes: durationLimit,
  };
}

import crypto from 'crypto';

/**
 * Generate SHA-256 hash of script text for caching purposes
 * Returns a hexadecimal string representation of the hash
 */
export function generateScriptHash(scriptText: string): string {
  return crypto.createHash('sha256').update(scriptText).digest('hex');
}

/**
 * Check if audio exists in cache for a given script hash
 * Returns the audio URL if found, null otherwise
 */
export async function getCachedAudioUrl(scriptHash: string): Promise<string | null> {
  // Query episodes table for existing audio with matching script hash
  // Since we don't have a dedicated cache table yet, we'll search episodes
  // by generating hash of script_text and comparing
  const episodes = await prisma.episode.findMany({
    select: {
      scriptText: true,
      audioUrl: true,
    },
  });

  // Find episode with matching script hash
  for (const episode of episodes) {
    const episodeHash = generateScriptHash(episode.scriptText);
    if (episodeHash === scriptHash) {
      return episode.audioUrl;
    }
  }

  return null;
}

/**
 * Generate episode script with caching support
 * Returns script text, article IDs, duration, and cached audio URL if available
 */
export async function generateEpisodeScriptWithCache(userId: string): Promise<{
  scriptText: string;
  articleIds: string[];
  durationMinutes: number;
  scriptHash: string;
  cachedAudioUrl: string | null;
}> {
  // Generate the script
  const { scriptText, articleIds, durationMinutes } = await generateEpisodeScript(userId);

  // Generate hash for caching
  const scriptHash = generateScriptHash(scriptText);

  // Check if audio already exists for this script
  const cachedAudioUrl = await getCachedAudioUrl(scriptHash);

  return {
    scriptText,
    articleIds,
    durationMinutes,
    scriptHash,
    cachedAudioUrl,
  };
}
