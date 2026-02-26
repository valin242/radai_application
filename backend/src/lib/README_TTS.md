# Text-to-Speech (TTS) Audio Generation System

This directory contains the implementation of the TTS audio generation system for RadiAi MVP. The system provides text-to-speech conversion, audio file storage, and intelligent caching to minimize costs.

## Components

### 1. TTS Client (`tts-client.ts`)

Wrapper around OpenAI's TTS API with retry logic and exponential backoff.

**Features:**
- Converts script text to MP3 audio using OpenAI TTS
- Configurable voice options (alloy, echo, fable, onyx, nova, shimmer)
- Model selection (tts-1, tts-1-hd)
- Automatic retry with exponential backoff (up to 3 attempts)
- Buffer and file output support

**Usage:**
```typescript
import { ttsClient } from './lib/tts-client';

// Generate audio buffer
const audioBuffer = await ttsClient.generateAudio('Hello world', {
  voice: 'alloy',
  model: 'tts-1'
});

// Generate audio and save to file
const filePath = await ttsClient.generateAudioToFile(
  'Hello world',
  './output/audio.mp3'
);
```

### 2. Audio Storage (`audio-storage.ts`)

Manages audio file uploads and retrieval using Supabase Storage.

**Features:**
- Upload audio buffers to Supabase Storage
- Generate public URLs for audio files
- Delete audio files
- Check audio file existence

**Configuration:**
Set `AUDIO_STORAGE_BUCKET` environment variable (defaults to `episode-audio`)

**Usage:**
```typescript
import { audioStorage } from './lib/audio-storage';

// Upload audio
const audioUrl = await audioStorage.uploadAudio(audioBuffer, scriptHash);

// Delete audio
await audioStorage.deleteAudio(audioUrl);

// Check if audio exists
const exists = await audioStorage.audioExists(audioUrl);
```

### 3. Audio Cache (`audio-cache.ts`)

Implements caching system to avoid regenerating identical audio content.

**Features:**
- SHA-256 hash-based caching
- Database-backed cache storage
- Automatic cache lookup and storage
- Cache management utilities

**Database Schema:**
```sql
CREATE TABLE audio_cache (
  id UUID PRIMARY KEY,
  script_hash VARCHAR UNIQUE,
  audio_url VARCHAR,
  created_at TIMESTAMP
);
```

**Usage:**
```typescript
import { audioCacheService } from './lib/audio-cache';

// Generate script hash
const scriptHash = audioCacheService.generateScriptHash(scriptText);

// Check cache
const cachedUrl = await audioCacheService.getCachedAudio(scriptHash);

// Store in cache
await audioCacheService.cacheAudio(scriptHash, audioUrl);

// Get or generate with automatic caching
const { audioUrl, fromCache } = await audioCacheService.getOrGenerateAudio(
  scriptText,
  async (text, hash) => {
    // Your audio generation logic
    return audioUrl;
  }
);
```

### 4. Audio Generation Service (`audio-generation.ts`)

Integrated service that combines TTS, storage, and caching.

**Features:**
- Automatic cache checking
- TTS generation on cache miss
- Audio upload to storage
- Duration estimation
- Complete audio lifecycle management

**Usage:**
```typescript
import { audioGenerationService } from './lib/audio-generation';

// Generate episode audio with caching
const { audioUrl, fromCache } = await audioGenerationService.generateEpisodeAudio(
  scriptText,
  { voice: 'alloy', model: 'tts-1' }
);

// Calculate estimated duration
const durationMinutes = audioGenerationService.calculateEstimatedDuration(scriptText);

// Delete episode audio
await audioGenerationService.deleteEpisodeAudio(audioUrl, scriptText);
```

## Cost Optimization

The system implements several cost optimization strategies:

1. **Script Hashing**: Identical scripts generate the same hash, enabling cache hits
2. **Cache-First Strategy**: Always checks cache before generating new audio
3. **Persistent Storage**: Audio files are stored permanently and reused
4. **Retry Logic**: Prevents unnecessary API calls on transient failures

## Error Handling

All components implement comprehensive error handling:

- **TTS Client**: Retries up to 3 times with exponential backoff
- **Audio Storage**: Graceful error handling with descriptive messages
- **Audio Cache**: Continues operation even if cache operations fail
- **Logging**: All errors are logged for debugging

## Testing

Each component has comprehensive unit tests:

- `tts-client.test.ts`: TTS generation and retry logic
- `audio-storage.test.ts`: Storage operations and error cases
- `audio-cache.test.ts`: Cache operations and database interactions
- `audio-generation.test.ts`: Integrated service functionality

Run tests:
```bash
npm test -- tts-client.test.ts
npm test -- audio-storage.test.ts
npm test -- audio-cache.test.ts
npm test -- audio-generation.test.ts
```

## Environment Variables

Required environment variables:

```env
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# Supabase Configuration (required)
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# Audio Storage Bucket (optional, defaults to 'episode-audio')
AUDIO_STORAGE_BUCKET=episode-audio
```

## Integration Example

Complete example of generating an episode audio:

```typescript
import { audioGenerationService } from './lib/audio-generation';
import { prisma } from './lib/prisma';

async function generateEpisodeAudio(userId: string, scriptText: string) {
  // Generate audio with caching
  const { audioUrl, fromCache } = await audioGenerationService.generateEpisodeAudio(
    scriptText,
    { voice: 'alloy', model: 'tts-1' }
  );

  // Calculate duration
  const durationMinutes = audioGenerationService.calculateEstimatedDuration(scriptText);

  // Store episode in database
  const episode = await prisma.episode.create({
    data: {
      userId,
      scriptText,
      audioUrl,
      durationMinutes,
    },
  });

  console.log(`Episode created: ${episode.id}`);
  console.log(`Audio URL: ${audioUrl}`);
  console.log(`From cache: ${fromCache}`);
  console.log(`Duration: ${durationMinutes} minutes`);

  return episode;
}
```

## Performance Considerations

- **Cache Hit Rate**: Monitor cache hit rate to optimize costs
- **Audio File Size**: MP3 format provides good compression
- **Storage Costs**: Consider implementing cleanup for old audio files
- **API Rate Limits**: Retry logic handles rate limiting gracefully

## Future Enhancements

Potential improvements for future iterations:

1. **Voice Cloning**: Support for custom voice models
2. **Audio Post-Processing**: Normalization, compression, effects
3. **Multi-Language Support**: TTS in multiple languages
4. **Streaming**: Stream audio generation for faster playback
5. **Cache Expiration**: Implement TTL for cache entries
6. **Analytics**: Track cache hit rates and generation costs
