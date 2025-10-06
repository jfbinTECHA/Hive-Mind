import { EmotionalStateManager } from './emotion';

export interface VoiceSettings {
  voiceId: string;
  stability: number; // 0-1, voice stability
  similarity: number; // 0-1, voice similarity to original
  style: number; // 0-1, speaking style exaggeration
  speed: number; // 0.5-2.0, speech speed
}

export interface VoiceGenerationRequest {
  text: string;
  voiceSettings: VoiceSettings;
  model?: string;
}

export interface VoiceCacheEntry {
  text: string;
  voiceId: string;
  audioUrl: string;
  timestamp: number;
  expiresAt: number;
}

export class ElevenLabsService {
  private static readonly API_BASE = 'https://api.elevenlabs.io/v1';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private apiKey: string | null = null;
  private voiceCache: Map<string, VoiceCacheEntry> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || null;
  }

  /**
   * Set API key for ElevenLabs
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Get voice settings for a personality
   */
  static getVoiceSettingsForPersonality(personality: string): VoiceSettings {
    const personalityVoices: Record<string, VoiceSettings> = {
      friendly: {
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel (warm, friendly)
        stability: 0.75,
        similarity: 0.8,
        style: 0.6,
        speed: 1.1
      },
      professional: {
        voiceId: '29vD33N1CtxCmqQRPOHJ', // Drew (professional, clear)
        stability: 0.8,
        similarity: 0.85,
        style: 0.4,
        speed: 0.95
      },
      humorous: {
        voiceId: 'AZnzlk1XvdvUeBnXmlld', // Antoni (expressive, fun)
        stability: 0.7,
        similarity: 0.75,
        style: 0.8,
        speed: 1.2
      },
      serious: {
        voiceId: 'ErXwobaYiN019PkySvjV', // Arnold (deep, serious)
        stability: 0.85,
        similarity: 0.9,
        style: 0.3,
        speed: 0.9
      }
    };

    return personalityVoices[personality] || personalityVoices.friendly;
  }

  /**
   * Adjust voice settings based on emotional state
   */
  static adjustVoiceForEmotion(
    baseSettings: VoiceSettings,
    emotionalState?: any
  ): VoiceSettings {
    if (!emotionalState) return baseSettings;

    const adjusted = { ...baseSettings };

    // Adjust speed based on energy
    adjusted.speed *= (0.8 + emotionalState.energy * 0.4); // 0.8-1.2 range

    // Adjust stability based on mood (negative moods = less stable)
    if (emotionalState.mood < 0) {
      adjusted.stability *= 0.8;
      adjusted.similarity *= 0.9;
    }

    // Adjust style based on emotional intensity
    const intensity = Math.abs(emotionalState.mood) + emotionalState.energy;
    adjusted.style = Math.min(1.0, adjusted.style + intensity * 0.3);

    // Curiosity increases speech speed slightly
    if (emotionalState.curiosity > 0.7) {
      adjusted.speed *= 1.1;
    }

    return adjusted;
  }

  /**
   * Generate voice audio from text
   */
  async generateVoice(request: VoiceGenerationRequest): Promise<ArrayBuffer | null> {
    if (!this.isAvailable()) {
      console.warn('ElevenLabs API key not configured');
      return null;
    }

    try {
      const response = await fetch(`${ElevenLabsService.API_BASE}/text-to-speech/${request.voiceSettings.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey!
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.model || 'eleven_monolingual_v1',
          voice_settings: {
            stability: request.voiceSettings.stability,
            similarity_boost: request.voiceSettings.similarity,
            style: request.voiceSettings.style,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('ElevenLabs API error:', error);
        return null;
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Failed to generate voice:', error);
      return null;
    }
  }

  /**
   * Generate and cache voice audio
   */
  async generateAndCacheVoice(
    text: string,
    personality: string,
    emotionalState?: any
  ): Promise<string | null> {
    const cacheKey = this.getCacheKey(text, personality, emotionalState);

    // Check cache first
    const cached = this.voiceCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.audioUrl;
    }

    // Generate new voice
    const baseSettings = ElevenLabsService.getVoiceSettingsForPersonality(personality);
    const adjustedSettings = ElevenLabsService.adjustVoiceForEmotion(baseSettings, emotionalState);

    const audioBuffer = await this.generateVoice({
      text,
      voiceSettings: adjustedSettings
    });

    if (!audioBuffer) return null;

    // Convert to blob URL
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);

    // Cache the result
    this.voiceCache.set(cacheKey, {
      text,
      voiceId: adjustedSettings.voiceId,
      audioUrl,
      timestamp: Date.now(),
      expiresAt: Date.now() + ElevenLabsService.CACHE_DURATION
    });

    return audioUrl;
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getAvailableVoices(): Promise<any[]> {
    if (!this.isAvailable()) return [];

    try {
      const response = await fetch(`${ElevenLabsService.API_BASE}/voices`, {
        headers: {
          'xi-api-key': this.apiKey!
        }
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return [];
    }
  }

  /**
   * Generate cache key for voice caching
   */
  private getCacheKey(text: string, personality: string, emotionalState?: any): string {
    const stateHash = emotionalState ?
      `${emotionalState.mood}_${emotionalState.energy}_${emotionalState.trust}_${emotionalState.curiosity}` :
      'neutral';
    return `${personality}_${stateHash}_${btoa(text).slice(0, 50)}`;
  }

  /**
   * Clean expired cache entries
   */
  cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.voiceCache.entries()) {
      if (entry.expiresAt <= now) {
        URL.revokeObjectURL(entry.audioUrl);
        this.voiceCache.delete(key);
      }
    }
  }

  /**
   * Get voice statistics
   */
  getVoiceStats(): { cached: number; totalRequests: number } {
    return {
      cached: this.voiceCache.size,
      totalRequests: this.voiceCache.size // Simplified
    };
  }
}

// Global voice service instance
export const voiceService = new ElevenLabsService();

// Clean cache periodically
setInterval(() => {
  voiceService.cleanCache();
}, 60 * 60 * 1000); // Clean every hour