import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/metrics';

export async function GET() {
  try {
    const metrics = await getMetrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Metrics collection error:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}