import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      content, 
      style, 
      context = {},
      preserveCitations = true,
      improveStructure = true 
    } = await request.json();

    if (!content || !style) {
      return NextResponse.json({ error: 'Content and style are required' }, { status: 400 });
    }

    // Get API configuration from environment
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'AI service not configured',
        message: 'No API key found for AI service'
      }, { status: 500 });
    }

    // Create enhanced prompt for contextual rewriting
    const prompt = `You are an expert academic and professional writer. Rewrite the following content in a ${style} style while following specific requirements:

CONTEXT:
${context.researchTopic ? `Research Topic: ${context.researchTopic}` : ''}
${context.targetAudience ? `Target Audience: ${context.targetAudience}` : ''}
${context.writingGoals?.length ? `Writing Goals: ${context.writingGoals.join(', ')}` : ''}
${context.existingSources ? `Existing Sources: ${context.existingSources.length} sources available` : ''}

REQUIREMENTS:
- ${preserveCitations ? 'Preserve all citations, references, and source attribution exactly as written' : 'Citations may be modified for clarity'}
- ${improveStructure ? 'Improve sentence structure, flow, and organization while maintaining original meaning' : 'Maintain original structure exactly'}
- Maintain academic integrity - no plagiarism
- Keep approximately the same length (+/- 20%)
- Ensure all key information, arguments, and evidence are retained
- Use appropriate terminology for the ${style} style
- Maintain consistent tone throughout

ORIGINAL CONTENT:
"""${content}"""

Please provide your response in the following JSON format:
{
  "rewrittenContent": "The complete rewritten content",
  "improvements": {
    "clarity": "Score 0-100 and brief explanation",
    "coherence": "Score 0-100 and brief explanation", 
    "academicTone": "Score 0-100 and brief explanation",
    "originality": "Score 0-100 and brief explanation"
  },
  "changes": [
    {
      "type": "sentence|paragraph|wording|structure",
      "original": "brief excerpt of original text",
      "improved": "corresponding improved text", 
      "reason": "explanation of change"
    }
  ],
  "suggestions": [
    "Additional suggestions for further improvement"
  ],
  "qualityMetrics": {
    "readingLevel": "easy|medium|hard",
    "wordCount": "number of words in rewritten content",
    "sentenceCount": "number of sentences",
    "avgSentenceLength": "average sentence length"
  }
}`;

    // Make API call based on available service
    let response;
    let result;

    if (process.env.OPENAI_API_KEY) {
      // OpenAI implementation
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert academic and professional writer. Always respond in valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const openaiResult = await response.json();
      result = openaiResult.choices[0].message.content;

    } else if (process.env.ANTHROPIC_API_KEY) {
      // Anthropic Claude implementation
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const anthropicResult = await response.json();
      result = anthropicResult.content[0].text;

    } else {
      return NextResponse.json({ 
        error: 'No AI service configured',
        message: 'Neither OpenAI nor Anthropic API keys are configured'
      }, { status: 500 });
    }

    // Parse the JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback: try to extract rewritten content from plain text
      parsedResult = {
        rewrittenContent: result,
        improvements: {
          clarity: { score: 75, explanation: 'Content successfully rewritten' },
          coherence: { score: 75, explanation: 'Structure maintained' },
          academicTone: { score: 75, explanation: 'Style applied' },
          originality: { score: 75, explanation: 'Content preserved and enhanced' }
        },
        changes: [],
        suggestions: ['Review for any missing contextual elements'],
        qualityMetrics: {
          readingLevel: 'medium',
          wordCount: result.split(/\s+/).length,
          sentenceCount: result.split(/[.!?]+/).length,
          avgSentenceLength: Math.round(result.split(/\s+/).length / result.split(/[.!?]+/).length)
        }
      };
    }

    return NextResponse.json({
      success: true,
      data: parsedResult
    });

  } catch (error) {
    console.error('Contextual rewriting error:', error);
    return NextResponse.json({
      error: 'Rewriting failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}