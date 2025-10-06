import { NextRequest, NextResponse } from 'next/server';
import { memoryAgingSystem } from '@/lib/memoryAging';

export async function POST(request: NextRequest) {
  try {
    const { action, userId, characterId, memoryId, query, limit } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    switch (action) {
      case 'consolidate':
        const consolidationResult = await memoryAgingSystem.consolidateMemories(
          userId,
          characterId
        );
        return NextResponse.json({
          success: true,
          consolidated: consolidationResult.consolidated,
          archived: consolidationResult.archived,
          deleted: consolidationResult.deleted,
        });

      case 'access':
        if (!memoryId) {
          return NextResponse.json(
            { error: 'memoryId is required for access action' },
            { status: 400 }
          );
        }
        const accessedMemory = await memoryAgingSystem.accessMemory(memoryId);
        return NextResponse.json({
          success: true,
          memory: accessedMemory,
        });

      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'query is required for search action' },
            { status: 400 }
          );
        }
        const suggestions = await memoryAgingSystem.getMemorySuggestions(
          query,
          userId,
          characterId,
          limit || 5
        );
        return NextResponse.json({
          success: true,
          suggestions,
        });

      case 'health':
        const healthStats = await memoryAgingSystem.getMemoryHealthStats(userId, characterId);
        return NextResponse.json({
          success: true,
          stats: healthStats,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: consolidate, access, search, health' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Memory aging API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const characterId = searchParams.get('characterId');

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
    }

    switch (action) {
      case 'config':
        const config = memoryAgingSystem.getConfig();
        return NextResponse.json({
          success: true,
          config,
        });

      case 'health':
        const healthStats = await memoryAgingSystem.getMemoryHealthStats(
          userId,
          characterId || undefined
        );
        return NextResponse.json({
          success: true,
          stats: healthStats,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: config, health' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Memory aging GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
