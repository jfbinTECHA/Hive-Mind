import { MemoryExtractor, MemoryEmbedder, MemoryManager } from '../memory';
import { localAIService } from '../ollama';
import { Database } from '../database';

// Mock dependencies
jest.mock('../ollama');
jest.mock('../database');

const mockLocalAIService = localAIService as jest.Mocked<typeof localAIService>;
const mockDatabase = Database as jest.Mocked<typeof Database>;

describe('MemoryExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractFromMessage', () => {
    it('should extract name information', () => {
      const message = "My name is John Doe";
      const memories = MemoryExtractor['extractFromMessage'](message, 'user');

      expect(memories).toHaveLength(1);
      expect(memories[0]).toMatchObject({
        fact: "User's name is John Doe",
        type: 'personal',
        confidence: 0.95,
      });
    });

    it('should extract location information', () => {
      const message = "I live in New York City";
      const memories = MemoryExtractor['extractFromMessage'](message, 'user');

      expect(memories).toHaveLength(1);
      expect(memories[0]).toMatchObject({
        fact: "User lives in New York City",
        type: 'personal',
        confidence: 0.9,
      });
    });

    it('should extract preferences and interests', () => {
      const message = "I love playing guitar and hiking";
      const memories = MemoryExtractor['extractFromMessage'](message, 'user');

      expect(memories).toHaveLength(1);
      expect(memories[0]).toMatchObject({
        fact: "User likes playing guitar and hiking",
        type: 'preference',
        confidence: 0.85,
      });
    });

    it('should extract dislikes', () => {
      const message = "I hate spicy food";
      const memories = MemoryExtractor['extractFromMessage'](message, 'user');

      expect(memories).toHaveLength(1);
      expect(memories[0]).toMatchObject({
        fact: "User dislikes spicy food",
        type: 'preference',
        confidence: 0.85,
      });
    });

    it('should extract work/occupation information', () => {
      const message = "I work as a software engineer";
      const memories = MemoryExtractor['extractFromMessage'](message, 'user');

      expect(memories).toHaveLength(1);
      expect(memories[0]).toMatchObject({
        fact: "User's occupation: software engineer",
        type: 'personal',
        confidence: 0.9,
      });
    });

    it('should extract family relationships', () => {
      const message = "My brother is a doctor";
      const memories = MemoryExtractor['extractFromMessage'](message, 'user');

      expect(memories).toHaveLength(1);
      expect(memories[0]).toMatchObject({
        fact: "User's family: brother is a doctor",
        type: 'relationship',
        confidence: 0.8,
      });
    });

    it('should extract goals and aspirations', () => {
      const message = "My goal is to learn Spanish";
      const memories = MemoryExtractor['extractFromMessage'](message, 'user');

      expect(memories).toHaveLength(1);
      expect(memories[0]).toMatchObject({
        fact: "User's goal/aspiration: learn Spanish",
        type: 'personal',
        confidence: 0.75,
      });
    });

    it('should extract multiple memory types from one message', () => {
      const message = "My name is Alice and I work as a teacher. I love reading books.";
      const memories = MemoryExtractor['extractFromMessage'](message, 'user');

      expect(memories.length).toBeGreaterThan(1);
      const nameMemory = memories.find(m => m.fact.includes("name is"));
      const workMemory = memories.find(m => m.fact.includes("occupation"));
      const preferenceMemory = memories.find(m => m.fact.includes("likes"));

      expect(nameMemory).toBeDefined();
      expect(workMemory).toBeDefined();
      expect(preferenceMemory).toBeDefined();
    });

    it('should return empty array for messages with no extractable information', () => {
      const message = "Hello, how are you today?";
      const memories = MemoryExtractor['extractFromMessage'](message, 'user');

      expect(memories).toHaveLength(0);
    });
  });

  describe('extractTopics', () => {
    it('should identify work-related topics', () => {
      const text = "I have a job interview tomorrow at the office";
      const topics = MemoryExtractor['extractTopics'](text);

      expect(topics).toContain('work');
    });

    it('should identify family-related topics', () => {
      const text = "My mother and father are coming to visit";
      const topics = MemoryExtractor['extractTopics'](text);

      expect(topics).toContain('family');
    });

    it('should identify hobby-related topics', () => {
      const text = "I enjoy playing music and reading books";
      const topics = MemoryExtractor['extractTopics'](text);

      expect(topics).toContain('hobbies');
    });

    it('should remove duplicate topics', () => {
      const text = "I work at the office and my job is great";
      const topics = MemoryExtractor['extractTopics'](text);

      const workCount = topics.filter(t => t === 'work').length;
      expect(workCount).toBe(1);
    });
  });

  describe('extractFromConversation', () => {
    it('should extract memories from both user and AI messages', async () => {
      const userMessage = "My name is Bob";
      const aiResponse = "Nice to meet you Bob!";

      const memories = await MemoryExtractor.extractFromConversation(
        userMessage,
        aiResponse,
        1,
        1
      );

      expect(memories.length).toBeGreaterThan(0);
      const nameMemory = memories.find(m => m.fact.includes("name is"));
      expect(nameMemory).toBeDefined();
    });

    it('should generate conversation summary for substantial conversations', async () => {
      const userMessage = "I really enjoy programming and building software applications.";
      const aiResponse = "That's great! Programming is a valuable skill in today's world.";

      const memories = await MemoryExtractor.extractFromConversation(
        userMessage,
        aiResponse,
        1,
        1
      );

      const summaryMemory = memories.find(m => m.fact.includes("Conversation about"));
      expect(summaryMemory).toBeDefined();
      expect(summaryMemory?.type).toBe('experience');
    });

    it('should not generate summary for short conversations', async () => {
      const userMessage = "Hi";
      const aiResponse = "Hello!";

      const memories = await MemoryExtractor.extractFromConversation(
        userMessage,
        aiResponse,
        1,
        1
      );

      const summaryMemory = memories.find(m => m.fact.includes("Conversation about"));
      expect(summaryMemory).toBeUndefined();
    });
  });
});

describe('MemoryEmbedder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('embedAndStoreMemories', () => {
    it('should generate embeddings and store memories', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockLocalAIService.generateEmbeddings.mockResolvedValue(mockEmbedding);
      mockDatabase.createMemory.mockResolvedValue({ id: 1 });

      const memories = [
        {
          fact: 'User likes pizza',
          type: 'preference' as const,
          confidence: 0.8,
        },
      ];

      await MemoryEmbedder.embedAndStoreMemories(memories, 1, 1);

      expect(mockLocalAIService.generateEmbeddings).toHaveBeenCalledWith('User likes pizza');
      expect(mockDatabase.createMemory).toHaveBeenCalledWith(1, 1, 'User likes pizza', 'preference', mockEmbedding);
    });

    it('should handle embedding generation failures gracefully', async () => {
      mockLocalAIService.generateEmbeddings.mockRejectedValue(new Error('Embedding failed'));

      const memories = [
        {
          fact: 'User likes pizza',
          type: 'preference' as const,
          confidence: 0.8,
        },
      ];

      // Should not throw
      await expect(MemoryEmbedder.embedAndStoreMemories(memories, 1, 1)).resolves.not.toThrow();

      expect(mockDatabase.createMemory).not.toHaveBeenCalled();
    });

    it('should skip memories when embedding is empty', async () => {
      mockLocalAIService.generateEmbeddings.mockResolvedValue([]);

      const memories = [
        {
          fact: 'User likes pizza',
          type: 'preference' as const,
          confidence: 0.8,
        },
      ];

      await MemoryEmbedder.embedAndStoreMemories(memories, 1, 1);

      expect(mockDatabase.createMemory).not.toHaveBeenCalled();
    });
  });

  describe('retrieveRelevantMemories', () => {
    it('should retrieve memories with embeddings', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockMemories = [{ id: 1, fact_text: 'User likes pizza' }];

      mockLocalAIService.generateEmbeddings.mockResolvedValue(mockEmbedding);
      mockDatabase.findSimilarMemories.mockResolvedValue(mockMemories);

      const result = await MemoryEmbedder.retrieveRelevantMemories('pizza preferences', 1, 1, 5);

      expect(mockLocalAIService.generateEmbeddings).toHaveBeenCalledWith('pizza preferences');
      expect(mockDatabase.findSimilarMemories).toHaveBeenCalledWith(1, 1, mockEmbedding, 5);
      expect(result).toEqual(mockMemories);
    });

    it('should return empty array when embedding generation fails', async () => {
      mockLocalAIService.generateEmbeddings.mockRejectedValue(new Error('Embedding failed'));

      const result = await MemoryEmbedder.retrieveRelevantMemories('pizza preferences', 1, 1, 5);

      expect(result).toEqual([]);
    });

    it('should return empty array when embedding is empty', async () => {
      mockLocalAIService.generateEmbeddings.mockResolvedValue([]);

      const result = await MemoryEmbedder.retrieveRelevantMemories('pizza preferences', 1, 1, 5);

      expect(result).toEqual([]);
    });
  });

  describe('retrieveCrossAIMemories', () => {
    it('should retrieve memories across all AIs', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockMemories = [{ id: 1, fact_text: 'User likes pizza', ai_name: 'Alice' }];

      mockLocalAIService.generateEmbeddings.mockResolvedValue(mockEmbedding);
      mockDatabase.findSimilarMemoriesAcrossAIs.mockResolvedValue(mockMemories);

      const result = await MemoryEmbedder.retrieveCrossAIMemories('pizza preferences', 1, 5);

      expect(mockLocalAIService.generateEmbeddings).toHaveBeenCalledWith('pizza preferences');
      expect(mockDatabase.findSimilarMemoriesAcrossAIs).toHaveBeenCalledWith(1, mockEmbedding, 5);
      expect(result).toEqual(mockMemories);
    });
  });
});

describe('MemoryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processConversation', () => {
    it('should extract and store memories from conversation', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];

      mockLocalAIService.generateEmbeddings.mockResolvedValue(mockEmbedding);
      mockDatabase.createMemory.mockResolvedValue({ id: 1 });

      const userMessage = "My name is Charlie";
      const aiResponse = "Nice to meet you Charlie!";

      await MemoryManager.processConversation(userMessage, aiResponse, 1, 1);

      expect(mockLocalAIService.generateEmbeddings).toHaveBeenCalled();
      expect(mockDatabase.createMemory).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockLocalAIService.generateEmbeddings.mockRejectedValue(new Error('Embedding failed'));

      const userMessage = "My name is Charlie";
      const aiResponse = "Nice to meet you Charlie!";

      // Should not throw
      await expect(MemoryManager.processConversation(userMessage, aiResponse, 1, 1)).resolves.not.toThrow();
    });
  });

  describe('getChatContext', () => {
    it('should retrieve and format relevant memories for chat context', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockMemories = [
        {
          id: 1,
          fact_text: 'User likes pizza',
          similarity: 0.9,
          ai_name: 'Alice',
        },
        {
          id: 2,
          fact_text: 'User dislikes spicy food',
          similarity: 0.6, // Below threshold
          ai_name: 'Bob',
        },
      ];

      mockLocalAIService.generateEmbeddings.mockResolvedValue(mockEmbedding);
      mockDatabase.findSimilarMemories.mockResolvedValue(mockMemories);

      const context = await MemoryManager.getChatContext('food preferences', 1, 1, false, 5);

      expect(context).toHaveLength(1);
      expect(context[0]).toContain('Relevant memory (Alice): User likes pizza');
    });

    it('should include cross-AI memories when requested', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockAIMemories = [
        {
          id: 1,
          fact_text: 'User likes pizza',
          similarity: 0.9,
          ai_name: 'Alice',
        },
      ];
      const mockCrossAIMemories = [
        {
          id: 2,
          fact_text: 'User enjoys Italian food',
          similarity: 0.85,
          ai_name: 'Bob',
        },
      ];

      mockLocalAIService.generateEmbeddings.mockResolvedValue(mockEmbedding);
      mockDatabase.findSimilarMemories.mockResolvedValue(mockAIMemories);
      mockDatabase.findSimilarMemoriesAcrossAIs.mockResolvedValue(mockCrossAIMemories);

      const context = await MemoryManager.getChatContext('Italian food', 1, 1, true, 5);

      expect(context.length).toBeGreaterThan(1);
      expect(context.some(c => c.includes('Alice'))).toBe(true);
      expect(context.some(c => c.includes('Bob'))).toBe(true);
    });

    it('should sort memories by similarity and limit results', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockMemories = [
        { id: 1, fact_text: 'Memory 1', similarity: 0.7, ai_name: 'Alice' },
        { id: 2, fact_text: 'Memory 2', similarity: 0.9, ai_name: 'Alice' },
        { id: 3, fact_text: 'Memory 3', similarity: 0.8, ai_name: 'Alice' },
      ];

      mockLocalAIService.generateEmbeddings.mockResolvedValue(mockEmbedding);
      mockDatabase.findSimilarMemories.mockResolvedValue(mockMemories);

      const context = await MemoryManager.getChatContext('test query', 1, 1, false, 2);

      expect(context).toHaveLength(2);
      // Should be sorted by similarity (highest first)
      expect(context[0]).toContain('Memory 2');
      expect(context[1]).toContain('Memory 3');
    });

    it('should filter out low similarity memories', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockMemories = [
        { id: 1, fact_text: 'High similarity memory', similarity: 0.8, ai_name: 'Alice' },
        { id: 2, fact_text: 'Low similarity memory', similarity: 0.6, ai_name: 'Alice' },
      ];

      mockLocalAIService.generateEmbeddings.mockResolvedValue(mockEmbedding);
      mockDatabase.findSimilarMemories.mockResolvedValue(mockMemories);

      const context = await MemoryManager.getChatContext('test query', 1, 1, false, 5);

      expect(context).toHaveLength(1);
      expect(context[0]).toContain('High similarity memory');
    });

    it('should handle errors gracefully', async () => {
      mockLocalAIService.generateEmbeddings.mockRejectedValue(new Error('Embedding failed'));

      const context = await MemoryManager.getChatContext('test query', 1, 1, false, 5);

      expect(context).toEqual([]);
    });
  });
});