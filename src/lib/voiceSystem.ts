import { multiModalProcessor } from './multiModal';

export interface VoiceSettings {
  whisperApiKey?: string;
  elevenLabsApiKey?: string;
  voiceId: string;
  model: 'eleven_monolingual_v1' | 'eleven_multilingual_v1';
  voiceStability: number; // 0-1
  voiceSimilarity: number; // 0-1
  style: number; // 0-1
  speakerBoost: boolean;
  language: string;
  autoSpeak: boolean;
  speechRate: number;
}

export interface AudioRecording {
  blob: Blob;
  duration: number;
  timestamp: Date;
  transcription?: string;
}

export interface VoiceMessage {
  text: string;
  audioUrl?: string;
  duration?: number;
  voiceSettings: VoiceSettings;
  timestamp: Date;
}

export class VoiceSystem {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording: boolean = false;
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private settings: VoiceSettings;

  constructor() {
    this.settings = this.loadVoiceSettings();
    this.initializeAudioContext();
  }

  private loadVoiceSettings(): VoiceSettings {
    const stored = localStorage.getItem('voiceSettings');
    return stored
      ? { ...this.getDefaultSettings(), ...JSON.parse(stored) }
      : this.getDefaultSettings();
  }

  private getDefaultSettings(): VoiceSettings {
    return {
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel voice (ElevenLabs default)
      model: 'eleven_monolingual_v1',
      voiceStability: 0.5,
      voiceSimilarity: 0.8,
      style: 0.0,
      speakerBoost: true,
      language: 'en',
      autoSpeak: false,
      speechRate: 1.0,
    };
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('Audio context initialization failed:', error);
    }
  }

  // Speech-to-Text using Whisper API
  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start(100); // Collect data every 100ms

      // Auto-stop after 30 seconds to prevent runaway recording
      setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording();
        }
      }, 30000);
    } catch (error) {
      console.error('Recording failed:', error);
      throw new Error('Could not access microphone. Please check permissions.');
    }
  }

  async stopRecording(): Promise<AudioRecording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Not currently recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const duration = this.calculateAudioDuration(audioBlob);

        const recording: AudioRecording = {
          blob: audioBlob,
          duration,
          timestamp: new Date(),
        };

        this.isRecording = false;
        resolve(recording);
      };

      this.mediaRecorder.stop();
    });
  }

  private calculateAudioDuration(blob: Blob): number {
    // Rough estimation based on blob size and typical WebM bitrate
    // In a real implementation, you'd use Web Audio API to get precise duration
    const bytesPerSecond = 64000 / 8; // Rough estimate for Opus codec
    return blob.size / bytesPerSecond;
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    if (!this.settings.whisperApiKey) {
      throw new Error('Whisper API key not configured');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', this.settings.language);
    formData.append('response_format', 'json');

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.settings.whisperApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status}`);
      }

      const result = await response.json();
      return result.text || '';
    } catch (error) {
      console.error('Transcription failed:', error);
      throw new Error('Speech-to-text transcription failed');
    }
  }

  // Text-to-Speech using ElevenLabs API
  async generateSpeech(text: string): Promise<VoiceMessage> {
    if (!this.settings.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voiceMessage: VoiceMessage = {
      text,
      voiceSettings: { ...this.settings },
      timestamp: new Date(),
    };

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.settings.voiceId}`,
        {
          method: 'POST',
          headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.settings.elevenLabsApiKey,
          },
          body: JSON.stringify({
            text,
            model_id: this.settings.model,
            voice_settings: {
              stability: this.settings.voiceStability,
              similarity_boost: this.settings.voiceSimilarity,
              style: this.settings.style,
              use_speaker_boost: this.settings.speakerBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      voiceMessage.audioUrl = audioUrl;
      voiceMessage.duration = await this.getAudioDuration(audioBlob);

      return voiceMessage;
    } catch (error) {
      console.error('Speech generation failed:', error);
      throw new Error('Text-to-speech generation failed');
    }
  }

  private async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise(resolve => {
      const audio = new Audio(URL.createObjectURL(blob));
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      });
      audio.addEventListener('error', () => {
        resolve(0); // Fallback
        URL.revokeObjectURL(audio.src);
      });
    });
  }

  async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop current audio if playing
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }

      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.volume = 0.8; // Default volume

      this.currentAudio.addEventListener('ended', () => {
        resolve();
      });

      this.currentAudio.addEventListener('error', error => {
        reject(error);
      });

      this.currentAudio.play().catch(reject);
    });
  }

  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
  }

  // Voice Settings Management
  updateVoiceSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveVoiceSettings();
  }

  getVoiceSettings(): VoiceSettings {
    return { ...this.settings };
  }

  private saveVoiceSettings(): void {
    localStorage.setItem('voiceSettings', JSON.stringify(this.settings));
  }

  // Voice Activity Detection
  async detectVoiceActivity(audioBlob: Blob): Promise<boolean> {
    // Simple voice activity detection using Web Audio API
    if (!this.audioContext) return false;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const samples = 1024; // Analyze first 1024 samples
      let sum = 0;

      for (let i = 0; i < Math.min(samples, channelData.length); i++) {
        sum += channelData[i] * channelData[i];
      }

      const rms = Math.sqrt(sum / samples);
      const threshold = 0.01; // Adjust based on testing

      return rms > threshold;
    } catch (error) {
      console.error('Voice activity detection failed:', error);
      return false;
    }
  }

  // Audio Quality Analysis
  async analyzeAudioQuality(audioBlob: Blob): Promise<{
    duration: number;
    sampleRate: number;
    channels: number;
    quality: 'poor' | 'good' | 'excellent';
  }> {
    if (!this.audioContext) {
      return { duration: 0, sampleRate: 0, channels: 0, quality: 'poor' };
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const duration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;

      // Quality assessment
      let quality: 'poor' | 'good' | 'excellent' = 'poor';
      if (sampleRate >= 44100 && duration > 1) {
        quality = 'excellent';
      } else if (sampleRate >= 22050 && duration > 0.5) {
        quality = 'good';
      }

      return { duration, sampleRate, channels, quality };
    } catch (error) {
      console.error('Audio quality analysis failed:', error);
      return { duration: 0, sampleRate: 0, channels: 0, quality: 'poor' };
    }
  }

  // Voice Command Processing
  processVoiceCommand(transcript: string): {
    command: string;
    parameters: string[];
    confidence: number;
  } {
    const lowerTranscript = transcript.toLowerCase();

    // Simple command patterns
    const commands = [
      { pattern: /(?:play|start|begin) recording/, command: 'start_recording' },
      { pattern: /(?:stop|end|finish) recording/, command: 'stop_recording' },
      { pattern: /(?:speak|say|tell me) (.+)/, command: 'speak_text' },
      { pattern: /(?:change|switch) voice/, command: 'change_voice' },
      { pattern: /(?:quieter|softer|louder)/, command: 'adjust_volume' },
      { pattern: /(?:repeat|say again)/, command: 'repeat_last' },
    ];

    for (const { pattern, command } of commands) {
      const match = lowerTranscript.match(pattern);
      if (match) {
        return {
          command,
          parameters: match.slice(1),
          confidence: 0.8,
        };
      }
    }

    return {
      command: 'unknown',
      parameters: [],
      confidence: 0.0,
    };
  }

  // Cleanup
  cleanup(): void {
    this.stopAudio();
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  // Getters
  get isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  get isAudioPlaying(): boolean {
    return this.currentAudio && !this.currentAudio.paused;
  }

  // ElevenLabs Voice Options
  static getAvailableVoices(): Array<{
    id: string;
    name: string;
    language: string;
    gender: string;
  }> {
    return [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', language: 'en', gender: 'female' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', language: 'en', gender: 'female' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', language: 'en', gender: 'female' },
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', language: 'en', gender: 'male' },
      { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', language: 'en', gender: 'male' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', language: 'en', gender: 'male' },
      { id: '29vD33N1CtxCmqQRPOHJ', name: 'Elli', language: 'en', gender: 'female' },
      { id: 'IKne3meq5aSn9XLyUdCD', name: 'Josh', language: 'en', gender: 'male' },
      { id: 'MqgvQMtHz6iHFNTrLvWL', name: 'Sam', language: 'en', gender: 'male' },
      { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Jessie', language: 'en', gender: 'female' },
    ];
  }
}

// Global voice system instance
export const voiceSystem = new VoiceSystem();
