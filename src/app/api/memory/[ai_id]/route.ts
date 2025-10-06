import { NextRequest, NextResponse } from 'next/server';
import { Database, Cache } from '@/lib/database';

export async function GET(request: NextRequest, { params }: { params: { ai_id: string } }) {
  try {
    const aiId = params.ai_id;

    if (!aiId) {
      return NextResponse.json({ error: 'AI ID is required' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `memories:${aiId}`;
    const cachedMemories = await Cache.get(cacheKey);
    if (cachedMemories) {
      return NextResponse.json(cachedMemories);
    }

    // Find the character
    let character;
    if (!isNaN(parseInt(aiId))) {
      character = await Database.getCharacterById(parseInt(aiId));
    } else {
      character = await Database.getCharacterByName(aiId);
    }

    if (!character) {
      return NextResponse.json({ error: 'AI character not found' }, { status: 404 });
    }

    // Get memories for this AI
    const aiMemories = await Database.getMemoriesByAI(character.id);

    // Get recent conversation history
    const conversationHistory = await Database.getConversationHistory(0, character.id, 10); // Get last 10 conversations

    // Format conversation memories
    const conversationMemories = conversationHistory.map((conv: any) => ({
      id: `conv_${conv.id}`,
      type: 'conversation',
      key: 'conversation',
      value: {
        userMessage: conv.user_message,
        aiResponse: conv.ai_response,
        timestamp: conv.timestamp,
      },
      aiId: character.id,
      userId: conv.user_id,
      timestamp: conv.timestamp,
    }));

    const allMemories = [...aiMemories, ...conversationMemories];

    const result = {
      aiId: character.id,
      aiName: character.name,
      memories: allMemories,
      totalMemories: allMemories.length,
      familiarity: character.familiarity,
    };

    // Cache the result for 5 minutes
    await Cache.set(cacheKey, result, 300);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Memory fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
