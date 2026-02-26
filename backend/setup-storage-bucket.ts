import { supabase } from './src/config/supabase';

async function setupStorageBucket() {
  const bucketName = 'episode-audio';
  
  console.log(`Setting up storage bucket: ${bucketName}\n`);

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      process.exit(1);
    }

    const bucketExists = buckets?.some((b) => b.name === bucketName);

    if (bucketExists) {
      console.log(`✓ Bucket '${bucketName}' already exists`);
    } else {
      // Create bucket
      console.log(`Creating bucket '${bucketName}'...`);
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true, // Make files publicly accessible
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
      });

      if (error) {
        console.error('Error creating bucket:', error);
        process.exit(1);
      }

      console.log(`✓ Bucket '${bucketName}' created successfully`);
    }

    console.log('\nStorage bucket is ready!');
    console.log('You can now generate episodes with audio.\n');
  } catch (error) {
    console.error('Error setting up storage bucket:', error);
    process.exit(1);
  }
}

setupStorageBucket();
