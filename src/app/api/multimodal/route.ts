import { NextRequest, NextResponse } from 'next/server';
import { multiModalProcessor } from '@/lib/multiModal';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file uploads
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const type = formData.get('type') as string;
      const companionId = formData.get('companionId') as string;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Process the file based on type
      let result;
      if (type === 'image') {
        const imageResult = await multiModalProcessor.processImage(await file.arrayBuffer().then(buf => Buffer.from(buf).toString('base64')), companionId);
        result = {
          content: `Image uploaded: ${file.name}. ${imageResult.description || 'An image with objects: ' + imageResult.objects.join(', ')}`,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            analysis: imageResult
          }
        };
      } else if (type === 'document') {
        result = await multiModalProcessor.processDocument(file, companionId);
      } else {
        return NextResponse.json(
          { error: 'Unsupported file type' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        processedContent: result.content,
        metadata: result.metadata
      });

    } else {
      // Handle JSON requests (URLs, etc.)
      const body = await request.json();
      const { type, sourceUrl, companionId } = body;

      if (type === 'url') {
        if (!sourceUrl) {
          return NextResponse.json(
            { error: 'No URL provided' },
            { status: 400 }
          );
        }

        const result = await multiModalProcessor.processUrl(sourceUrl, companionId);

        return NextResponse.json({
          success: true,
          processedContent: result.content,
          metadata: result.metadata
        });
      }

      return NextResponse.json(
        { error: 'Unsupported request type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Multimodal processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}