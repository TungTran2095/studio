import { NextRequest, NextResponse } from 'next/server';
import { sendChatMessage } from '@/app/chat-actions';

export async function POST(request: NextRequest) {
  try {
    const { userId, prompt } = await request.json();

    if (!userId || !prompt) {
      return NextResponse.json(
        { error: 'Missing userId or prompt' },
        { status: 400 }
      );
    }

    const result = await sendChatMessage({
      userId,
      prompt,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reply: result.reply,
      hasData: result.hasData,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


