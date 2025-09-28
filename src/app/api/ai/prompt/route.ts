import { NextResponse } from 'next/server';
import { AIService } from '@/utils/aiService';

export async function POST(request: Request) {
  try {
    const { prompt, type = 'summarize' } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const response = await AIService.generateSuggestion(prompt, type);

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Error in ai/prompt route:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
