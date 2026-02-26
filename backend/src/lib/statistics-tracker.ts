import { prisma } from './prisma';
import { createLogger } from './logger';

const logger = createLogger({ component: 'statistics-tracker' });

/**
 * Record filtering statistics for a user
 * Stores daily statistics in FilteringStatistics table
 * Handles recording failures gracefully (non-blocking)
 * 
 * @param userId - User ID
 * @param included - Number of articles included
 * @param filtered - Number of articles filtered out
 * @returns Promise<void>
 */
export async function recordFilteringStats(
  userId: string,
  included: number,
  filtered: number
): Promise<void> {
  try {
    await prisma.filteringStatistics.create({
      data: {
        userId,
        date: new Date(),
        includedArticles: included,
        filteredOutArticles: filtered,
      },
    });

    logger.debug('Filtering statistics recorded', {
      userId,
      included,
      filtered,
    });
  } catch (error) {
    // Handle recording failures gracefully - don't throw, just log
    logger.error('Failed to record filtering statistics', error, {
      userId,
      included,
      filtered,
    });
  }
}

/**
 * Get filtering statistics for a user with optional time range
 * Calculates total articles, included, filtered out, and percentage
 * Handles empty statistics case
 * 
 * @param userId - User ID
 * @param timeRange - Optional time range ('last_7_days', 'last_30_days', 'all_time')
 * @returns Promise with statistics
 */
export async function getFilteringStats(
  userId: string,
  timeRange?: string
): Promise<{
  totalArticles: number;
  includedArticles: number;
  filteredOutArticles: number;
  inclusionPercentage: number;
}> {
  try {
    // Calculate date filter based on time range
    let dateFilter: Date | undefined;
    
    if (timeRange === 'last_7_days') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (timeRange === 'last_30_days') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 30);
    }
    // 'all_time' or undefined means no date filter

    // Query statistics with optional date filter
    const stats = await prisma.filteringStatistics.findMany({
      where: {
        userId,
        ...(dateFilter && {
          date: {
            gte: dateFilter,
          },
        }),
      },
    });

    // Handle empty statistics case
    if (stats.length === 0) {
      return {
        totalArticles: 0,
        includedArticles: 0,
        filteredOutArticles: 0,
        inclusionPercentage: 0,
      };
    }

    // Aggregate statistics
    const includedArticles = stats.reduce((sum, stat) => sum + stat.includedArticles, 0);
    const filteredOutArticles = stats.reduce((sum, stat) => sum + stat.filteredOutArticles, 0);
    const totalArticles = includedArticles + filteredOutArticles;

    // Calculate percentage (handle division by zero)
    const inclusionPercentage = totalArticles > 0 
      ? (includedArticles / totalArticles) * 100 
      : 0;

    logger.debug('Filtering statistics retrieved', {
      userId,
      timeRange,
      totalArticles,
      includedArticles,
      filteredOutArticles,
      inclusionPercentage,
    });

    return {
      totalArticles,
      includedArticles,
      filteredOutArticles,
      inclusionPercentage,
    };
  } catch (error) {
    logger.error('Failed to retrieve filtering statistics', error, {
      userId,
      timeRange,
    });
    
    // Return empty statistics on error
    return {
      totalArticles: 0,
      includedArticles: 0,
      filteredOutArticles: 0,
      inclusionPercentage: 0,
    };
  }
}
