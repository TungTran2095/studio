import { NextResponse } from 'next/server';
import { createTradingBot, CreateTradingBotInput } from '@/lib/trading/trading-bot';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, name, backtestId, account, config } = body;

    if (!projectId || !name || !backtestId || !account || !config) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }
    
    // 1. Create the bot in the database
    const createBotInput: CreateTradingBotInput = {
      name,
      backtestId,
      account,
      config,
    };
    
    const newBot = await createTradingBot(projectId, createBotInput);

    if (!newBot) {
      return NextResponse.json({ success: false, message: 'Failed to create bot in database' }, { status: 500 });
    }

    // 2. Call the Python backend to start the bot
    // The Python backend is expected to be running on localhost:5000
    try {
      const pythonResponse = await fetch('http://localhost:5000/run-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId: newBot.id,
          projectId,
          name,
          backtestId,
          account,
          config,
        }),
      });

      if (!pythonResponse.ok) {
        const errorBody = await pythonResponse.text();
        console.error('Python backend error:', errorBody);
        // Even if Python backend fails, the bot is created in the DB.
        // The user can start it manually later.
        return NextResponse.json({ 
          success: true, 
          data: newBot,
          message: 'Bot created in DB, but failed to start automatically. You can start it manually.' 
        });
      }
      
      const pythonData = await pythonResponse.json();
      console.log('Python backend response:', pythonData);

    } catch (e) {
      console.error('Failed to connect to Python backend:', e);
      return NextResponse.json({ 
        success: true, 
        data: newBot,
        message: 'Bot created in DB, but could not connect to Python backend to start it.' 
      });
    }

    return NextResponse.json({ success: true, data: newBot, message: 'Bot created and started successfully' });

  } catch (error) {
    console.error('Error in /api/trading/run-bot:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
} 