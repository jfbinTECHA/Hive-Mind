import { NextRequest, NextResponse } from 'next/server';
import { multiModalProcessor } from '@/lib/multiModal';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { userId, characterId, inputType } = Object.fromEntries(formData);

    if (!userId || !characterId || !inputType) {
      return NextResponse.json(
        { error: 'userId, characterId, and inputType are required' },
        { status: 400 }
      );
    }

    let processedInput: any = null;

    switch (inputType) {
      case 'image':
        const imageFile = formData.get('file') as File;
        if (!imageFile) {
          return NextResponse.json(
            { error: 'Image file is required' },
            { status: 400 }
          );
        }

        // Convert file to base64
        const imageBuffer = await imageFile.arrayBuffer();
        const imageBase64 = `data:${imageFile.type};base64,${Buffer.from(imageBuffer).toString('base64')}`;

        // Process image
        const imageAnalysis = await multiModalProcessor.processImage(imageBase64);

        processedInput = {
          type: 'image',
          content: imageBase64,
          metadata: {
            timestamp: new Date(),
            deviceInfo: {
              platform: 'web',
              userAgent: request.headers.get('user-agent') || 'unknown'
            },
            processingResults: {
              imageAnalysis
            }
          }
        };
        break;

      case 'voice':
        const audioFile = formData.get('file') as File;
        if (!audioFile) {
          return NextResponse.json(
            { error: 'Audio file is required' },
            { status: 400 }
          );
        }

        // Convert file to base64
        const audioBuffer = await audioFile.arrayBuffer();
        const audioBase64 = `data:${audioFile.type};base64,${Buffer.from(audioBuffer).toString('base64')}`;

        // Process voice
        const voiceAnalysis = await multiModalProcessor.processVoice(audioBase64);

        processedInput = {
          type: 'voice',
          content: audioBase64,
          metadata: {
            timestamp: new Date(),
            deviceInfo: {
              platform: 'web',
              userAgent: request.headers.get('user-agent') || 'unknown'
            },
            processingResults: voiceAnalysis
          }
        };
        break;

      case 'location':
        const latitude = formData.get('latitude') as string;
        const longitude = formData.get('longitude') as string;
        const accuracy = formData.get('accuracy') as string;

        if (!latitude || !longitude) {
          return NextResponse.json(
            { error: 'Latitude and longitude are required for location input' },
            { status: 400 }
          );
        }

        // Process location
        const locationData = await multiModalProcessor.processLocation(
          parseFloat(latitude),
          parseFloat(longitude)
        );

        processedInput = {
          type: 'location',
          content: JSON.stringify({
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: accuracy ? parseFloat(accuracy) : undefined
          }),
          metadata: {
            timestamp: new Date(),
            location: {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              accuracy: accuracy ? parseFloat(accuracy) : undefined,
              placeName: locationData.placeName
            },
            deviceInfo: {
              platform: 'web',
              userAgent: request.headers.get('user-agent') || 'unknown'
            },
            processingResults: {
              weather: locationData.weather
            }
          }
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid input type. Supported types: image, voice, location' },
          { status: 400 }
        );
    }

    // Store the processed input
    const storedInput = await multiModalProcessor.storeMultiModalInput(
      parseInt(userId as string),
      parseInt(characterId as string),
      processedInput
    );

    // Generate AI response
    const conversationHistory: any[] = []; // Would need to fetch recent conversation history
    const aiResponse = await multiModalProcessor.generateMultiModalResponse(
      parseInt(userId as string),
      parseInt(characterId as string),
      processedInput,
      conversationHistory
    );

    return NextResponse.json({
      success: true,
      input: storedInput,
      response: aiResponse,
      analysis: processedInput.metadata.processingResults
    });

  } catch (error) {
    console.error('Multi-modal API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const characterId = searchParams.get('characterId');
    const limit = searchParams.get('limit') || '20';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const inputs = await multiModalProcessor.getMultiModalInputs(
      parseInt(userId),
      characterId ? parseInt(characterId) : undefined,
      parseInt(limit)
    );

    return NextResponse.json({
      success: true,
      inputs
    });

  } catch (error) {
    console.error('Multi-modal GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}