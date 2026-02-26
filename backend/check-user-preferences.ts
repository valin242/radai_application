/**
 * Check user preferences and interest profile
 */

import prisma from './src/lib/prisma';

async function main() {
  const userEmail = 'testuser@gmail.com';
  
  console.log(`Checking preferences for: ${userEmail}\n`);

  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        preferences: true
      }
    });

    if (!user) {
      console.log('User not found');
      await prisma.$disconnect();
      return;
    }

    console.log('User ID:', user.id);
    console.log('\nPreferences:');
    
    if (!user.preferences) {
      console.log('  ⚠ No preferences found');
    } else {
      console.log(`  Onboarding completed: ${user.preferences.onboardingCompleted}`);
      console.log(`  Selected topics: ${user.preferences.selectedTopics.join(', ')}`);
      console.log(`  Custom keywords: ${user.preferences.customKeywords.join(', ') || 'None'}`);
      console.log(`  Relevance threshold: ${user.preferences.relevanceThreshold}%`);
      
      // Check if interest profile embedding exists
      const result = await prisma.$queryRaw<Array<{ embedding: string | null }>>`
        SELECT interest_profile_embedding::text as embedding 
        FROM user_preferences 
        WHERE user_id = ${user.id}
      `;
      
      if (result.length > 0 && result[0].embedding) {
        console.log(`  Interest profile embedding: EXISTS (${result[0].embedding.substring(0, 50)}...)`);
      } else {
        console.log('  Interest profile embedding: NOT FOUND');
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
