/**
 * Trigger episode generation for testuser@gmail.com
 */

import prisma from './src/lib/prisma';
import { generateEpisodeScript } from './src/lib/episode-script-generation';
import { audioGenerationService } from './src/lib/audio-generation';
import { createLogger } from './src/lib/logger';

const logger = createLogger({ component: 'episode-generation-script' });

async function main() {
  const userEmail = 'testuser@gmail.com';
  
  console.log(`Generating episode for: ${userEmail}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    // Generate episode script (this fetches articles internally)
    console.log('Generating episode script...');
    const { scriptText, articleIds, durationMinutes } = await generateEpisodeScript(user.id);

    console.log(`Script generated: ${scriptText.length} characters`);
    console.log(`Articles included: ${articleIds.length}`);

    // Generate audio
    console.log('\nGenerating audio...');
    const { audioUrl, fromCache } = await audioGenerationService.generateEpisodeAudio(scriptText);

    console.log(`Audio ${fromCache ? 'retrieved from cache' : 'generated'}: ${audioUrl}`);
    console.log(`Duration: ${durationMinutes} minutes`);

    // Create episode
    console.log('\nCreating episode record...');
    const episode = await prisma.episode.create({
      data: {
        userId: user.id,
        scriptText: scriptText,
        audioUrl: audioUrl,
        durationMinutes: durationMinutes,
        episodeArticles: {
          create: articleIds.map(id => ({
            articleId: id
          }))
        }
      }
    });

    console.log(`\n✓ Episode created successfully!`);
    console.log(`  Episode ID: ${episode.id}`);
    console.log(`  Audio URL: ${episode.audioUrl}`);
    console.log(`  Duration: ${episode.durationMinutes} minutes`);
    console.log(`  Articles: ${articleIds.length}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    logger.error('Episode generation failed', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
