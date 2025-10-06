import { NextRequest } from 'next/server';
import { POST } from '../chat/route';
import { Database } from '@/lib/database';
import { localAIService } from '@/lib/ollama';
import { MemoryManager } from '@/lib/memory';

// Mock dependencies
jest.mock('@/lib/database');
jest.mock('@/lib/ollama');
jest.mock('@/lib/memory');

const mockDatabase = Database as jest.Mocked<typeof Database>;
const mockLocalAIService = localAIService as jest.Mocked<typeof localAIService>;
const mockMemoryManager = MemoryManager as jest.Mocked<typeof MemoryManager>;

describe('/api/chat', () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Request
    mockRequest = {
      json: jest.fn(),
    };
  });

  describe('POST /api/chat - Single Chat', () => {
    it('should handle a basic chat message', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      const mockCharacter = {
        id: 1,
        name: 'Alice',
        personality: 'friendly',
        avatar_url: '🤖',
        familiarity: 50,
        emotional_state: null,
      };
      const mockAIResponse = 'Hello! How can I help you today?';

      // Setup mocks
      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello Alice',
        aiName: 'Alice',
        context: [],
        userId: '1',
      });

      mockDatabase.getUserById.mockResolvedValue(mockUser);
      mockDatabase.getCharacterByName.mockResolvedValue(mockCharacter);
      mockLocalAIService.generateResponse.mockResolvedValue(mockAIResponse);
      mockDatabase.createMessage.mockResolvedValue({
        id: 1,
        conversation_id: 'conv_123',
      });

      const response = await POST(mockRequest as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({
        response: mockAIResponse,
        character: {
          name: 'Alice',
          avatar: '🤖',
          emotion: 'neutral',
        },
        conversationId: 'conv_123',
      });

      expect(mockLocalAIService.generateResponse).toHaveBeenCalledWith(
        'Hello Alice',
        mockCharacter,
        1,
        [],
        expect.any(Object) // default emotional state
      );

      expect(mockDatabase.createMessage).toHaveBeenCalledWith(
        1,
        1,
        'Hello Alice',
        mockAIResponse,
        'conv_123',
        'neutral'
      );
    });

    it('should create anonymous user when no userId provided', async () => {
      const mockUser = { id: 2, name: 'Anonymous User' };
      const mockCharacter = {
        id: 1,
        name: 'Alice',
        personality: 'friendly',
        avatar_url: '🤖',
        familiarity: 50,
        emotional_state: null,
      };

      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello',
        aiName: 'Alice',
        context: [],
      });

      mockDatabase.createUser.mockResolvedValue(mockUser);
      mockDatabase.getCharacterByName.mockResolvedValue(mockCharacter);
      mockLocalAIService.generateResponse.mockResolvedValue('Hi there!');
      mockDatabase.createMessage.mockResolvedValue({
        id: 1,
        conversation_id: 'conv_456',
      });

      const response = await POST(mockRequest as NextRequest);

      expect(mockDatabase.createUser).toHaveBeenCalledWith('Anonymous User');
      expect(response.status).toBe(200);
    });

    it('should handle character lookup by ID', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      const mockCharacter = {
        id: 2,
        name: 'Bob',
        personality: 'professional',
        avatar_url: '👔',
        familiarity: 75,
        emotional_state: null,
      };

      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello',
        aiName: '2', // Numeric ID as string
        context: [],
        userId: '1',
      });

      mockDatabase.getUserById.mockResolvedValue(mockUser);
      mockDatabase.getCharacterById.mockResolvedValue(mockCharacter);
      mockLocalAIService.generateResponse.mockResolvedValue('Hello! How can I assist you?');
      mockDatabase.createMessage.mockResolvedValue({
        id: 1,
        conversation_id: 'conv_789',
      });

      const response = await POST(mockRequest as NextRequest);

      expect(mockDatabase.getCharacterById).toHaveBeenCalledWith(2);
      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent character', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello',
        aiName: 'NonExistentAI',
        context: [],
        userId: '1',
      });

      mockDatabase.getUserById.mockResolvedValue({ id: 1, name: 'Test User' });
      mockDatabase.getCharacterByName.mockResolvedValue(null);
      mockDatabase.getCharacterById.mockResolvedValue(null);

      const response = await POST(mockRequest as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe('AI character not found');
    });

    it('should return 400 for missing message', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        aiName: 'Alice',
        context: [],
      });

      const response = await POST(mockRequest as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Missing required field: message');
    });

    it('should return 400 for missing aiName in single chat', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello',
        context: [],
      });

      const response = await POST(mockRequest as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Missing required field: aiName (for single chat)');
    });

    it('should include memory context when requested', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      const mockCharacter = {
        id: 1,
        name: 'Alice',
        personality: 'friendly',
        avatar_url: '🤖',
        familiarity: 50,
        emotional_state: null,
      };
      const mockMemories = ['User likes pizza', 'User enjoys hiking'];

      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'What should I eat?',
        aiName: 'Alice',
        context: [],
        userId: '1',
      });

      mockDatabase.getUserById.mockResolvedValue(mockUser);
      mockDatabase.getCharacterByName.mockResolvedValue(mockCharacter);
      mockMemoryManager.getChatContext.mockResolvedValue(mockMemories);
      mockLocalAIService.generateResponse.mockResolvedValue('Based on your preferences, pizza sounds great!');
      mockDatabase.createMessage.mockResolvedValue({
        id: 1,
        conversation_id: 'conv_123',
      });

      const response = await POST(mockRequest as NextRequest);

      expect(mockMemoryManager.getChatContext).toHaveBeenCalledWith(
        'What should I eat?',
        1,
        1,
        false, // includeCrossAI
        5
      );

      expect(mockLocalAIService.generateResponse).toHaveBeenCalledWith(
        'What should I eat?',
        mockCharacter,
        1,
        expect.arrayContaining([
          expect.objectContaining({ content: 'User likes pizza' }),
          expect.objectContaining({ content: 'User enjoys hiking' }),
        ]),
        expect.any(Object)
      );
    });

    it('should update character familiarity', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      const mockCharacter = {
        id: 1,
        name: 'Alice',
        personality: 'friendly',
        avatar_url: '🤖',
        familiarity: 50,
        emotional_state: null,
      };

      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello',
        aiName: 'Alice',
        context: [],
        userId: '1',
      });

      mockDatabase.getUserById.mockResolvedValue(mockUser);
      mockDatabase.getCharacterByName.mockResolvedValue(mockCharacter);
      mockLocalAIService.generateResponse.mockResolvedValue('Hi there!');
      mockDatabase.createMessage.mockResolvedValue({
        id: 1,
        conversation_id: 'conv_123',
      });
      mockDatabase.updateCharacterFamiliarity.mockResolvedValue({
        ...mockCharacter,
        familiarity: 51,
      });

      await POST(mockRequest as NextRequest);

      expect(mockDatabase.updateCharacterFamiliarity).toHaveBeenCalledWith(1, 51);
    });

    it('should process conversation for memory extraction', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      const mockCharacter = {
        id: 1,
        name: 'Alice',
        personality: 'friendly',
        avatar_url: '🤖',
        familiarity: 50,
        emotional_state: null,
      };

      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'I love pizza',
        aiName: 'Alice',
        context: [],
        userId: '1',
      });

      mockDatabase.getUserById.mockResolvedValue(mockUser);
      mockDatabase.getCharacterByName.mockResolvedValue(mockCharacter);
      mockLocalAIService.generateResponse.mockResolvedValue('Pizza is delicious!');
      mockDatabase.createMessage.mockResolvedValue({
        id: 1,
        conversation_id: 'conv_123',
      });

      await POST(mockRequest as NextRequest);

      expect(mockMemoryManager.processConversation).toHaveBeenCalledWith(
        'I love pizza',
        'Pizza is delicious!',
        1,
        1
      );
    });
  });

  describe('POST /api/chat - Group Chat', () => {
    it('should handle group chat with multiple participants', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      const mockCharacters = [
        { id: 1, name: 'Alice', personality: 'friendly' },
        { id: 2, name: 'Bob', personality: 'professional' },
      ];

      const mockGroupResponses = [
        {
          type: 'ai' as const,
          sender: 'Alice',
          senderId: 1,
          content: 'Hello everyone!',
        },
        {
          type: 'ai' as const,
          sender: 'Bob',
          senderId: 2,
          content: 'Good to see you all.',
        },
      ];

      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello everyone!',
        groupChat: true,
        participantIds: [1, 2],
        userId: '1',
        context: [],
      });

      mockDatabase.getUserById.mockResolvedValue(mockUser);
      mockDatabase.createUser.mockResolvedValue(mockUser);

      // Mock the group chat manager
      const mockGroupChatManager = {
        initializeGroupChat: jest.fn().mockResolvedValue({ id: 'group_123' }),
        processGroupChatTurn: jest.fn().mockResolvedValue(mockGroupResponses),
      };

      jest.doMock('@/lib/groupChat', () => ({
        GroupChatManager: mockGroupChatManager,
      }));

      // Re-import to use the mocked version
      const { POST: mockedPOST } = await import('../chat/route');

      const response = await mockedPOST(mockRequest as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({
        responses: [
          {
            response: 'Hello everyone!',
            character: {
              name: 'Alice',
              id: 1,
              emotion: 'neutral',
            },
          },
          {
            response: 'Good to see you all.',
            character: {
              name: 'Bob',
              id: 2,
              emotion: 'neutral',
            },
          },
        ],
        conversationId: 'group_123',
        groupChat: true,
      });
    });

    it('should return 400 for group chat without participant IDs', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello everyone!',
        groupChat: true,
        userId: '1',
        context: [],
      });

      const response = await POST(mockRequest as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Missing required field: aiName (for single chat)');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello',
        aiName: 'Alice',
        context: [],
        userId: '1',
      });

      mockDatabase.getUserById.mockRejectedValue(new Error('Database connection failed'));

      const response = await POST(mockRequest as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Internal server error');
    });

    it('should handle AI service errors gracefully', async () => {
      const mockUser = { id: 1, name: 'Test User' };
      const mockCharacter = {
        id: 1,
        name: 'Alice',
        personality: 'friendly',
        avatar_url: '🤖',
        familiarity: 50,
        emotional_state: null,
      };

      (mockRequest.json as jest.Mock).mockResolvedValue({
        message: 'Hello',
        aiName: 'Alice',
        context: [],
        userId: '1',
      });

      mockDatabase.getUserById.mockResolvedValue(mockUser);
      mockDatabase.getCharacterByName.mockResolvedValue(mockCharacter);
      mockLocalAIService.generateResponse.mockRejectedValue(new Error('AI service unavailable'));

      const response = await POST(mockRequest as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Internal server error');
    });
  });
});