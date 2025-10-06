import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function GET(request: NextRequest, { params }: { params: { characterId: string } }) {
  try {
    const characterId = parseInt(params.characterId);

    if (isNaN(characterId)) {
      return NextResponse.json({ error: 'Invalid character ID' }, { status: 400 });
    }

    const emotionalState = await Database.getCharacterEmotionalState(characterId);

    return NextResponse.json({
      emotionalState: emotionalState || null,
    });
  } catch (error) {
    console.error('Get emotional state error:', error);
    return NextResponse.json({ error: 'Failed to get emotional state' }, { status: 500 });
  }
}
