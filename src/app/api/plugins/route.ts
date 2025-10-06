import { NextRequest, NextResponse } from 'next/server';
import { pluginSystem } from '@/lib/pluginSystem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pluginId, endpoint, method, headers, body: requestBody, query } = body;

    if (!pluginId || !endpoint || !method) {
      return NextResponse.json(
        { error: 'Missing required fields: pluginId, endpoint, method' },
        { status: 400 }
      );
    }

    // Handle external API request through plugin system
    const result = await pluginSystem.handleExternalAPI({
      pluginId,
      endpoint,
      method: method.toUpperCase(),
      headers: headers || {},
      body: requestBody,
      query: query || {},
    });

    return new NextResponse(result.body, {
      status: result.status,
      headers: result.headers,
    });
  } catch (error) {
    console.error('Plugin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        const plugins = pluginSystem.getInstalledPlugins();
        return NextResponse.json({
          success: true,
          plugins: plugins.map(p => ({
            id: p.manifest.id,
            name: p.manifest.name,
            version: p.manifest.version,
            description: p.manifest.description,
            author: p.manifest.author,
            enabled: p.enabled,
          })),
        });

      case 'keys':
        const pluginId = searchParams.get('pluginId');
        if (!pluginId) {
          return NextResponse.json({ error: 'pluginId parameter required' }, { status: 400 });
        }
        const keys = pluginSystem.getPluginAPIKeys(pluginId);
        return NextResponse.json({
          success: true,
          keys: keys.map(k => ({
            name: k.name,
            permissions: k.permissions,
            enabled: k.enabled,
            createdAt: k.createdAt,
            lastUsed: k.lastUsed,
          })),
        });

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Plugin API GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
