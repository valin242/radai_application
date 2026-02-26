/**
 * User Preferences Management
 * 
 * Manages user preference modifications including keyword management
 * and relevance threshold updates.
 */

import prisma from './prisma';
import { updateUserInterestProfile, getUserInterestProfile } from './interest-profile-manager';

/**
 * Add a keyword to user's custom keywords list
 * Triggers interest profile regeneration after modification
 * 
 * @param userId - User ID
 * @param keyword - Keyword to add
 * @returns Promise<void>
 * @throws Error if user preferences not found or database operation fails
 * 
 * Requirements: 1.3, 1.5
 */
export async function addKeyword(userId: string, keyword: string): Promise<void> {
  // Get current preferences
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });
  
  if (!preferences) {
    throw new Error(`User preferences not found for user ${userId}`);
  }
  
  // Add keyword if not already present
  const updatedKeywords = preferences.customKeywords.includes(keyword)
    ? preferences.customKeywords
    : [...preferences.customKeywords, keyword];
  
  // Trigger interest profile regeneration with updated keywords
  await updateUserInterestProfile(
    userId,
    preferences.selectedTopics,
    updatedKeywords
  );
}

/**
 * Remove a keyword from user's custom keywords list
 * Triggers interest profile regeneration after modification
 * 
 * @param userId - User ID
 * @param keyword - Keyword to remove
 * @returns Promise<void>
 * @throws Error if user preferences not found or database operation fails
 * 
 * Requirements: 1.4, 1.5
 */
export async function removeKeyword(userId: string, keyword: string): Promise<void> {
  // Get current preferences
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });
  
  if (!preferences) {
    throw new Error(`User preferences not found for user ${userId}`);
  }
  
  // Remove keyword from list
  const updatedKeywords = preferences.customKeywords.filter(k => k !== keyword);
  
  // Trigger interest profile regeneration with updated keywords
  await updateUserInterestProfile(
    userId,
    preferences.selectedTopics,
    updatedKeywords
  );
}

/**
 * Update user's relevance threshold
 * Validates threshold is between 0 and 100 before updating
 * 
 * @param userId - User ID
 * @param threshold - New threshold value (0-100)
 * @returns Promise<void>
 * @throws Error if threshold is out of range or user preferences not found
 * 
 * Requirements: 4.3, 4.4
 */
export async function updateRelevanceThreshold(
  userId: string,
  threshold: number
): Promise<void> {
  // Validate threshold is between 0 and 100
  if (threshold < 0 || threshold > 100) {
    throw new Error(`Relevance threshold must be between 0 and 100, got ${threshold}`);
  }
  
  // Update threshold in database
  await prisma.userPreferences.update({
    where: { userId },
    data: { relevanceThreshold: threshold },
  });
}

/**
 * Get the default relevance threshold value
 * Used when creating new UserPreferences records
 * 
 * @returns number - Default threshold value of 80
 * 
 * Requirements: 4.1
 */
export function getDefaultThreshold(): number {
  return 80;
}
