/**
 * Update relevance threshold for testuser@gmail.com
 */

import prisma from './src/lib/prisma';

async function main() {
  const userEmail = 'testuser@gmail.com';
  const newThreshold = 25; // Lower to 25% to match actual similarity scores
  
  console.log(`Updating threshold for: ${userEmail}`);
  console.log(`New threshold: ${newThreshold}%\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    await prisma.userPreferences.update({
      where: { userId: user.id },
      data: { relevanceThreshold: newThreshold }
    });

    console.log('✓ Threshold updated successfully!');
    console.log('\nNow run the pipeline again to see articles pass the filter.');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
