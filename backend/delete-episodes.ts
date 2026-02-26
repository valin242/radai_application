import { prisma } from './src/lib/prisma';

async function deleteEpisodes() {
  try {
    console.log('Deleting all episodes...\n');

    const result = await prisma.episode.deleteMany({});

    console.log(`✓ Deleted ${result.count} episodes\n`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteEpisodes();
