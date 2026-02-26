/**
 * Trigger episode generation for testuser@gmail.com using job queue
 */

import dotenv from 'dotenv';
import { prisma } from './src/lib/prisma';
import {
  addGenerateEpisodesJob,
  closeQueues,
} from './src/jobs/queue';

dotenv.config();

async function main() {
  const userEmail = 'testuser@gmail.com';
  
  console.log(`Triggering episode generation for: ${userEmail}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found user: ${user.email}`);

    // Add episode generation job to queue
    await addGenerateEpisodesJob({ userIds: [user.id] });

    console.log('\n✓ Episode generation job queued successfully!');
    console.log('Check the backend logs to monitor progress.');
    console.log('This should take 1-2 minutes.');
    console.log('Then refresh the Episodes tab in your app!');

    await closeQueues();
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
