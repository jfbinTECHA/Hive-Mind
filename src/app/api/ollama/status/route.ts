import { NextResponse } from 'next/server';
import { OllamaClient } from '@/lib/ollama';

export async function GET() {
  try {
    const ollama = new OllamaClient();
    const isConnected = await ollama.checkConnection();

    return NextResponse.json({
      connected: isConnected,
      url: process.env.OLLAMA_URL || 'http://localhost:11434'
    });
  } catch (error) {
    console.error('Ollama status check error:', error);
    return NextResponse.json(
      { connected: false, error: 'Failed to check Ollama status' },
      { status: 500 }
    );
  }
}