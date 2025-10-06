import { Database, pool } from './database';

export interface MultiModalInput {
  type: 'text' | 'image' | 'voice' | 'location';
  content: string; // Base64 for images/audio, text for text/location
  metadata: {
    timestamp: Date;
    location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      placeName?: string;
    };
    deviceInfo?: {
      platform: string;
      userAgent: string;
    };
    processingResults?: {
      transcription?: string;
      imageAnalysis?: ImageAnalysis;
      sentiment?: number;
      entities?: string[];
      weather?: any; // Weather data for location inputs
    };
  };
}

export interface ImageAnalysis {
  description: string;
  objects: string[];
  colors: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  landmarks?: string[];
  text?: string; // OCR results
  faces?: FaceDetection[];
  categories: string[];
}

export interface FaceDetection {
  age: number;
  gender: 'male' | 'female' | 'unknown';
  emotion: string;
  confidence: number;
}

export interface VoiceAnalysis {
  transcription: string;
  confidence: number;
  language: string;
  sentiment: number;
  speakerId?: string;
  duration: number;
  wordCount: number;
}

export class MultiModalProcessor {
  private visionApiKey?: string;
  private speechApiKey?: string;

  constructor() {
    this.visionApiKey = process.env.GOOGLE_VISION_API_KEY;
    this.speechApiKey = process.env.GOOGLE_SPEECH_API_KEY;
  }

  /**
   * Process image input
   */
  async processImage(imageData: string, metadata?: any): Promise<ImageAnalysis> {
    try {
      // Use Google Vision API or similar
      if (this.visionApiKey) {
        return await this.analyzeWithGoogleVision(imageData);
      } else {
        // Fallback to basic analysis
        return this.basicImageAnalysis(imageData);
      }
    } catch (error) {
      console.error('Image processing error:', error);
      return this.basicImageAnalysis(imageData);
    }
  }

  /**
   * Process voice input
   */
  async processVoice(audioData: string, metadata?: any): Promise<VoiceAnalysis> {
    try {
      if (this.speechApiKey) {
        return await this.transcribeWithGoogleSpeech(audioData);
      } else {
        // Fallback - would need a different speech service
        throw new Error('Speech API not configured');
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      throw error;
    }
  }

  /**
   * Process location data
   */
  async processLocation(latitude: number, longitude: number): Promise<{
    placeName: string;
    categories: string[];
    weather?: any;
  }> {
    try {
      // Use reverse geocoding API
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${process.env.OPENCAGE_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results[0]) {
        const result = data.results[0];
        return {
          placeName: result.formatted,
          categories: result.components._category || [],
          weather: await this.getWeatherData(latitude, longitude)
        };
      }

      return {
        placeName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        categories: []
      };
    } catch (error) {
      console.error('Location processing error:', error);
      return {
        placeName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        categories: []
      };
    }
  }

  /**
   * Store multi-modal input in database
   */
  async storeMultiModalInput(
    userId: number,
    characterId: number,
    input: MultiModalInput
  ): Promise<any> {
    const query = `
      INSERT INTO multimodal_inputs (
        user_id, character_id, input_type, content, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      characterId,
      input.type,
      input.content,
      JSON.stringify(input.metadata)
    ]);

    return result.rows[0];
  }

  /**
   * Get multi-modal inputs for memory processing
   */
  async getMultiModalInputs(
    userId: number,
    characterId?: number,
    limit: number = 50
  ): Promise<MultiModalInput[]> {
    let query = `
      SELECT * FROM multimodal_inputs
      WHERE user_id = $1
    `;
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (characterId) {
      query += ` AND character_id = $${paramIndex}`;
      params.push(characterId);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      type: row.input_type,
      content: row.content,
      metadata: row.metadata
    }));
  }

  /**
   * Generate response considering multi-modal context
   */
  async generateMultiModalResponse(
    userId: number,
    characterId: number,
    currentInput: MultiModalInput,
    conversationHistory: any[]
  ): Promise<string> {
    const recentInputs = await this.getMultiModalInputs(userId, characterId, 10);

    // Analyze multi-modal patterns
    const patterns = this.analyzeMultiModalPatterns(recentInputs);

    // Generate contextual response
    let response = '';

    switch (currentInput.type) {
      case 'image':
        response = await this.generateImageResponse(currentInput, patterns);
        break;
      case 'voice':
        response = await this.generateVoiceResponse(currentInput, patterns);
        break;
      case 'location':
        response = await this.generateLocationResponse(currentInput, patterns);
        break;
      default:
        response = 'I received your message!';
    }

    // Store the response context for future reference
    await this.storeResponseContext(userId, characterId, currentInput, response);

    return response;
  }

  // Private helper methods
  private async analyzeWithGoogleVision(imageData: string): Promise<ImageAnalysis> {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.visionApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageData.split(',')[1] }, // Remove data:image/jpeg;base64,
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'TEXT_DETECTION' },
            { type: 'FACE_DETECTION' },
            { type: 'LANDMARK_DETECTION' },
            { type: 'IMAGE_PROPERTIES' }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.responses && data.responses[0]) {
      const result = data.responses[0];
      return {
        description: result.labelAnnotations?.[0]?.description || 'An image',
        objects: result.labelAnnotations?.map((label: any) => label.description) || [],
        colors: result.imagePropertiesAnnotation?.dominantColors?.colors?.map(
          (color: any) => `rgb(${color.color.red || 0}, ${color.color.green || 0}, ${color.color.blue || 0})`
        ) || [],
        sentiment: 'neutral', // Would need additional analysis
        landmarks: result.landmarkAnnotations?.map((landmark: any) => landmark.description) || [],
        text: result.textAnnotations?.[0]?.description || '',
        faces: result.faceAnnotations?.map((face: any) => ({
          age: face.detectionConfidence > 0.8 ? Math.floor(Math.random() * 40) + 20 : 0, // Mock age detection
          gender: face.detectionConfidence > 0.8 ? (Math.random() > 0.5 ? 'male' : 'female') : 'unknown',
          emotion: 'neutral', // Would need emotion analysis
          confidence: face.detectionConfidence || 0
        })) || [],
        categories: result.labelAnnotations?.slice(0, 5).map((label: any) => label.description) || []
      };
    }

    return this.basicImageAnalysis(imageData);
  }

  private basicImageAnalysis(imageData: string): ImageAnalysis {
    // Basic fallback analysis
    return {
      description: 'An image shared by the user',
      objects: ['image'],
      colors: ['unknown'],
      sentiment: 'neutral',
      categories: ['image']
    };
  }

  private async transcribeWithGoogleSpeech(audioData: string): Promise<VoiceAnalysis> {
    const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${this.speechApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: false,
        },
        audio: {
          content: audioData.split(',')[1] // Remove data:audio/webm;base64,
        }
      })
    });

    const data = await response.json();

    if (data.results && data.results[0]) {
      const transcription = data.results[0].alternatives[0].transcript;
      return {
        transcription,
        confidence: data.results[0].alternatives[0].confidence || 0.8,
        language: 'en-US',
        sentiment: 0, // Would need additional analysis
        duration: 0, // Would need audio analysis
        wordCount: transcription.split(' ').length
      };
    }

    throw new Error('Speech transcription failed');
  }

  private async getWeatherData(latitude: number, longitude: number): Promise<any> {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
      );
      return await response.json();
    } catch (error) {
      console.error('Weather data fetch error:', error);
      return null;
    }
  }

  private analyzeMultiModalPatterns(inputs: MultiModalInput[]): any {
    const patterns = {
      imageFrequency: inputs.filter(i => i.type === 'image').length,
      voiceFrequency: inputs.filter(i => i.type === 'voice').length,
      locationFrequency: inputs.filter(i => i.type === 'location').length,
      commonLocations: [] as string[],
      imageThemes: [] as string[],
      voiceSentiment: 0
    };

    // Analyze patterns
    const locations = inputs
      .filter(i => i.type === 'location')
      .map(i => i.metadata.location?.placeName)
      .filter((name): name is string => Boolean(name));

    patterns.commonLocations = [...new Set(locations)].slice(0, 5);

    return patterns;
  }

  private async generateImageResponse(input: MultiModalInput, patterns: any): Promise<string> {
    const analysis = input.metadata.processingResults?.imageAnalysis;

    if (!analysis) {
      return "I see you've shared an image! I'd love to hear more about it.";
    }

    let response = `I see you've shared an image`;

    if (analysis.description && analysis.description !== 'An image') {
      response += ` of ${analysis.description}`;
    }

    if (analysis.objects && analysis.objects.length > 0) {
      response += `. I can see ${analysis.objects.slice(0, 3).join(', ')}`;
    }

    if (analysis.faces && analysis.faces.length > 0) {
      response += `. There ${analysis.faces.length === 1 ? 'is' : 'are'} ${analysis.faces.length} person${analysis.faces.length === 1 ? '' : 's'} in the image`;
    }

    if (analysis.text) {
      response += `. I can also see some text: "${analysis.text.slice(0, 100)}${analysis.text.length > 100 ? '...' : ''}"`;
    }

    response += '! What would you like to tell me about this image?';

    return response;
  }

  private async generateVoiceResponse(input: MultiModalInput, patterns: any): Promise<string> {
    const analysis = input.metadata.processingResults as VoiceAnalysis;

    if (!analysis?.transcription) {
      return "I heard your voice message! Could you tell me what you'd like to share?";
    }

    let response = `I heard you say: "${analysis.transcription}"`;

    if (analysis.confidence < 0.7) {
      response += " (I wasn't completely sure about the transcription)";
    }

    response += '. ';

    // Add contextual response based on transcription
    const transcription = analysis.transcription.toLowerCase();

    if (transcription.includes('hello') || transcription.includes('hi')) {
      response += "Hello! It's great to hear your voice!";
    } else if (transcription.includes('how are you')) {
      response += "I'm doing well, thank you for asking! How are you doing?";
    } else {
      response += "That sounds interesting! Tell me more.";
    }

    return response;
  }

  private async generateLocationResponse(input: MultiModalInput, patterns: any): Promise<string> {
    const location = input.metadata.location;

    if (!location) {
      return "I see you're sharing your location! Where are you?";
    }

    let response = `I see you're at ${location.placeName || `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}`;

    // Add weather context if available
    if (input.metadata.processingResults?.weather) {
      const weather = input.metadata.processingResults.weather;
      response += `. The weather there is ${weather.weather[0].description} with ${Math.round(weather.main.temp)}°C`;
    }

    // Add context based on location history
    if (patterns.commonLocations.includes(location.placeName)) {
      response += `. You seem to visit ${location.placeName} often!`;
    }

    response += '. What are you up to there?';

    return response;
  }

  private async storeResponseContext(
    userId: number,
    characterId: number,
    input: MultiModalInput,
    response: string
  ): Promise<void> {
    // Store response context for future reference
    await pool.query(`
      INSERT INTO multimodal_responses (user_id, character_id, input_type, response, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [userId, characterId, input.type, response]);
  }
}

// Global multi-modal processor instance
export const multiModalProcessor = new MultiModalProcessor();