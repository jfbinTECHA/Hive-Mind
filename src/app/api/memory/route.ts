import { NextRequest, NextResponse } from 'next/server';
import { Database, Cache } from '@/lib/database';
import { memoryPostSchema, memoryGetQuerySchema, validateRequest } from '@/lib/validation';
import { checkRateLimit, memoryRateLimiter } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(request, memoryRateLimiter);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: rateLimitResult.headers,
        }
      );
    }

    const body = await request.json();
    const validation = validateRequest(memoryPostSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { aiId, userId, type, key, value, action } = validation.data;

    // Get or create user
    let user = userId ? await Database.getUserById(parseInt(String(userId))) : null;
    if (!user) {
      user = await Database.createUser('Anonymous User');
    }

    // Find the character
    let character;
    const aiIdStr = String(aiId);
    if (!isNaN(parseInt(aiIdStr))) {
      character = await Database.getCharacterById(parseInt(aiIdStr));
    } else {
      character = await Database.getCharacterByName(aiIdStr);
    }

    if (!character) {
      return NextResponse.json({ error: 'AI character not found' }, { status: 404 });
    }

    if (action === 'add' || action === 'update') {
      // Create or update memory
      const memory = await Database.createMemory(user.id, character.id, `${key}: ${value}`, type);

      // Clear cache for this AI's memories
      await Cache.del(`memories:${character.id}`);

      return NextResponse.json({
        success: true,
        action: 'added',
        memory,
      });
    } else if (action === 'delete') {
      // For delete, we need to find the memory first
      // This is a simplified implementation - in practice you'd need better key matching
      const memories = await Database.getMemoriesByUserAndAI(user.id, character.id);
      const memoryToDelete = memories.find(m => m.fact_text.startsWith(`${key}:`));

      if (memoryToDelete) {
        await Database.deleteMemory(memoryToDelete.id);

        // Clear cache
        await Cache.del(`memories:${character.id}`);

        return NextResponse.json({
          success: true,
          action: 'deleted',
          memory: memoryToDelete,
        });
      } else {
        return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "add", "update", or "delete"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Memory API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryData = {
      aiId: searchParams.get('aiId'),
      userId: searchParams.get('userId'),
      type: searchParams.get('type'),
    };

    const validation = validateRequest(memoryGetQuerySchema, queryData);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { aiId, userId, type } = validation.data;

    let memories = [];
    let character = null;

    if (aiId) {
      // Find the character
      const aiIdStr = String(aiId);
      if (!isNaN(parseInt(aiIdStr))) {
        character = await Database.getCharacterById(parseInt(aiIdStr));
      } else {
        character = await Database.getCharacterByName(aiIdStr);
      }

      if (character) {
        if (userId) {
          memories = await Database.getMemoriesByUserAndAI(parseInt(String(userId)), character.id);
        } else {
          memories = await Database.getMemoriesByAI(character.id);
        }
      }
    } else if (userId) {
      // Get all memories for a user across all AIs
      // This would require a more complex query in a real implementation
      memories = [];
    }

    // Filter by type if specified
    if (type) {
      memories = memories.filter(m => m.fact_type === type);
    }

    return NextResponse.json({
      memories,
      total: memories.length,
    });
  } catch (error) {
    console.error('Memory fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
