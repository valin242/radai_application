import { prisma } from './prisma';

/**
 * Simple test to verify Prisma client is properly configured
 * This doesn't connect to the database, just verifies the client exists
 */
describe('Prisma Client', () => {
  it('should be defined', () => {
    expect(prisma).toBeDefined();
  });

  it('should have user model', () => {
    expect(prisma.user).toBeDefined();
  });

  it('should have feed model', () => {
    expect(prisma.feed).toBeDefined();
  });

  it('should have article model', () => {
    expect(prisma.article).toBeDefined();
  });

  it('should have episode model', () => {
    expect(prisma.episode).toBeDefined();
  });

  it('should have episodeArticle model', () => {
    expect(prisma.episodeArticle).toBeDefined();
  });

  it('should have question model', () => {
    expect(prisma.question).toBeDefined();
  });
});
