import { NextRequest, NextResponse } from 'next/server';
import { localAIService } from '@/lib/ollama';
import { Cache } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { model } = await request.json();

    if (!model) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      );
    }

    // Set the active model in the local AI service
    localAIService.setModel(model);

    // Cache the active model setting
    await Cache.set('active_model', model);

    return NextResponse.json({
      success: true,
      activeModel: model
    });
  } catch (error) {
    console.error('Set active model error:', error);
    return NextResponse.json(
      { error: 'Failed to set active model' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const activeModel = localAIService.getCurrentModel();

    return NextResponse.json({
      activeModel
    });
  } catch (error) {
    console.error('Get active model error:', error);
    return NextResponse.json(
      { error: 'Failed to get active model' },
      { status: 500 }
    );
  }
}