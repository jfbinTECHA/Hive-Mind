import { NextRequest, NextResponse } from 'next/server';
import { dreamsAndReflectionSystem } from '@/lib/dreamsAndReflection';

export async function POST(request: NextRequest) {
  try {
    const { action, userId, characterId } = await request.json();

    if (!userId || !characterId) {
      return NextResponse.json({ error: 'userId and characterId are required' }, { status: 400 });
    }

    switch (action) {
      case 'process':
        const reflection = await dreamsAndReflectionSystem.processDailyReflection(
          userId,
          characterId
        );
        return NextResponse.json({
          success: true,
          reflection,
        });

      case 'trigger':
        const manualReflection = await dreamsAndReflectionSystem.triggerReflection(
          userId,
          characterId
        );
        return NextResponse.json({
          success: true,
          reflection: manualReflection,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: process, trigger' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Reflection API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const characterId = searchParams.get('characterId');

    switch (action) {
      case 'traits':
        const traits = dreamsAndReflectionSystem.getPersonalityTraits();
        return NextResponse.json({
          success: true,
          traits,
        });

      case 'history':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId parameter is required for history' },
            { status: 400 }
          );
        }
        const history = await dreamsAndReflectionSystem.getReflectionHistory(
          userId,
          characterId || undefined,
          10
        );
        return NextResponse.json({
          success: true,
          history,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: traits, history' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Reflection GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
