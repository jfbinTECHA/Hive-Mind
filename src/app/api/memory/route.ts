import { NextRequest, NextResponse } from 'next/server';
import { Database, Cache } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { aiId, userId, type, key, value, action = 'add' } = await request.json();

    if (!aiId || !key || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: aiId, key, type' },
        { status: 400 }
      );
    }

    // Get or create user
    let user = userId ? await Database.getUserById(parseInt(userId)) : null;
    if (!user) {
      user = await Database.createUser('Anonymous User');
    }

    // Find the character
    let character;
    if (!isNaN(parseInt(aiId))) {
      character = await Database.getCharacterById(parseInt(aiId));
    } else {
      character = await Database.getCharacterByName(aiId);
    }

    if (!character) {
      return NextResponse.json(
        { error: 'AI character not found' },
        { status: 404 }
      );
    }

    if (action === 'add' || action === 'update') {
      // Create or update memory
      const memory = await Database.createMemory(
        user.id,
        character.id,
        `${key}: ${value}`,
        type
      );

      // Clear cache for this AI's memories
      await Cache.del(`memories:${character.id}`);

      return NextResponse.json({
        success: true,
        action: 'added',
        memory
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
          memory: memoryToDelete
        });
      } else {
        return NextResponse.json(
          { error: 'Memory not found' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "add", "update", or "delete"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Memory API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const aiId = searchParams.get('aiId');
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    let memories = [];
    let character = null;

    if (aiId) {
      // Find the character
      if (!isNaN(parseInt(aiId))) {
        character = await Database.getCharacterById(parseInt(aiId));
      } else {
        character = await Database.getCharacterByName(aiId);
      }

      if (character) {
        if (userId) {
          memories = await Database.getMemoriesByUserAndAI(parseInt(userId), character.id);
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
      total: memories.length
    });

  } catch (error) {
    console.error('Memory fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}