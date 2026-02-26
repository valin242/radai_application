import { authenticatedFetch, TokenExpiredError } from './api';

/**
 * API Client for making authenticated requests to the backend
 * All methods automatically handle token expiration
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

console.log('API_BASE_URL configured as:', API_BASE_URL);

export interface Feed {
  feed_id: string;
  url: string;
  created_at: string;
}

export interface PopularFeed {
  feed_id: string;
  name: string;
  url: string;
  category: string;
  description: string;
}

export interface Episode {
  episode_id: string;
  audio_url: string;
  duration_minutes: number;
  created_at: string;
  script_text?: string;
  articles?: Array<{ title: string }>;
}

export interface Question {
  question_id: string;
  question_text: string;
  answer_text: string;
  created_at: string;
}

/**
 * Feed Management API
 */
export const feedsApi = {
  /**
   * Get all feeds for the authenticated user
   * @throws TokenExpiredError if token is expired
   */
  async list(): Promise<{ feeds: Feed[] }> {
    console.log('Fetching feeds from:', `${API_BASE_URL}/feeds`);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/feeds`);
      console.log('Feeds response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Feeds fetch failed:', errorText);
        throw new Error('Failed to fetch feeds');
      }
      const data = await response.json();
      console.log('Feeds data received:', data);
      return data;
    } catch (error) {
      console.error('Error fetching feeds:', error);
      throw error;
    }
  },

  /**
   * Get all popular feeds available in the system
   * @throws TokenExpiredError if token is expired
   */
  async listPopular(): Promise<{ feeds: PopularFeed[] }> {
    console.log('Fetching popular feeds from:', `${API_BASE_URL}/feeds/popular`);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/feeds/popular`);
      console.log('Popular feeds response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Popular feeds fetch failed:', errorText);
        throw new Error('Failed to fetch popular feeds');
      }
      const data = await response.json();
      console.log('Popular feeds data received:', data);
      return data;
    } catch (error) {
      console.error('Error fetching popular feeds:', error);
      throw error;
    }
  },

  /**
   * Add a new RSS feed
   * @throws TokenExpiredError if token is expired
   */
  async add(url: string): Promise<Feed> {
    const response = await authenticatedFetch(`${API_BASE_URL}/feeds`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      throw new Error('Failed to add feed');
    }
    return response.json();
  },

  /**
   * Delete a feed
   * @throws TokenExpiredError if token is expired
   */
  async delete(feedId: string): Promise<{ success: boolean }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/feeds/${feedId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete feed');
    }
    return response.json();
  },
};

/**
 * Episodes API
 */
export const episodesApi = {
  /**
   * Get all episodes for the authenticated user
   * @throws TokenExpiredError if token is expired
   */
  async list(): Promise<{ episodes: Episode[] }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/episodes`);
    if (!response.ok) {
      throw new Error('Failed to fetch episodes');
    }
    return response.json();
  },

  /**
   * Get episode details
   * @throws TokenExpiredError if token is expired
   */
  async get(episodeId: string): Promise<Episode> {
    const response = await authenticatedFetch(`${API_BASE_URL}/episodes/${episodeId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch episode');
    }
    return response.json();
  },
};

/**
 * Onboarding API
 */
export const onboardingApi = {
  /**
   * Get available topics for onboarding
   * @throws TokenExpiredError if token is expired
   */
  async getTopics(): Promise<{ topics: Array<{ id: string; name: string; description: string }> }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/onboarding/topics`);
    if (!response.ok) {
      throw new Error('Failed to fetch topics');
    }
    return response.json();
  },

  /**
   * Get popular feeds for onboarding
   * @throws TokenExpiredError if token is expired
   */
  async getPopularFeeds(): Promise<{ feeds: PopularFeed[] }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/onboarding/popular-feeds`);
    if (!response.ok) {
      throw new Error('Failed to fetch popular feeds');
    }
    return response.json();
  },

  /**
   * Complete onboarding
   * @throws TokenExpiredError if token is expired
   */
  async complete(data: {
    topics: string[];
    feedIds?: string[];
    customFeedUrls?: string[];
  }): Promise<{ success: boolean; preferences: any }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/onboarding`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to complete onboarding');
    }
    return response.json();
  },

  /**
   * Check onboarding status
   * @throws TokenExpiredError if token is expired
   */
  async getStatus(): Promise<{ onboardingCompleted: boolean }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/onboarding/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch onboarding status');
    }
    return response.json();
  },
};

/**
 * Preferences API
 */
export const preferencesApi = {
  /**
   * Get user preferences
   * @throws TokenExpiredError if token is expired
   */
  async get(): Promise<{
    selectedTopics: string[];
    customKeywords: string[];
    relevanceThreshold: number;
  }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/preferences`);
    if (!response.ok) {
      throw new Error('Failed to fetch preferences');
    }
    return response.json();
  },

  /**
   * Update selected topics
   * @throws TokenExpiredError if token is expired
   */
  async updateTopics(topics: string[]): Promise<{ success: boolean }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/preferences/topics`, {
      method: 'PUT',
      body: JSON.stringify({ topics }),
    });
    if (!response.ok) {
      throw new Error('Failed to update topics');
    }
    return response.json();
  },

  /**
   * Add a custom keyword
   * @throws TokenExpiredError if token is expired
   */
  async addKeyword(keyword: string): Promise<{ success: boolean }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/preferences/keywords`, {
      method: 'POST',
      body: JSON.stringify({ keyword }),
    });
    if (!response.ok) {
      throw new Error('Failed to add keyword');
    }
    return response.json();
  },

  /**
   * Remove a custom keyword
   * @throws TokenExpiredError if token is expired
   */
  async removeKeyword(keyword: string): Promise<{ success: boolean }> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/preferences/keywords/${encodeURIComponent(keyword)}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to remove keyword');
    }
    return response.json();
  },

  /**
   * Update relevance threshold
   * @throws TokenExpiredError if token is expired
   */
  async updateThreshold(threshold: number): Promise<{ success: boolean }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/preferences/threshold`, {
      method: 'PUT',
      body: JSON.stringify({ threshold }),
    });
    if (!response.ok) {
      throw new Error('Failed to update threshold');
    }
    return response.json();
  },
};

/**
 * Statistics API
 */
export const statisticsApi = {
  /**
   * Get filtering statistics
   * @throws TokenExpiredError if token is expired
   */
  async getFiltering(timeRange?: string): Promise<{
    totalArticles: number;
    includedArticles: number;
    filteredOutArticles: number;
    inclusionPercentage: number;
  }> {
    const url = timeRange
      ? `${API_BASE_URL}/statistics/filtering?timeRange=${timeRange}`
      : `${API_BASE_URL}/statistics/filtering`;
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch statistics');
    }
    const data = await response.json();
    // Transform snake_case to camelCase
    return {
      totalArticles: data.total_articles,
      includedArticles: data.included_articles,
      filteredOutArticles: data.filtered_out_articles,
      inclusionPercentage: data.inclusion_percentage,
    };
  },
};

/**
 * Q&A API
 */
export const questionsApi = {
  /**
   * Get all questions for an episode
   * @throws TokenExpiredError if token is expired
   */
  async list(episodeId: string): Promise<{ questions: Question[] }> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/episodes/${episodeId}/questions`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch questions');
    }
    return response.json();
  },

  /**
   * Ask a question about an episode
   * @throws TokenExpiredError if token is expired
   */
  async ask(
    episodeId: string,
    questionText: string
  ): Promise<{ question_id: string; answer_text: string; created_at: string }> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/episodes/${episodeId}/questions`,
      {
        method: 'POST',
        body: JSON.stringify({ question_text: questionText }),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to ask question');
    }
    return response.json();
  },
};
