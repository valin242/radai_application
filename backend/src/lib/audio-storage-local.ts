import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

/**
 * Local file system audio storage (for development/testing)
 * Stores audio files locally and serves them via the backend
 */
export class LocalAudioStorage {
  private storageDir: string;
  private baseUrl: string;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'audio-files');
    // Use environment variable or default to localhost
    // For production, set AUDIO_BASE_URL to your server's public URL
    const host = process.env.HOST || '0.0.0.0';
    const port = process.env.PORT || '3000';
    
    // If HOST is 0.0.0.0, we need to use a specific IP for the URL
    // In development, use localhost for web and the actual IP for mobile
    if (host === '0.0.0.0') {
      // Try to get the actual network IP
      this.baseUrl = process.env.AUDIO_BASE_URL || `http://192.168.12.184:${port}/audio`;
    } else {
      this.baseUrl = process.env.AUDIO_BASE_URL || `http://${host}:${port}/audio`;
    }
    
    console.log(`Audio base URL: ${this.baseUrl}`);
    
    // Ensure storage directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      console.log(`Created audio storage directory: ${this.storageDir}`);
    }
  }

  /**
   * Generate a unique filename for audio file
   */
  private generateFilename(scriptHash: string): string {
    const timestamp = Date.now();
    return `${scriptHash}-${timestamp}.mp3`;
  }

  /**
   * Upload audio buffer to local storage
   * 
   * @param audioBuffer - Buffer containing MP3 audio data
   * @param scriptHash - Hash of the script used to generate the audio
   * @returns Public URL of the uploaded audio file
   */
  async uploadAudio(audioBuffer: Buffer, scriptHash: string): Promise<string> {
    const filename = this.generateFilename(scriptHash);
    const filePath = path.join(this.storageDir, filename);

    try {
      // Write file to disk
      fs.writeFileSync(filePath, audioBuffer);
      console.log(`Audio file saved to: ${filePath}`);

      // Return public URL
      const publicUrl = `${this.baseUrl}/${filename}`;
      return publicUrl;
    } catch (error) {
      console.error('Error saving audio file:', error);
      throw new Error(`Failed to upload audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete audio file from local storage
   * 
   * @param audioUrl - Public URL of the audio file to delete
   * @returns True if deletion was successful
   */
  async deleteAudio(audioUrl: string): Promise<boolean> {
    try {
      // Extract filename from URL
      const filename = path.basename(audioUrl);
      const filePath = path.join(this.storageDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted audio file: ${filePath}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting audio file:', error);
      throw error;
    }
  }

  /**
   * Check if audio file exists in local storage
   * 
   * @param audioUrl - Public URL of the audio file
   * @returns True if file exists
   */
  async audioExists(audioUrl: string): Promise<boolean> {
    try {
      const filename = path.basename(audioUrl);
      const filePath = path.join(this.storageDir, filename);
      return fs.existsSync(filePath);
    } catch (error) {
      console.error('Error checking audio existence:', error);
      return false;
    }
  }

  /**
   * Get storage directory path
   */
  getStorageDir(): string {
    return this.storageDir;
  }
}

// Export a singleton instance
export const localAudioStorage = new LocalAudioStorage();
