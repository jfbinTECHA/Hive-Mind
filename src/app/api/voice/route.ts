import { NextRequest, NextResponse } from 'next/server';
import { voiceService, ElevenLabsService } from '@/lib/elevenlabs';
import { Database } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { text, personality, characterId, emotionalState } = await request.json();

    if (!text || !personality) {
      return NextResponse.json(
        { error: 'Missing required fields: text and personality' },
        { status: 400 }
      );
    }

    // Check if voice service is available
    if (!voiceService.isAvailable()) {
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 503 }
      );
    }

    // Get character for additional context
    let character = null;
    if (characterId) {
      character = await Database.getCharacterById(parseInt(characterId));
    }

    // Generate voice audio
    const audioUrl = await voiceService.generateAndCacheVoice(
      text,
      personality,
      emotionalState
    );

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Failed to generate voice audio' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      audioUrl,
      character: character ? {
        name: character.name,
        personality: character.personality
      } : null,
      voiceStats: voiceService.getVoiceStats()
    });

  } catch (error) {
    console.error('Voice generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      return NextResponse.json(voiceService.getVoiceStats());
    }

    if (action === 'voices') {
      const voices = await voiceService.getAvailableVoices();
      return NextResponse.json({ voices });
    }

    if (action === 'settings') {
      const personality = searchParams.get('personality') || 'friendly';
      const settings = ElevenLabsService.getVoiceSettingsForPersonality(personality);
      return NextResponse.json({ settings });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}