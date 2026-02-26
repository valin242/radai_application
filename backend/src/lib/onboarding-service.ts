/**
 * Onboarding Service
 * 
 * Handles the initial setup process for new users, including topic selection,
 * feed selection, and interest profile generation.
 */

import prisma from './prisma';
import { generateInterestProfile } from './interest-profile-manager';
import { addFeedForUser, validateFeedUrl } from './feed-manager';

/**
 * Complete onboarding for a new user
 * 
 * Validates that at least one topic is selected, adds selected popular feeds
 * to the user's feed list, validates and adds custom feed URLs, generates the
 * initial interest profile embedding, and sets the onboardingCompleted flag.
 * 
 * @param userId - User ID
 * @param topics - Selected topics (at least one required)
 * @param feedIds - Optional selected popular feed IDs
 * @param customFeedUrls - Optional custom RSS URLs
 * @returns Promise<void>
 * @throws Error if validation fails or database operation fails
 * 
 * Requirements: 1.1, 5.4, 5.5
 */
export async function completeOnboarding(
  userId: string,
  topics: string[],
  feedIds?: string[],
  customFeedUrls?: string[]
): Promise<void> {
  // Validate at least one topic is selected
  if (!topics || topics.length === 0) {
    throw new Error('At least one topic must be selected');
  }

  // Generate initial interest profile embedding
  const embedding = await generateInterestProfile(topics, []);
  const embeddingJson = JSON.stringify(embedding);

  // Add selected popular feeds to user's feed list
  if (feedIds && feedIds.length > 0) {
    for (const feedId of feedIds) {
      // Get the popular feed details
      const popularFeed = await prisma.feed.findFirst({
        where: {
          id: feedId,
          isPopular: true,
        },
      });

      if (popularFeed) {
        // Add the popular feed for this user
        try {
          await addFeedForUser(userId, popularFeed.url, true);
        } catch (error) {
          // If feed already exists, continue (non-blocking)
          if (error instanceof Error && error.message.includes('already exists')) {
            continue;
          }
          throw error;
        }
      }
    }
  }

  // Validate and add custom feed URLs
  if (customFeedUrls && customFeedUrls.length > 0) {
    for (const url of customFeedUrls) {
      const isValid = await validateFeedUrl(url);
      if (!isValid) {
        throw new Error(`Invalid RSS feed URL: ${url}`);
      }
      
      // Add the custom feed
      try {
        await addFeedForUser(userId, url, false);
      } catch (error) {
        // If feed already exists, continue (non-blocking)
        if (error instanceof Error && error.message.includes('already exists')) {
          continue;
        }
        throw error;
      }
    }
  }

  // Set onboardingCompleted flag to true and store preferences
  // Check if user preferences already exist
  const existing = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  if (existing) {
    // Update existing preferences
    await prisma.$executeRawUnsafe(
      `
      UPDATE user_preferences 
      SET 
        selected_topics = $1,
        interest_profile_embedding = $2::vector,
        onboarding_completed = true,
        updated_at = NOW()
      WHERE user_id = $3
      `,
      topics,
      embeddingJson,
      userId
    );
  } else {
    // Create new preferences
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO user_preferences (id, user_id, selected_topics, custom_keywords, interest_profile_embedding, onboarding_completed, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, true, NOW(), NOW())
      `,
      userId,
      topics,
      [],
      embeddingJson
    );
  }
}

/**
 * Check if user has completed onboarding
 * 
 * Queries UserPreferences for the onboardingCompleted flag and returns
 * a boolean indicating whether the user has completed the onboarding process.
 * 
 * @param userId - User ID
 * @returns Promise<boolean> - true if onboarding completed, false otherwise
 * 
 * Requirements: 5.5
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
    select: {
      onboardingCompleted: true,
    },
  });

  // Return false if preferences don't exist or onboarding not completed
  return preferences?.onboardingCompleted ?? false;
}
