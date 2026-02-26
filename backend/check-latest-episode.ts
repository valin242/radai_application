import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestEpisode() {
  try {
    console.log('Checking for latest episode...\n');

    const latestEpisode = await prisma.episode.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        episodeArticles: {
          include: {
            article: {
              select: {
                title: true,
              },
            },
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!latestEpisode) {
      console.log('No episodes found in database.');
      return;
    }

    console.log('Latest Episode:');
    console.log('================');
    console.log(`Episode ID: ${latestEpisode.id}`);
    console.log(`User: ${latestEpisode.user.email}`);
    console.log(`Created: ${latestEpisode.createdAt}`);
    console.log(`Duration: ${latestEpisode.durationMinutes} minutes`);
    console.log(`Audio URL: ${latestEpisode.audioUrl}`);
    console.log(`Script length: ${latestEpisode.scriptText.length} characters`);
    console.log(`\nLinked Articles (${latestEpisode.episodeArticles.length}):`);
    
    if (latestEpisode.episodeArticles.length === 0) {
      console.log('  No articles linked to this episode.');
    } else {
      latestEpisode.episodeArticles.forEach((ea, idx) => {
        console.log(`  ${idx + 1}. ${ea.article.title}`);
      });
    }

    console.log('\n---\n');

    // Check total episodes
    const totalEpisodes = await prisma.episode.count();
    console.log(`Total episodes in database: ${totalEpisodes}`);

  } catch (error) {
    console.error('Error checking episode:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestEpisode();
