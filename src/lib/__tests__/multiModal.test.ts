import { MultiModalProcessor, multiModalProcessor } from '../multiModal';
import { Database, pool } from '../database';

// Mock dependencies
jest.mock('../database');
jest.mock('node-fetch', () => jest.fn());

const mockDatabase = Database as jest.Mocked<typeof Database>;
const mockPool = pool as jest.Mocked<typeof pool>;
const mockFetch = require('node-fetch');

describe('MultiModalProcessor', () => {
  let processor: MultiModalProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new MultiModalProcessor();
    // Mock environment variables
    process.env.GOOGLE_VISION_API_KEY = 'test-vision-key';
    process.env.GOOGLE_SPEECH_API_KEY = 'test-speech-key';
    process.env.OPENCAGE_API_KEY = 'test-geocode-key';
    process.env.OPENWEATHER_API_KEY = 'test-weather-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_VISION_API_KEY;
    delete process.env.GOOGLE_SPEECH_API_KEY;
    delete process.env.OPENCAGE_API_KEY;
    delete process.env.OPENWEATHER_API_KEY;
  });

  describe('processImage', () => {
    it('should process image with Google Vision API when key is available', async () => {
      const mockVisionResponse = {
        responses: [
          {
            labelAnnotations: [
              { description: 'cat' },
              { description: 'animal' },
              { description: 'pet' },
            ],
            imagePropertiesAnnotation: {
              dominantColors: {
                colors: [
                  { color: { red: 255, green: 0, blue: 0 } },
                  { color: { red: 0, green: 255, blue: 0 } },
                ],
              },
            },
            textAnnotations: [{ description: 'Hello World' }],
            faceAnnotations: [
              {
                detectionConfidence: 0.9,
                boundingPoly: { vertices: [] },
              },
            ],
            landmarkAnnotations: [{ description: 'Eiffel Tower' }],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockVisionResponse),
      });

      const imageData = 'data:image/jpeg;base64,test-image-data';
      const result = await processor.processImage(imageData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('vision.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test-image-data'),
        })
      );

      expect(result).toEqual({
        description: 'cat',
        objects: ['cat', 'animal', 'pet'],
        colors: ['rgb(255, 0, 0)', 'rgb(0, 255, 0)'],
        sentiment: 'neutral',
        text: 'Hello World',
        landmarks: ['Eiffel Tower'],
        faces: [
          {
            age: expect.any(Number),
            gender: expect.stringMatching(/male|female|unknown/),
            emotion: 'neutral',
            confidence: 0.9,
          },
        ],
        categories: ['cat', 'animal', 'pet'],
      });
    });

    it('should fallback to basic analysis when Vision API fails', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const imageData = 'data:image/jpeg;base64,test-image-data';
      const result = await processor.processImage(imageData);

      expect(result).toEqual({
        description: 'An image shared by the user',
        objects: ['image'],
        colors: ['unknown'],
        sentiment: 'neutral',
        categories: ['image'],
      });
    });

    it('should use basic analysis when Vision API key is not available', async () => {
      delete process.env.GOOGLE_VISION_API_KEY;
      const newProcessor = new MultiModalProcessor();

      const imageData = 'data:image/jpeg;base64,test-image-data';
      const result = await newProcessor.processImage(imageData);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        description: 'An image shared by the user',
        objects: ['image'],
        colors: ['unknown'],
        sentiment: 'neutral',
        categories: ['image'],
      });
    });
  });

  describe('processDocument', () => {
    it('should process document and return metadata', async () => {
      const mockFile = {
        name: 'test-document.pdf',
        size: 1024000, // 1MB
        type: 'application/pdf',
      } as File;

      const result = await processor.processDocument(mockFile, 'alice');

      expect(result).toEqual({
        content: 'Document uploaded: test-document.pdf (1000.0 KB)',
        metadata: {
          fileName: 'test-document.pdf',
          fileSize: 1024000,
          fileType: 'application/pdf',
          uploadedAt: expect.any(String),
        },
      });
    });

    it('should handle document processing errors gracefully', async () => {
      const mockFile = {
        name: 'error-document.pdf',
        size: 500000,
        type: 'application/pdf',
      } as File;

      // Mock a file that causes an error
      const originalFileHandling = processor.processDocument;
      processor.processDocument = jest.fn().mockRejectedValue(new Error('Processing failed'));

      const result = await processor.processDocument(mockFile);

      expect(result).toEqual({
        content: 'Document uploaded: error-document.pdf',
        metadata: {
          fileName: 'error-document.pdf',
          error: 'Processing failed',
        },
      });
    });
  });

  describe('processUrl', () => {
    it('should process URL and return basic metadata', async () => {
      const url = 'https://example.com/article';
      const result = await processor.processUrl(url, 'alice');

      expect(result).toEqual({
        content: 'URL shared: https://example.com/article',
        metadata: {
          url: 'https://example.com/article',
          processedAt: expect.any(String),
          title: 'Web page',
          description: 'Web content',
        },
      });
    });

    it('should handle URL processing errors gracefully', async () => {
      const url = 'https://invalid-url.com';
      const originalUrlHandling = processor.processUrl;
      processor.processUrl = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await processor.processUrl(url);

      expect(result).toEqual({
        content: 'URL shared: https://invalid-url.com',
        metadata: {
          url: 'https://invalid-url.com',
          error: 'Processing failed',
        },
      });
    });
  });

  describe('processVoice', () => {
    it('should process voice with Google Speech API', async () => {
      const mockSpeechResponse = {
        results: [
          {
            alternatives: [
              {
                transcript: 'Hello, how are you today?',
                confidence: 0.95,
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockSpeechResponse),
      });

      const audioData = 'data:audio/webm;base64,test-audio-data';
      const result = await processor.processVoice(audioData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('speech.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(result).toEqual({
        transcription: 'Hello, how are you today?',
        confidence: 0.95,
        language: 'en-US',
        sentiment: 0,
        duration: 0,
        wordCount: 5,
      });
    });

    it('should throw error when Speech API key is not available', async () => {
      delete process.env.GOOGLE_SPEECH_API_KEY;
      const newProcessor = new MultiModalProcessor();

      const audioData = 'data:audio/webm;base64,test-audio-data';

      await expect(newProcessor.processVoice(audioData)).rejects.toThrow('Speech API not configured');
    });

    it('should throw error when speech transcription fails', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({}),
      });

      const audioData = 'data:audio/webm;base64,test-audio-data';

      await expect(processor.processVoice(audioData)).rejects.toThrow('Speech transcription failed');
    });
  });

  describe('processLocation', () => {
    it('should process location with geocoding and weather', async () => {
      const mockGeocodeResponse = {
        results: [
          {
            formatted: 'New York City, NY, USA',
            components: {
              _category: ['place', 'locality'],
            },
          },
        ],
      };

      const mockWeatherResponse = {
        weather: [{ description: 'clear sky' }],
        main: { temp: 22.5 },
      };

      mockFetch
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockGeocodeResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockWeatherResponse),
        });

      const result = await processor.processLocation(40.7128, -74.0060);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        placeName: 'New York City, NY, USA',
        categories: ['place', 'locality'],
        weather: mockWeatherResponse,
      });
    });

    it('should handle geocoding failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Geocoding API error'));

      const result = await processor.processLocation(40.7128, -74.0060);

      expect(result).toEqual({
        placeName: '40.7128, -74.0060',
        categories: [],
      });
    });

    it('should handle empty geocoding results', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ results: [] }),
      });

      const result = await processor.processLocation(40.7128, -74.0060);

      expect(result).toEqual({
        placeName: '40.7128, -74.0060',
        categories: [],
      });
    });
  });

  describe('storeMultiModalInput', () => {
    it('should store multimodal input in database', async () => {
      const mockStoredInput = {
        id: 1,
        user_id: 1,
        character_id: 1,
        input_type: 'image',
        content: 'base64-image-data',
        metadata: JSON.stringify({ timestamp: new Date() }),
        created_at: new Date(),
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockStoredInput] });

      const input = {
        type: 'image' as const,
        content: 'base64-image-data',
        metadata: {
          timestamp: new Date(),
        },
      };

      const result = await processor.storeMultiModalInput(1, 1, input);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO multimodal_inputs'),
        [1, 1, 'image', 'base64-image-data', expect.any(String)]
      );
      expect(result).toEqual(mockStoredInput);
    });
  });

  describe('getMultiModalInputs', () => {
    it('should retrieve multimodal inputs from database', async () => {
      const mockInputs = [
        {
          input_type: 'image',
          content: 'image-data',
          metadata: JSON.stringify({ timestamp: new Date() }),
        },
        {
          input_type: 'voice',
          content: 'audio-data',
          metadata: JSON.stringify({ duration: 5 }),
        },
      ];

      mockDatabase.pool = {
        query: jest.fn().mockResolvedValue({ rows: mockInputs }),
      } as any;

      const result = await processor.getMultiModalInputs(1, 1, 10);

      expect(mockDatabase.pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM multimodal_inputs'),
        [1, 1, 10]
      );

      expect(result).toEqual([
        {
          type: 'image',
          content: 'image-data',
          metadata: { timestamp: new Date() },
        },
        {
          type: 'voice',
          content: 'audio-data',
          metadata: { duration: 5 },
        },
      ]);
    });

    it('should filter by character ID when provided', async () => {
      mockDatabase.pool = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      } as any;

      await processor.getMultiModalInputs(1, 2, 5);

      expect(mockDatabase.pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND character_id = $2'),
        [1, 2, 5]
      );
    });
  });

  describe('generateMultiModalResponse', () => {
    it('should generate image response', async () => {
      const mockInputs = [];
      mockDatabase.pool = {
        query: jest.fn().mockResolvedValue({ rows: mockInputs }),
      } as any;

      const input = {
        type: 'image' as const,
        content: 'image-data',
        metadata: {
          timestamp: new Date(),
          processingResults: {
            imageAnalysis: {
              description: 'A beautiful sunset',
              objects: ['sun', 'sky', 'clouds'],
              faces: [],
              text: '',
            },
          },
        },
      };

      const result = await processor.generateMultiModalResponse(1, 1, input, []);

      expect(result).toContain("I see you've shared an image of A beautiful sunset");
      expect(result).toContain('I can see sun, sky, clouds');
    });

    it('should generate voice response', async () => {
      const mockInputs = [];
      mockDatabase.pool = {
        query: jest.fn().mockResolvedValue({ rows: mockInputs }),
      } as any;

      const input = {
        type: 'voice' as const,
        content: 'audio-data',
        metadata: {
          timestamp: new Date(),
          processingResults: {
            transcription: 'Hello, how are you?',
            confidence: 0.9,
            language: 'en-US',
            sentiment: 0.2,
            duration: 2.5,
            wordCount: 4,
          } as any,
        },
      };

      const result = await processor.generateMultiModalResponse(1, 1, input, []);

      expect(result).toContain('I heard you say: "Hello, how are you?"');
      expect(result).toContain('Hello! It\'s great to hear your voice!');
    });

    it('should generate location response', async () => {
      const mockInputs = [];
      mockDatabase.pool = {
        query: jest.fn().mockResolvedValue({ rows: mockInputs }),
      } as any;

      const input = {
        type: 'location' as const,
        content: '40.7128,-74.0060',
        metadata: {
          timestamp: new Date(),
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            placeName: 'New York City',
          },
          processingResults: {
            weather: {
              weather: [{ description: 'clear sky' }],
              main: { temp: 22 },
            },
          },
        },
      };

      const result = await processor.generateMultiModalResponse(1, 1, input, []);

      expect(result).toContain("I see you're at New York City");
      expect(result).toContain('The weather there is clear sky with 22°C');
    });

    it('should return default response for unknown input type', async () => {
      const mockInputs = [];
      mockDatabase.pool = {
        query: jest.fn().mockResolvedValue({ rows: mockInputs }),
      } as any;

      const input = {
        type: 'unknown' as any,
        content: 'unknown-data',
        metadata: {
          timestamp: new Date(),
        },
      };

      const result = await processor.generateMultiModalResponse(1, 1, input, []);

      expect(result).toBe('I received your message!');
    });
  });

  describe('analyzeMultiModalPatterns', () => {
    it('should analyze patterns in multimodal inputs', () => {
      const inputs = [
        {
          type: 'image' as const,
          content: 'image1',
          metadata: { timestamp: new Date() },
        },
        {
          type: 'voice' as const,
          content: 'voice1',
          metadata: {
            timestamp: new Date(),
            processingResults: { sentiment: 0.3 } as any,
          },
        },
        {
          type: 'location' as const,
          content: 'loc1',
          metadata: {
            timestamp: new Date(),
            location: { placeName: 'New York' },
          },
        },
        {
          type: 'location' as const,
          content: 'loc2',
          metadata: {
            timestamp: new Date(),
            location: { placeName: 'New York' },
          },
        },
      ];

      const patterns = (processor as any).analyzeMultiModalPatterns(inputs);

      expect(patterns).toEqual({
        imageFrequency: 1,
        voiceFrequency: 1,
        locationFrequency: 2,
        commonLocations: ['New York'],
        imageThemes: [],
        voiceSentiment: 0,
      });
    });
  });
});