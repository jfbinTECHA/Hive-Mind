import { NextResponse } from 'next/server';
import { OllamaClient } from '@/lib/ollama';

export async function GET() {
  try {
    const ollama = new OllamaClient();

    // Get installed models
    const installed = await ollama.listModels();

    // Common available models to suggest
    const available = [
      'llama3:8b',
      'llama3:70b',
      'llama2:7b',
      'llama2:13b',
      'codellama:7b',
      'codellama:13b',
      'mistral:7b',
      'mixtral:8x7b',
      'phi3:3.8b',
      'gemma:7b',
      'qwen:7b',
      'nomic-embed-text',
    ];

    // Filter out already installed models
    const installedNames = installed.map(model => model.name);
    const availableFiltered = available.filter(model => !installedNames.includes(model));

    return NextResponse.json({
      installed,
      available: availableFiltered,
    });
  } catch (error) {
    console.error('Ollama models fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
