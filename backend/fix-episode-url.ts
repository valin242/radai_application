import { prisma } from './src/lib/prisma';

async function fixEpisodeUrl() {
  try {
    console.log('Fixing episode audio URLs...\n');

    // Get all episodes with localhost URLs
    const episodes = await prisma.episode.findMany({
      where: {
        audioUrl: {
          contains: 'localhost',
        },
      },
    });

    console.log(`Found ${episodes.length} episodes with localhost URLs\n`);

    for (const episode of episodes) {
      const oldUrl = episode.audioUrl;
      const newUrl = oldUrl.replace('http://localhost:3000', 'http://192.168.12.184:3000');

      await prisma.episode.update({
        where: { id: episode.id },
        data: { audioUrl: newUrl },
      });

      console.log(`Updated episode ${episode.id}`);
      console.log(`  Old: ${oldUrl}`);
      console.log(`  New: ${newUrl}\n`);
    }

    console.log('✓ All episode URLs updated!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEpisodeUrl();
