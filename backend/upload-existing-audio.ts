import fs from 'fs';
import path from 'path';
import { audioStorage } from './src/lib/audio-storage';
import { prisma } from './src/lib/prisma';

async function uploadExistingAudio() {
  try {
    console.log('Uploading existing audio files to Supabase...\n');

    const audioDir = path.join(process.cwd(), 'audio-files');
    const files = fs.readdirSync(audioDir);

    console.log(`Found ${files.length} audio files\n`);

    for (const filename of files) {
      const filePath = path.join(audioDir, filename);
      const audioBuffer = fs.readFileSync(filePath);
      
      // Extract script hash from filename (format: hash-timestamp.mp3)
      const scriptHash = filename.split('-')[0];

      console.log(`Uploading ${filename}...`);
      console.log(`  Script hash: ${scriptHash}`);
      console.log(`  File size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);

      // Upload to Supabase
      const audioUrl = await audioStorage.uploadAudio(audioBuffer, scriptHash);
      
      console.log(`  ✓ Uploaded to: ${audioUrl}\n`);

      // Create episode record with this audio
      const user = await prisma.user.findUnique({
        where: { email: 'valin242.vp@gmail.com' },
      });

      if (!user) {
        console.error('User not found!');
        continue;
      }

      // Get articles with summaries
      const articles = await prisma.article.findMany({
        where: {
          summary: { not: null },
          feed: { userId: user.id },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      // Create episode
      const episode = await prisma.episode.create({
        data: {
          userId: user.id,
          scriptText: `Episode generated from ${articles.length} articles`,
          audioUrl,
          durationMinutes: 9,
        },
      });

      console.log(`  ✓ Created episode: ${episode.id}\n`);
    }

    console.log('All audio files uploaded successfully!');
  } catch (error) {
    console.error('Error uploading audio:', error);
  } finally {
    await prisma.$disconnect();
  }
}

uploadExistingAudio();
