import { describe, it, expect } from 'vitest';
import { prisma } from './prisma';
import { UserTier } from '@prisma/client';

/**
 * Unit tests for database models
 * Tests model creation, relationships, and unique constraints
 * Requirements: 12.3-12.9
 */

describe('Database Models', () => {
  describe('User Model', () => {
    it('should create a user with all required fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      expect(user.id).toBeDefined();
      expect(user.email).toContain('test-');
      expect(user.tier).toBe(UserTier.free);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email constraint', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      await prisma.user.create({
        data: {
          email,
        },
      });

      await expect(
        prisma.user.create({
          data: {
            email,
          },
        })
      ).rejects.toThrow();
    });

    it('should create a user with pro tier', async () => {
      const user = await prisma.user.create({
        data: {
          email: `pro-${Date.now()}-${Math.random()}@example.com`,
          tier: UserTier.pro,
        },
      });

      expect(user.tier).toBe(UserTier.pro);
    });

    it('should cascade delete related feeds when user is deleted', async () => {
      // Create user with a feed
      const user = await prisma.user.create({
        data: {
          email: `cascade-${Date.now()}-${Math.random()}@example.com`,
          feeds: {
            create: {
              url: `https://example.com/feed-${Date.now()}.xml`,
            },
          },
        },
        include: {
          feeds: true,
        },
      });

      const feedId = user.feeds[0].id;

      // Verify feed exists before deletion
      const feedsBefore = await prisma.feed.findMany({
        where: { userId: user.id },
      });
      expect(feedsBefore).toHaveLength(1);

      // Delete user (this should cascade delete the feed)
      await prisma.user.delete({
        where: { id: user.id },
      });

      // Verify feed was cascade deleted
      const feedsAfter = await prisma.feed.findMany({
        where: { id: feedId },
      });
      expect(feedsAfter).toHaveLength(0);
    });
  });

  describe('Feed Model', () => {
    it('should create a feed with all required fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: `feeduser-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: `https://example.com/rss-${Date.now()}.xml`,
        },
      });

      expect(feed.id).toBeDefined();
      expect(feed.userId).toBe(user.id);
      expect(feed.url).toContain('https://example.com/rss-');
      expect(feed.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint on userId and url combination', async () => {
      const user = await prisma.user.create({
        data: {
          email: `uniquefeed-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      await expect(
        prisma.feed.create({
          data: {
            userId: user.id,
            url: 'https://example.com/feed.xml',
          },
        })
      ).rejects.toThrow();
    });

    it('should allow same URL for different users', async () => {
      const timestamp = Date.now();
      const user1 = await prisma.user.create({
        data: {
          email: `user1-${timestamp}@example.com`,
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: `user2-${timestamp}@example.com`,
        },
      });

      const feed1 = await prisma.feed.create({
        data: {
          userId: user1.id,
          url: 'https://example.com/shared.xml',
        },
      });

      const feed2 = await prisma.feed.create({
        data: {
          userId: user2.id,
          url: 'https://example.com/shared.xml',
        },
      });

      expect(feed1.url).toBe(feed2.url);
      expect(feed1.userId).not.toBe(feed2.userId);
    });

    it('should maintain relationship with user', async () => {
      const user = await prisma.user.create({
        data: {
          email: `relationship-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed1.xml',
        },
      });

      const userWithFeeds = await prisma.user.findUnique({
        where: { id: user.id },
        include: { feeds: true },
      });

      expect(userWithFeeds?.feeds).toHaveLength(1);
      expect(userWithFeeds?.feeds[0].url).toBe('https://example.com/feed1.xml');
    });
  });

  describe('Article Model', () => {
    it('should create an article with all required fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: `articleuser-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      const article = await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Test Article',
          content: 'This is test content',
          publishedAt: new Date('2024-01-01'),
        },
      });

      expect(article.id).toBeDefined();
      expect(article.feedId).toBe(feed.id);
      expect(article.title).toBe('Test Article');
      expect(article.content).toBe('This is test content');
      expect(article.publishedAt).toBeInstanceOf(Date);
      expect(article.summary).toBeNull();
      expect(article.embedding).toBeUndefined(); // pgvector fields return undefined when null
      expect(article.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint on feedId and title combination', async () => {
      const user = await prisma.user.create({
        data: {
          email: `uniquearticle-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Duplicate Title',
          content: 'Content 1',
        },
      });

      await expect(
        prisma.article.create({
          data: {
            feedId: feed.id,
            title: 'Duplicate Title',
            content: 'Content 2',
          },
        })
      ).rejects.toThrow();
    });

    it('should allow same title for different feeds', async () => {
      const user = await prisma.user.create({
        data: {
          email: `multifeeds-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed1 = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed1.xml',
        },
      });

      const feed2 = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed2.xml',
        },
      });

      const article1 = await prisma.article.create({
        data: {
          feedId: feed1.id,
          title: 'Same Title',
          content: 'Content from feed 1',
        },
      });

      const article2 = await prisma.article.create({
        data: {
          feedId: feed2.id,
          title: 'Same Title',
          content: 'Content from feed 2',
        },
      });

      expect(article1.title).toBe(article2.title);
      expect(article1.feedId).not.toBe(article2.feedId);
    });

    it('should store summary when provided', async () => {
      const user = await prisma.user.create({
        data: {
          email: `summary-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      const article = await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Article with Summary',
          content: 'Full content here',
          summary: 'This is a summary',
        },
      });

      expect(article.summary).toBe('This is a summary');
    });

    it('should maintain relationship with feed', async () => {
      const user = await prisma.user.create({
        data: {
          email: `feedrel-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Article 1',
          content: 'Content 1',
        },
      });

      const feedWithArticles = await prisma.feed.findUnique({
        where: { id: feed.id },
        include: { articles: true },
      });

      expect(feedWithArticles?.articles).toHaveLength(1);
      expect(feedWithArticles?.articles[0].title).toBe('Article 1');
    });

    it('should cascade delete articles when feed is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          email: `cascadearticle-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Article to be deleted',
          content: 'Content',
        },
      });

      await prisma.feed.delete({
        where: { id: feed.id },
      });

      const articles = await prisma.article.findMany({
        where: { feedId: feed.id },
      });

      expect(articles).toHaveLength(0);
    });
  });

  describe('Episode Model', () => {
    it('should create an episode with all required fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: `episodeuser-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'This is the episode script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 12,
        },
      });

      expect(episode.id).toBeDefined();
      expect(episode.userId).toBe(user.id);
      expect(episode.scriptText).toBe('This is the episode script');
      expect(episode.audioUrl).toBe('https://storage.example.com/audio.mp3');
      expect(episode.durationMinutes).toBe(12);
      expect(episode.createdAt).toBeInstanceOf(Date);
    });

    it('should maintain relationship with user', async () => {
      const user = await prisma.user.create({
        data: {
          email: `episoderel-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script 1',
          audioUrl: 'https://storage.example.com/audio1.mp3',
          durationMinutes: 10,
        },
      });

      const userWithEpisodes = await prisma.user.findUnique({
        where: { id: user.id },
        include: { episodes: true },
      });

      expect(userWithEpisodes?.episodes).toHaveLength(1);
      expect(userWithEpisodes?.episodes[0].scriptText).toBe('Script 1');
    });

    it('should cascade delete episodes when user is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          email: `cascadeepisode-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Episode to be deleted',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 15,
        },
      });

      await prisma.user.delete({
        where: { id: user.id },
      });

      const episodes = await prisma.episode.findMany({
        where: { userId: user.id },
      });

      expect(episodes).toHaveLength(0);
    });
  });

  describe('EpisodeArticle Junction Table', () => {
    it('should link episodes and articles', async () => {
      const user = await prisma.user.create({
        data: {
          email: `junction-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      const article = await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Article for Episode',
          content: 'Content',
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 10,
        },
      });

      await prisma.episodeArticle.create({
        data: {
          episodeId: episode.id,
          articleId: article.id,
        },
      });

      const episodeWithArticles = await prisma.episode.findUnique({
        where: { id: episode.id },
        include: {
          episodeArticles: {
            include: {
              article: true,
            },
          },
        },
      });

      expect(episodeWithArticles?.episodeArticles).toHaveLength(1);
      expect(episodeWithArticles?.episodeArticles[0].article.title).toBe('Article for Episode');
    });

    it('should enforce composite primary key', async () => {
      const user = await prisma.user.create({
        data: {
          email: `compositepk-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      const article = await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Article',
          content: 'Content',
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 10,
        },
      });

      await prisma.episodeArticle.create({
        data: {
          episodeId: episode.id,
          articleId: article.id,
        },
      });

      await expect(
        prisma.episodeArticle.create({
          data: {
            episodeId: episode.id,
            articleId: article.id,
          },
        })
      ).rejects.toThrow();
    });

    it('should allow multiple articles per episode', async () => {
      const user = await prisma.user.create({
        data: {
          email: `multiarticles-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      const article1 = await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Article 1',
          content: 'Content 1',
        },
      });

      const article2 = await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Article 2',
          content: 'Content 2',
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 10,
        },
      });

      await prisma.episodeArticle.createMany({
        data: [
          { episodeId: episode.id, articleId: article1.id },
          { episodeId: episode.id, articleId: article2.id },
        ],
      });

      const episodeWithArticles = await prisma.episode.findUnique({
        where: { id: episode.id },
        include: {
          episodeArticles: true,
        },
      });

      expect(episodeWithArticles?.episodeArticles).toHaveLength(2);
    });

    it('should cascade delete when episode is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          email: `cascadejunction-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const feed = await prisma.feed.create({
        data: {
          userId: user.id,
          url: 'https://example.com/feed.xml',
        },
      });

      const article = await prisma.article.create({
        data: {
          feedId: feed.id,
          title: 'Article',
          content: 'Content',
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 10,
        },
      });

      await prisma.episodeArticle.create({
        data: {
          episodeId: episode.id,
          articleId: article.id,
        },
      });

      await prisma.episode.delete({
        where: { id: episode.id },
      });

      const junctions = await prisma.episodeArticle.findMany({
        where: { episodeId: episode.id },
      });

      expect(junctions).toHaveLength(0);
    });
  });

  describe('Question Model', () => {
    it('should create a question with all required fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: `questionuser-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 10,
        },
      });

      const question = await prisma.question.create({
        data: {
          episodeId: episode.id,
          userId: user.id,
          questionText: 'What is this about?',
          answerText: 'This is about news.',
        },
      });

      expect(question.id).toBeDefined();
      expect(question.episodeId).toBe(episode.id);
      expect(question.userId).toBe(user.id);
      expect(question.questionText).toBe('What is this about?');
      expect(question.answerText).toBe('This is about news.');
      expect(question.createdAt).toBeInstanceOf(Date);
    });

    it('should maintain relationship with episode', async () => {
      const user = await prisma.user.create({
        data: {
          email: `questionrel-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 10,
        },
      });

      await prisma.question.create({
        data: {
          episodeId: episode.id,
          userId: user.id,
          questionText: 'Question 1',
          answerText: 'Answer 1',
        },
      });

      const episodeWithQuestions = await prisma.episode.findUnique({
        where: { id: episode.id },
        include: { questions: true },
      });

      expect(episodeWithQuestions?.questions).toHaveLength(1);
      expect(episodeWithQuestions?.questions[0].questionText).toBe('Question 1');
    });

    it('should maintain relationship with user', async () => {
      const user = await prisma.user.create({
        data: {
          email: `questionuserrel-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 10,
        },
      });

      await prisma.question.create({
        data: {
          episodeId: episode.id,
          userId: user.id,
          questionText: 'User Question',
          answerText: 'User Answer',
        },
      });

      const userWithQuestions = await prisma.user.findUnique({
        where: { id: user.id },
        include: { questions: true },
      });

      expect(userWithQuestions?.questions).toHaveLength(1);
      expect(userWithQuestions?.questions[0].questionText).toBe('User Question');
    });

    it('should cascade delete questions when episode is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          email: `cascadequestion-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 10,
        },
      });

      await prisma.question.create({
        data: {
          episodeId: episode.id,
          userId: user.id,
          questionText: 'Question to be deleted',
          answerText: 'Answer',
        },
      });

      await prisma.episode.delete({
        where: { id: episode.id },
      });

      const questions = await prisma.question.findMany({
        where: { episodeId: episode.id },
      });

      expect(questions).toHaveLength(0);
    });

    it('should allow multiple questions per episode', async () => {
      const user = await prisma.user.create({
        data: {
          email: `multiquestions-${Date.now()}-${Math.random()}@example.com`,
        },
      });

      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: 'Script',
          audioUrl: 'https://storage.example.com/audio.mp3',
          durationMinutes: 10,
        },
      });

      await prisma.question.createMany({
        data: [
          {
            episodeId: episode.id,
            userId: user.id,
            questionText: 'Question 1',
            answerText: 'Answer 1',
          },
          {
            episodeId: episode.id,
            userId: user.id,
            questionText: 'Question 2',
            answerText: 'Answer 2',
          },
        ],
      });

      const episodeWithQuestions = await prisma.episode.findUnique({
        where: { id: episode.id },
        include: { questions: true },
      });

      expect(episodeWithQuestions?.questions).toHaveLength(2);
    });
  });
});
