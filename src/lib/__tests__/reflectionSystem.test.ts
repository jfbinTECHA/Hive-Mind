import { ReflectionSystem } from '../reflectionSystem';

describe('ReflectionSystem', () => {
  let reflectionSystem: ReflectionSystem;

  beforeEach(() => {
    reflectionSystem = new ReflectionSystem();
  });

  describe('shouldReflect', () => {
    it('should return true when no previous reflection exists', () => {
      const result = reflectionSystem.shouldReflect('companion1', 'daily');
      expect(result).toBe(true);
    });

    it('should return false when reflection was done recently', () => {
      // First call should allow reflection
      reflectionSystem.shouldReflect('companion1', 'daily');
      // Second call immediately after should not allow
      const result = reflectionSystem.shouldReflect('companion1', 'daily');
      expect(result).toBe(false);
    });

    it('should return true for different reflection types', () => {
      reflectionSystem.shouldReflect('companion1', 'daily');
      const result = reflectionSystem.shouldReflect('companion1', 'weekly');
      expect(result).toBe(true);
    });
  });

  describe('generateReflection', () => {
    const mockConversations = [
      { user_message: 'Hello, how are you?', ai_response: 'I am doing well, thank you!' },
      { user_message: 'I love programming', ai_response: 'That is great! Programming is fun.' },
    ];

    const mockEmotionalState = {
      mood: 0.8,
      energy: 0.7,
      trust: 0.9,
      curiosity: 0.6,
    };

    it('should generate a daily reflection', async () => {
      const reflection = await reflectionSystem.generateReflection(
        'companion1',
        'daily',
        mockConversations,
        mockEmotionalState
      );

      expect(reflection).toHaveProperty('id');
      expect(reflection.companionId).toBe('companion1');
      expect(reflection.type).toBe('daily');
      expect(reflection.content).toContain('Daily Reflection');
      expect(reflection.insights).toBeDefined();
      expect(reflection.keyThemes).toBeDefined();
      expect(reflection.relationshipProgress).toBeDefined();
    });

    it('should generate a weekly reflection', async () => {
      const reflection = await reflectionSystem.generateReflection(
        'companion1',
        'weekly',
        mockConversations,
        mockEmotionalState
      );

      expect(reflection.type).toBe('weekly');
      expect(reflection.content).toContain('Weekly Reflection');
    });

    it('should generate a dream reflection', async () => {
      const reflection = await reflectionSystem.generateReflection(
        'companion1',
        'dream',
        mockConversations,
        mockEmotionalState
      );

      expect(reflection.type).toBe('dream');
      expect(reflection.content).toContain('Dream State Processing');
    });

    it('should generate an introspection reflection', async () => {
      const reflection = await reflectionSystem.generateReflection(
        'companion1',
        'introspection',
        mockConversations,
        mockEmotionalState
      );

      expect(reflection.type).toBe('introspection');
      expect(reflection.content).toContain('Deep Introspection');
    });
  });

  describe('generateDream', () => {
    const mockMemories = [
      { type: 'personal', content: 'User enjoys music' },
      { type: 'relationship', content: 'User has a close friend' },
    ];

    const mockEmotionalState = {
      mood: 0.5,
      energy: 0.4,
      trust: 0.8,
      curiosity: 0.7,
    };

    it('should generate a dream state', async () => {
      const dream = await reflectionSystem.generateDream(
        'companion1',
        mockMemories,
        mockEmotionalState
      );

      expect(dream).toHaveProperty('id');
      expect(dream.companionId).toBe('companion1');
      expect(dream.dreamContent).toContain('Dream Sequence');
      expect(dream.symbolism).toBeDefined();
      expect(dream.connections).toBeDefined();
    });
  });

  describe('getReflections', () => {
    it('should return empty array (mock implementation)', async () => {
      const reflections = await reflectionSystem.getReflections('companion1');
      expect(reflections).toEqual([]);
    });
  });

  describe('getDreams', () => {
    it('should return empty array (mock implementation)', async () => {
      const dreams = await reflectionSystem.getDreams('companion1');
      expect(dreams).toEqual([]);
    });
  });
});