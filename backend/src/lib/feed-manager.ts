/**
 * Feed management functionality for popular and custom RSS feeds
 */

import prisma from './prisma';

/**
 * Get list of curated popular feeds
 * 
 * Retrieves all feeds marked as popular (isPopular=true) from the database.
 * Popular feeds are curated RSS sources recommended by the system, spanning
 * different categories like Technology, Finance, News, Science, etc.
 * 
 * @returns Promise with array of popular feeds including name, category, description
 * @throws Error if database query fails
 * 
 * Requirements: 2.1, 2.2
 */
export async function getPopularFeeds(): Promise<
  Array<{
    id: string;
    name: string;
    url: string;
    category: string;
    description: string;
  }>
> {
  // Query feeds where isPopular=true
  const popularFeeds = await prisma.feed.findMany({
    where: {
      isPopular: true,
    },
    select: {
      id: true,
      name: true,
      url: true,
      category: true,
      description: true,
    },
  });

  // Map results to ensure all fields are present (handle nullable fields)
  return popularFeeds.map((feed) => ({
    id: feed.id,
    name: feed.name || '',
    url: feed.url,
    category: feed.category || '',
    description: feed.description || '',
  }));
}

/**
 * Validate RSS feed URL
 *
 * Validates that a URL is properly formatted and points to a valid RSS feed.
 * Performs URL format validation and attempts to parse the feed to ensure
 * it's accessible and contains valid RSS/Atom content.
 *
 * @param url - URL to validate
 * @returns Promise<boolean> - true if valid RSS feed, false otherwise
 *
 * Requirements: 2.4
 */
export async function validateFeedUrl(url: string): Promise<boolean> {
  try {
    // Validate URL format
    const urlObj = new URL(url);

    // Ensure protocol is http or https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }

    // Attempt to parse the feed using existing rss-parser
    const { parseRSSFeed } = await import('./rss-parser');
    const result = await parseRSSFeed(url);

    // Return true if parsing succeeded, false otherwise
    return result.success;
  } catch (error) {
    // Invalid URL format or parsing failed
    return false;
  }
}

/**
 * Add feed to user's feed list
 *
 * Validates the feed URL before adding, checks for duplicate feeds (same URL
 * for the same user), creates a feed record with the isPopular flag, and
 * associates the feed with the user.
 *
 * @param userId - User ID
 * @param feedUrl - RSS feed URL
 * @param isPopular - Whether this is a popular feed (default: false)
 * @returns Promise with created feed
 * @throws Error if URL is invalid, feed already exists, or database operation fails
 *
 * Requirements: 2.3, 2.5, 2.6
 */
export async function addFeedForUser(
  userId: string,
  feedUrl: string,
  isPopular: boolean = false
): Promise<{ id: string; url: string }> {
  // Validate feed URL before adding
  const isValid = await validateFeedUrl(feedUrl);
  if (!isValid) {
    throw new Error('Invalid RSS feed URL');
  }

  // Check for duplicate feeds (same URL for same user)
  const existingFeed = await prisma.feed.findUnique({
    where: {
      userId_url: {
        userId,
        url: feedUrl,
      },
    },
  });

  if (existingFeed) {
    throw new Error('Feed already exists for this user');
  }

  // Create feed record with isPopular flag and associate with user
  const feed = await prisma.feed.create({
    data: {
      userId,
      url: feedUrl,
      isPopular,
    },
    select: {
      id: true,
      url: true,
    },
  });

  return feed;
}

/**
 * Remove feed from user's feed list
 *
 * Validates that the feed exists and belongs to the user before removing it.
 * Since feeds are user-specific in the current schema (each feed has a single userId),
 * this function deletes the feed record entirely.
 *
 * @param userId - User ID
 * @param feedId - Feed ID to remove
 * @returns Promise<void>
 * @throws Error if feed doesn't exist or doesn't belong to user
 *
 * Requirements: 2.8
 */
export async function removeFeedForUser(
  userId: string,
  feedId: string
): Promise<void> {
  // Validate feed exists and belongs to user
  const feed = await prisma.feed.findUnique({
    where: {
      id: feedId,
    },
  });

  if (!feed) {
    throw new Error('Feed not found');
  }

  if (feed.userId !== userId) {
    throw new Error('Feed does not belong to this user');
  }

  // Delete the feed (articles will be cascade deleted)
  await prisma.feed.delete({
    where: {
      id: feedId,
    },
  });
}

/**
 * Get all feeds for a user
 *
 * Queries all feeds associated with the user and returns feed details
 * including the isPopular flag to distinguish between popular (curated)
 * and custom (user-added) feeds.
 *
 * @param userId - User ID
 * @returns Promise with array of user's feeds
 * @throws Error if database query fails
 *
 * Requirements: 2.7
 */
export async function getUserFeeds(userId: string): Promise<
  Array<{
    id: string;
    url: string;
    isPopular: boolean;
    createdAt: Date;
  }>
> {
  // Query all feeds associated with user
  const feeds = await prisma.feed.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      url: true,
      isPopular: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return feeds;
}
