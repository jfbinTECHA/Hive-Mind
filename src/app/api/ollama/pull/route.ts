import { NextRequest, NextResponse } from 'next/server';
import { OllamaClient } from '@/lib/ollama';

export async function POST(request: NextRequest) {
  try {
    const { model } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }

    const ollama = new OllamaClient();
    const success = await ollama.pullModel(model);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Successfully pulled model: ${model}`,
      });
    } else {
      return NextResponse.json({ error: `Failed to pull model: ${model}` }, { status: 500 });
    }
  } catch (error) {
    console.error('Ollama pull error:', error);
    return NextResponse.json({ error: 'Failed to pull model' }, { status: 500 });
  }
}
