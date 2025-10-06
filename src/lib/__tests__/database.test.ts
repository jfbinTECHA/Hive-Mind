import { Database, Cache, pool, redis } from '../database';

// Mock the database connections
jest.mock('pg', () => {
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

jest.mock('redis', () => {
  const mockRedis = {
    connect: jest.fn(),
    on: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  };
  return { createClient: jest.fn(() => mockRedis) };
});

const mockPool = pool as jest.Mocked<typeof pool>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('Database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User operations', () => {
    it('should create a user', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date(),
      };
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await Database.createUser('Test User', 'test@example.com');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['Test User', 'test@example.com', undefined, undefined]
      );
      expect(result).toEqual(mockUser);
    });

    it('should get user by ID', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await Database.getUserById(1);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(result).toEqual(mockUser);
    });

    it('should get user by email', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await Database.getUserByEmail('test@example.com');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1', ['test@example.com']);
      expect(result).toEqual(mockUser);
    });
  });

  describe('Character operations', () => {
    it('should create a character', async () => {
      const mockCharacter = {
        id: 1,
        name: 'Alice',
        personality: 'friendly',
        traits: ['warm', 'empathetic'],
        created_at: new Date(),
      };
      mockPool.query.mockResolvedValue({ rows: [mockCharacter] });

      const result = await Database.createCharacter(
        'Alice',
        'A friendly AI companion',
        '🤖',
        ['warm', 'empathetic'],
        'friendly'
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO characters'),
        ['Alice', 'A friendly AI companion', '🤖', ['warm', 'empathetic'], 'friendly']
      );
      expect(result).toEqual(mockCharacter);
    });

    it('should get all characters', async () => {
      const mockCharacters = [
        { id: 1, name: 'Alice', personality: 'friendly' },
        { id: 2, name: 'Bob', personality: 'professional' },
      ];
      mockPool.query.mockResolvedValue({ rows: mockCharacters });

      const result = await Database.getAllCharacters();

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM characters ORDER BY created_at DESC', []);
      expect(result).toEqual(mockCharacters);
    });

    it('should get character by ID', async () => {
      const mockCharacter = { id: 1, name: 'Alice', personality: 'friendly' };
      mockPool.query.mockResolvedValue({ rows: [mockCharacter] });

      const result = await Database.getCharacterById(1);

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM characters WHERE id = $1', [1]);
      expect(result).toEqual(mockCharacter);
    });

    it('should get character by name', async () => {
      const mockCharacter = { id: 1, name: 'Alice', personality: 'friendly' };
      mockPool.query.mockResolvedValue({ rows: [mockCharacter] });

      const result = await Database.getCharacterByName('Alice');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM characters WHERE name = $1', ['Alice']);
      expect(result).toEqual(mockCharacter);
    });

    it('should update character familiarity', async () => {
      const mockCharacter = { id: 1, name: 'Alice', familiarity: 85 };
      mockPool.query.mockResolvedValue({ rows: [mockCharacter] });

      const result = await Database.updateCharacterFamiliarity(1, 85);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE characters SET familiarity'),
        [85, 1]
      );
      expect(result).toEqual(mockCharacter);
    });

    it('should update character emotional state', async () => {
      const emotionalState = { happiness: 0.8, energy: 0.7 };
      const mockCharacter = { id: 1, emotional_state: emotionalState };
      mockPool.query.mockResolvedValue({ rows: [mockCharacter] });

      const result = await Database.updateCharacterEmotionalState(1, emotionalState);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE characters SET emotional_state'),
        [JSON.stringify(emotionalState), 1]
      );
      expect(result).toEqual(mockCharacter);
    });

    it('should get character emotional state', async () => {
      const emotionalState = { happiness: 0.8, energy: 0.7 };
      const mockCharacter = { id: 1, emotional_state: emotionalState };

      const getCharacterSpy = jest.spyOn(Database, 'getCharacterById');
      getCharacterSpy.mockResolvedValue(mockCharacter);

      const result = await Database.getCharacterEmotionalState(1);

      expect(getCharacterSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(emotionalState);
    });
  });

  describe('Memory operations', () => {
    it('should create a memory', async () => {
      const mockMemory = {
        id: 1,
        user_id: 1,
        ai_id: 1,
        fact_text: 'User likes pizza',
        fact_type: 'preference',
        created_at: new Date(),
      };
      const embedding = [0.1, 0.2, 0.3];
      mockPool.query.mockResolvedValue({ rows: [mockMemory] });

      const result = await Database.createMemory(1, 1, 'User likes pizza', 'preference', embedding);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO memory'),
        [1, 1, 'User likes pizza', 'preference', embedding]
      );
      expect(result).toEqual(mockMemory);
    });

    it('should get memories by AI', async () => {
      const mockMemories = [
        { id: 1, fact_text: 'Memory 1', ai_id: 1 },
        { id: 2, fact_text: 'Memory 2', ai_id: 1 },
      ];
      mockPool.query.mockResolvedValue({ rows: mockMemories });

      const result = await Database.getMemoriesByAI(1, 50);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM memory WHERE ai_id = $1 ORDER BY last_used DESC LIMIT $2',
        [1, 50]
      );
      expect(result).toEqual(mockMemories);
    });

    it('should get memories by user and AI', async () => {
      const mockMemories = [
        { id: 1, fact_text: 'Memory 1', user_id: 1, ai_id: 1 },
      ];
      mockPool.query.mockResolvedValue({ rows: mockMemories });

      const result = await Database.getMemoriesByUserAndAI(1, 1, 50);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND ai_id = $2'),
        [1, 1, 50]
      );
      expect(result).toEqual(mockMemories);
    });

    it('should update memory last used timestamp', async () => {
      mockPool.query.mockResolvedValue({});

      await Database.updateMemoryLastUsed(1);

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE memory SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
        [1]
      );
    });

    it('should delete memory', async () => {
      mockPool.query.mockResolvedValue({});

      await Database.deleteMemory(1);

      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM memory WHERE id = $1', [1]);
    });

    it('should update memory content', async () => {
      mockPool.query.mockResolvedValue({});

      await Database.updateMemory(1, {
        content: 'Updated memory content',
        type: 'experience',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE memory SET'),
        ['Updated memory content', 'experience', 1]
      );
    });
  });

  describe('Vector similarity search', () => {
    it('should find similar memories', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3];
      const mockMemories = [
        { id: 1, fact_text: 'Similar memory', similarity: 0.9 },
      ];
      mockPool.query.mockResolvedValue({ rows: mockMemories });

      const result = await Database.findSimilarMemories(1, 1, queryEmbedding, 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('vector_embedding <=>'),
        [1, 1, '[0.1,0.2,0.3]', 5]
      );
      expect(result).toEqual(mockMemories);
    });

    it('should find similar memories across AIs', async () => {
      const queryEmbedding = [0.1, 0.2, 0.3];
      const mockMemories = [
        { id: 1, fact_text: 'Similar memory', ai_name: 'Alice', similarity: 0.9 },
      ];
      mockPool.query.mockResolvedValue({ rows: mockMemories });

      const result = await Database.findSimilarMemoriesAcrossAIs(1, queryEmbedding, 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN characters'),
        [1, '[0.1,0.2,0.3]', 5]
      );
      expect(result).toEqual(mockMemories);
    });
  });

  describe('Message operations', () => {
    it('should create a message', async () => {
      const mockMessage = {
        id: 1,
        user_id: 1,
        ai_id: 1,
        user_message: 'Hello',
        ai_response: 'Hi there!',
        conversation_id: 'conv_123',
        emotion: 'happy',
        timestamp: new Date(),
      };
      mockPool.query.mockResolvedValue({ rows: [mockMessage] });

      const result = await Database.createMessage(1, 1, 'Hello', 'Hi there!', 'conv_123', 'happy');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        [1, 1, 'Hello', 'Hi there!', 'conv_123', 'happy']
      );
      expect(result).toEqual(mockMessage);
    });

    it('should get conversation history', async () => {
      const mockMessages = [
        { id: 1, user_message: 'Hello', ai_response: 'Hi!', timestamp: new Date() },
        { id: 2, user_message: 'How are you?', ai_response: 'Good!', timestamp: new Date() },
      ];
      mockPool.query.mockResolvedValue({ rows: mockMessages.reverse() }); // Mock returns in reverse order

      const result = await Database.getConversationHistory(1, 1, 20);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp DESC'),
        [1, 1, 20]
      );
      expect(result).toEqual(mockMessages); // Should be reversed back to chronological order
    });
  });

  describe('Session operations', () => {
    it('should create a session', async () => {
      const mockSession = {
        id: 1,
        user_id: 1,
        session_token: 'token123',
        expires_at: new Date(),
      };
      mockPool.query.mockResolvedValue({ rows: [mockSession] });

      const expiresAt = new Date();
      const result = await Database.createSession(1, 'token123', expiresAt);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        [1, 'token123', expiresAt]
      );
      expect(result).toEqual(mockSession);
    });

    it('should get session by token', async () => {
      const mockSession = { id: 1, session_token: 'token123', expires_at: new Date() };
      mockPool.query.mockResolvedValue({ rows: [mockSession] });

      const result = await Database.getSessionByToken('token123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE session_token = $1 AND expires_at > CURRENT_TIMESTAMP'),
        ['token123']
      );
      expect(result).toEqual(mockSession);
    });

    it('should delete session', async () => {
      mockPool.query.mockResolvedValue({});

      await Database.deleteSession('token123');

      expect(mockPool.query).toHaveBeenCalledWith('DELETE FROM sessions WHERE session_token = $1', ['token123']);
    });
  });
});

describe('Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('set operations', () => {
    it('should set value without TTL', async () => {
      const testValue = { key: 'value' };
      mockRedis.set.mockResolvedValue('OK');

      await Cache.set('testKey', testValue);

      expect(mockRedis.set).toHaveBeenCalledWith('testKey', JSON.stringify(testValue));
    });

    it('should set value with TTL', async () => {
      const testValue = { key: 'value' };
      mockRedis.setEx.mockResolvedValue('OK');

      await Cache.set('testKey', testValue, 300);

      expect(mockRedis.setEx).toHaveBeenCalledWith('testKey', 300, JSON.stringify(testValue));
    });
  });

  describe('get operations', () => {
    it('should get and parse value', async () => {
      const testValue = { key: 'value' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testValue));

      const result = await Cache.get('testKey');

      expect(mockRedis.get).toHaveBeenCalledWith('testKey');
      expect(result).toEqual(testValue);
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await Cache.get('nonExistentKey');

      expect(result).toBeNull();
    });
  });

  describe('delete operations', () => {
    it('should delete key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await Cache.del('testKey');

      expect(mockRedis.del).toHaveBeenCalledWith('testKey');
    });
  });

  describe('exists operations', () => {
    it('should check if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await Cache.exists('testKey');

      expect(mockRedis.exists).toHaveBeenCalledWith('testKey');
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await Cache.exists('nonExistentKey');

      expect(result).toBe(false);
    });
  });
});