import { supabaseAdmin } from '../config/supabase';
import { config } from 'dotenv';
import crypto from 'crypto';

config();

/**
 * Audio storage service for managing audio file uploads and retrieval
 * Uses Supabase Storage for file storage
 */
export class AudioStorage {
  private bucketName: string;

  constructor(bucketName?: string) {
    this.bucketName = bucketName || process.env.AUDIO_STORAGE_BUCKET || 'episode-audio';
  }

  /**
   * Generate a unique filename for audio file
   */
  private generateFilename(scriptHash: string): string {
    const timestamp = Date.now();
    return `${scriptHash}-${timestamp}.mp3`;
  }

  /**
   * Upload audio buffer to storage
   * 
   * @param audioBuffer - Buffer containing MP3 audio data
   * @param scriptHash - Hash of the script used to generate the audio (for caching)
   * @returns Public URL of the uploaded audio file
   */
  async uploadAudio(audioBuffer: Buffer, scriptHash: string): Promise<string> {
    const filename = this.generateFilename(scriptHash);
    const filePath = `episodes/${filename}`;

    try {
      // Upload file to Supabase Storage using admin client (bypasses RLS)
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(filePath, audioBuffer, {
          contentType: 'audio/mpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload audio: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from upload');
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabaseAdmin.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded audio');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading audio to storage:', error);
      throw error;
    }
  }

  /**
   * Delete audio file from storage
   * 
   * @param audioUrl - Public URL of the audio file to delete
   * @returns True if deletion was successful
   */
  async deleteAudio(audioUrl: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const url = new URL(audioUrl);
      const pathParts = url.pathname.split(`/${this.bucketName}/`);
      
      if (pathParts.length < 2) {
        throw new Error('Invalid audio URL format');
      }

      const filePath = pathParts[1];

      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete audio: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting audio from storage:', error);
      throw error;
    }
  }

  /**
   * Check if audio file exists in storage
   * 
   * @param audioUrl - Public URL of the audio file
   * @returns True if file exists
   */
  async audioExists(audioUrl: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const url = new URL(audioUrl);
      const pathParts = url.pathname.split(`/${this.bucketName}/`);
      
      if (pathParts.length < 2) {
        return false;
      }

      const filePath = pathParts[1];

      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .list(filePath.split('/')[0], {
          search: filePath.split('/')[1],
        });

      if (error) {
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking audio existence:', error);
      return false;
    }
  }

  /**
   * Get bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}

// Export a singleton instance
export const audioStorage = new AudioStorage();
