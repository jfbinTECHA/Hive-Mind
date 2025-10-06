import { NextRequest, NextResponse } from 'next/server';
import { Database, Cache } from '@/lib/database';
import { localAIService } from '@/lib/ollama';
import { MemoryManager } from '@/lib/memory';
import { EmotionalStateManager, EmotionalMemory } from '@/lib/emotion';
import { GroupChatManager } from '@/lib/groupChat';
import { chatRequestSchema, validateRequest } from '@/lib/validation';
import { checkRateLimit, chatRateLimiter } from '@/lib/rateLimit';
import { moderateContent } from '@/lib/contentModeration';
import { logger, PerformanceMonitor } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info('Chat request received', { sessionId });

    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, chatRateLimiter);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', { sessionId, headers: rateLimitResult.headers });
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: rateLimitResult.headers,
        }
      );
    }

    const body = await request.json();
    const validation = validateRequest(chatRequestSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { message, context, aiName, userId, groupChat, participantIds } = validation.data;

    // Check content moderation
    const moderation = await moderateContent(message, 'chat');
    if (!moderation.allowed) {
      return NextResponse.json({
        error: 'Content violates community guidelines',
        violations: moderation.result.violations,
        recommendations: moderation.result.recommendations,
      }, { status: 400 });
    }

    // Handle group chat
    if (groupChat && participantIds && participantIds.length > 1) {
      return await handleGroupChat(message, participantIds, userId ? String(userId) : undefined, context);
    }

    // Get or create user
    let user = userId ? await Database.getUserById(parseInt(String(userId))) : null;
    if (!user) {
      user = await Database.createUser('Anonymous User');
    }

    // Find the AI character
    const aiNameStr = aiName as string; // Validation ensures it's present for single chat
    let character = await Database.getCharacterByName(aiNameStr);
    if (!character && !isNaN(parseInt(aiNameStr))) {
      character = await Database.getCharacterById(parseInt(aiNameStr));
    }

    if (!character) {
      return NextResponse.json({ error: 'AI character not found' }, { status: 404 });
    }

    // Load or initialize emotional state
    const emotionalState = character.emotional_state
      ? JSON.parse(JSON.stringify(character.emotional_state))
      : EmotionalStateManager.createDefaultState();

    // Check cache for similar conversations
    const cacheKey = `chat:${character.id}:${user.id}:${message.slice(0, 50)}`;
    const cachedResponse = await Cache.get(cacheKey);

    let response: string;
    if (cachedResponse) {
      response = cachedResponse;
    } else {
      // Get relevant memories for context
      const relevantMemories = await MemoryManager.getChatContext(
        message,
        user.id,
        character.id,
        true, // Include cross-AI memories
        5 // Top 5 memories
      );

      // Combine conversation context with memory context
      const fullContext = [
        ...context,
        ...relevantMemories.map(mem => ({ content: mem, type: 'memory' })),
      ];

      // Generate AI response using local Ollama model with memory context and emotional state
      response = await localAIService.generateResponse(
        message,
        character,
        user.id,
        fullContext,
        emotionalState
      );

      // Cache the response for 5 minutes
      await Cache.set(cacheKey, response, 300);
    }

    // Store conversation in database
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await Database.createMessage(
      user.id,
      character.id,
      message,
      response,
      conversationId,
      getEmotionFromResponse(response)
    );

    // Update character familiarity
    const newFamiliarity = Math.min(100, character.familiarity + 1);
    await Database.updateCharacterFamiliarity(character.id, newFamiliarity);

    // Update emotional state based on the conversation
    const updatedEmotionalState = EmotionalStateManager.updateEmotionalState(
      emotionalState,
      message,
      response
    );

    // Store updated emotional state
    await Database.updateCharacterEmotionalState(character.id, updatedEmotionalState);

    // Process conversation for memory extraction and embedding
    await MemoryManager.processConversation(message, response, user.id, character.id);

    // Store emotional context as memory
    const emotionalMemory = EmotionalMemory.createEmotionalMemory(
      user.id,
      character.id,
      message,
      response,
      updatedEmotionalState
    );
    await Database.createMemory(
      emotionalMemory.userId,
      emotionalMemory.aiId,
      emotionalMemory.factText,
      emotionalMemory.factType,
      undefined // No embedding for emotional memories
    );

    const processingTime = Date.now() - startTime;
    logger.info('Chat response sent', {
      sessionId,
      userId: user.id,
      characterId: character.id,
      processingTime,
      messageLength: message.length,
      responseLength: response.length,
    });

    return NextResponse.json({
      response,
      character: {
        name: character.name,
        avatar: character.avatar_url,
        emotion: getEmotionFromResponse(response),
      },
      conversationId,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Chat API error', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleGroupChat(
  message: string,
  participantIds: number[],
  userId: string | undefined,
  context: any
) {
  try {
    // Get or create user
    let user = userId ? await Database.getUserById(parseInt(userId)) : null;
    if (!user) {
      user = await Database.createUser('Anonymous User');
    }

    // Initialize group chat session
    const groupSession = await GroupChatManager.initializeGroupChat(participantIds);

    // Process the group chat turn
    const newMessages = await GroupChatManager.processGroupChatTurn(groupSession, message, user.id);

    // Store all messages in database
    const conversationId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store user message first
    await Database.createMessage(
      user.id,
      0, // System user for group chats
      message,
      '',
      conversationId,
      'neutral'
    );

    // Store AI responses
    for (const msg of newMessages) {
      if (msg.type === 'ai') {
        await Database.createMessage(
          user.id,
          msg.senderId,
          msg.content,
          msg.content,
          conversationId,
          getEmotionFromResponse(msg.content)
        );

        // Process memory for AI responses
        await MemoryManager.processConversation(
          message, // Original user message
          msg.content,
          user.id,
          msg.senderId
        );
      }
    }

    return NextResponse.json({
      responses: newMessages
        .filter(msg => msg.type !== 'user')
        .map(msg => ({
          response: msg.content,
          character: {
            name: msg.sender,
            id: msg.senderId,
            emotion: getEmotionFromResponse(msg.content),
          },
        })),
      conversationId,
      groupChat: true,
    });
  } catch (error) {
    console.error('Group chat error:', error);
    return NextResponse.json({ error: 'Failed to process group chat' }, { status: 500 });
  }
}

function getEmotionFromResponse(response: string): string {
  const lowerResponse = response.toLowerCase();
  if (
    lowerResponse.includes('😊') ||
    lowerResponse.includes('awesome') ||
    lowerResponse.includes('love')
  ) {
    return 'happy';
  } else if (lowerResponse.includes('😂') || lowerResponse.includes('hilarious')) {
    return 'excited';
  } else if (lowerResponse.includes('sorry') || lowerResponse.includes('sad')) {
    return 'sad';
  } else if (lowerResponse.includes('think') || lowerResponse.includes('consider')) {
    return 'thinking';
  }
  return 'neutral';
}
