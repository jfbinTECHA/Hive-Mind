import { NextRequest, NextResponse } from 'next/server';
import { Database, Cache } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { ai_id: string; memoryId: string } }
) {
  try {
    const aiId = params.ai_id;
    const memoryId = parseInt(params.memoryId);

    if (!aiId || isNaN(memoryId)) {
      return NextResponse.json(
        { error: 'AI ID and valid Memory ID are required' },
        { status: 400 }
      );
    }

    const { content, type, tags } = await request.json();

    // Update the memory in database
    await Database.updateMemory(memoryId, {
      content,
      type,
      tags: tags || [],
    });

    // Clear cache
    const cacheKey = `memories:${aiId}`;
    await Cache.del(cacheKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Memory update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ai_id: string; memoryId: string } }
) {
  try {
    const aiId = params.ai_id;
    const memoryId = parseInt(params.memoryId);

    if (!aiId || isNaN(memoryId)) {
      return NextResponse.json(
        { error: 'AI ID and valid Memory ID are required' },
        { status: 400 }
      );
    }

    // Delete the memory from database
    await Database.deleteMemory(memoryId);

    // Clear cache
    const cacheKey = `memories:${aiId}`;
    await Cache.del(cacheKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Memory delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
