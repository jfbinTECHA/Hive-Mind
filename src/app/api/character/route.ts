import { NextRequest, NextResponse } from 'next/server';
import { Database, Cache } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { name, personality, avatar, description, traits, voice } = await request.json();

    if (!name || !personality) {
      return NextResponse.json(
        { error: 'Missing required fields: name and personality' },
        { status: 400 }
      );
    }

    // Validate personality
    const validPersonalities = ['friendly', 'professional', 'humorous', 'serious'];
    if (!validPersonalities.includes(personality)) {
      return NextResponse.json(
        { error: 'Invalid personality. Must be one of: friendly, professional, humorous, serious' },
        { status: 400 }
      );
    }

    // Check if character already exists
    const existingCharacter = await Database.getCharacterByName(name);
    if (existingCharacter) {
      return NextResponse.json(
        { error: 'Character with this name already exists' },
        { status: 409 }
      );
    }

    // Create new character in database
    const newCharacter = await Database.createCharacter(
      name,
      description || `An AI companion with a ${personality} personality.`,
      avatar || '🤖',
      traits || [personality],
      personality
    );

    // Clear characters cache
    await Cache.del('characters');

    return NextResponse.json({
      success: true,
      character: {
        id: newCharacter.id,
        name: newCharacter.name,
        personality: newCharacter.personality,
        avatar: newCharacter.avatar_url,
        description: newCharacter.system_prompt,
        traits: newCharacter.traits,
        familiarity: newCharacter.familiarity,
        lastActive: newCharacter.updated_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Character creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const cachedCharacters = await Cache.get('characters');
    if (cachedCharacters) {
      return new Response(JSON.stringify(cachedCharacters), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all characters from database
    const characters = await Database.getAllCharacters();

    const result = {
      characters: characters.map(c => ({
        id: c.id,
        name: c.name,
        personality: c.personality,
        avatar: c.avatar_url,
        description: c.system_prompt,
        traits: c.traits,
        familiarity: c.familiarity,
        lastActive: c.updated_at
      })),
      total: characters.length
    };

    // Cache for 5 minutes
    await Cache.set('characters', result, 300);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Characters fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}