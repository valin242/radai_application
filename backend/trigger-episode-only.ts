import dotenv from 'dotenv';
import { prisma } from './src/lib/prisma';
import { addGenerateEpisodesJob, closeQueues } from './src/jobs/queue';

dotenv.config();

async function triggerEpisodeOnly() {
  console.log('Generating episode from existing summaries...\n');

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'valin242.vp@gmail.com' },
    });

    if (!user) {
      console.error('User not found!');
      process.exit(1);
    }

    console.log(`Found user: ${user.email}\n`);

    // Generate episode for your user only
    console.log('Generating episode...');
    await addGenerateEpisodesJob({
      userIds: [user.id],
    });
    console.log('✓ Episode generation job queued\n');

    console.log('Job queued successfully!');
    console.log('Check the backend logs to monitor progress.');
    console.log('\nThis should take 1-2 minutes.');
    console.log('Then refresh the Episodes tab in your app!\n');
  } catch (error) {
    console.error('Error triggering episode generation:', error);
    process.exit(1);
  } finally {
    await closeQueues();
    await prisma.$disconnect();
    process.exit(0);
  }
}

triggerEpisodeOnly();
