import { prisma } from './src/lib/prisma';

async function checkEpisodes() {
  try {
    const episodes = await prisma.episode.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\nTotal episodes in database: ${episodes.length}\n`);

    if (episodes.length === 0) {
      console.log('No episodes found!');
      console.log('\nChecking for errors in the last job run...\n');
    } else {
      episodes.forEach((episode) => {
        console.log(`User: ${episode.user.email}`);
        console.log(`Episode ID: ${episode.id}`);
        console.log(`Duration: ${episode.durationMinutes} minutes`);
        console.log(`Audio URL: ${episode.audioUrl}`);
        console.log(`Script length: ${episode.scriptText.length} characters`);
        console.log(`Created: ${episode.createdAt}`);
        console.log('---');
      });
    }

    // Check articles with summaries
    const articlesWithSummaries = await prisma.article.count({
      where: {
        summary: { not: null },
        feed: {
          user: {
            email: 'valin242.vp@gmail.com',
          },
        },
      },
    });

    console.log(`\nArticles with summaries for valin242.vp@gmail.com: ${articlesWithSummaries}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEpisodes();
