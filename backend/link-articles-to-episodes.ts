import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkArticlesToEpisodes() {
  try {
    console.log('Finding episodes without linked articles...\n');

    // Find episodes without articles
    const episodes = await prisma.episode.findMany({
      include: {
        episodeArticles: true,
        user: {
          select: {
            email: true,
            id: true,
          },
        },
      },
    });

    const episodesWithoutArticles = episodes.filter(
      (ep) => ep.episodeArticles.length === 0
    );

    console.log(`Found ${episodesWithoutArticles.length} episodes without linked articles\n`);

    if (episodesWithoutArticles.length === 0) {
      console.log('All episodes already have articles linked!');
      return;
    }

    for (const episode of episodesWithoutArticles) {
      console.log(`Processing episode ${episode.id}...`);
      console.log(`  User: ${episode.user.email}`);
      console.log(`  Created: ${episode.createdAt}`);

      // Get recent articles for this user (from around the time the episode was created)
      const episodeDate = new Date(episode.createdAt);
      const startDate = new Date(episodeDate);
      startDate.setHours(startDate.getHours() - 48); // 48 hours before episode

      const articles = await prisma.article.findMany({
        where: {
          feed: {
            userId: episode.user.id,
          },
          summary: {
            not: null,
          },
          createdAt: {
            lte: episodeDate, // Articles created before or at episode time
            gte: startDate, // Within 48 hours before
          },
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take: 10, // Link up to 10 articles
      });

      if (articles.length === 0) {
        console.log(`  No suitable articles found for this episode\n`);
        continue;
      }

      // Link articles to episode
      await prisma.episodeArticle.createMany({
        data: articles.map((article) => ({
          episodeId: episode.id,
          articleId: article.id,
        })),
      });

      console.log(`  ✓ Linked ${articles.length} articles:`);
      articles.forEach((article, idx) => {
        console.log(`    ${idx + 1}. ${article.title}`);
      });
      console.log();
    }

    console.log('Done! All episodes now have articles linked.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkArticlesToEpisodes();
