import { useState, useCallback } from 'react';
import useLanguageModel from './useLanguageModel';

interface AnalysisResult {
  title: string;
  summary: string;
  keyPoints: string[];
  url: string;
  metadata?: any;
  aiEnhanced: boolean;
  scrapedAt: string;
}

interface SummarizeResult {
  summary: string;
  url: string;
  source: 'language-model' | 'fallback';
  createdAt: string;
}

interface InsightsResult {
  insights: string[];
  url: string;
  source: 'language-model' | 'fallback';
  createdAt: string;
}

interface UseAIAnalysisReturn {
  analyzeLink: (url: string) => Promise<AnalysisResult>;
  summarizeContent: (url: string, content: string) => Promise<SummarizeResult>;
  extractInsights: (url: string, content: string) => Promise<InsightsResult>;
  enhanceContent: (content: string, style?: 'academic' | 'simple' | 'formal') => Promise<string>;
  isLoading: boolean;
  error: string | null;
  isLocalAIAvailable: boolean;
}

const useAIAnalysis = (): UseAIAnalysisReturn => {
  const { isAvailable, prompt, isLoading: isModelLoading } = useLanguageModel();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeLink = useCallback(async (url: string): Promise<AnalysisResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try local AI first
      if (isAvailable) {
        try {
          // First scrape the URL content
          const scrapeResponse = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: url, task: 'scrape-single' })
          });

          if (scrapeResponse.ok) {
            const scrapeResult = await scrapeResponse.json();
            
            if (scrapeResult.result?.success && scrapeResult.result?.content) {
              const content = scrapeResult.result.content;
              
              // Use local AI to analyze
              const analysisPrompt = `Analyze this web content and provide a structured analysis:

URL: ${url}
Title: ${content.title}
Content: ${content.content.substring(0, 8000)}

Please provide:
1. A concise title (if not clear from content)
2. A brief summary (2-3 sentences)
3. 3-5 key points or insights

Format your response as:
Title: [title]
Summary: [summary]
Key Points:
- [point 1]
- [point 2]
- [point 3]`;

              const analysis = await prompt(analysisPrompt);
              
              // Parse the response
              const lines = analysis.split('\n');
              let title = '';
              let summary = '';
              const keyPoints: string[] = [];
              
              let currentSection = '';
              for (const line of lines) {
                if (line.startsWith('Title:')) {
                  title = line.replace('Title:', '').trim();
                } else if (line.startsWith('Summary:')) {
                  summary = line.replace('Summary:', '').trim();
                } else if (line.startsWith('Key Points:')) {
                  currentSection = 'keyPoints';
                } else if (line.startsWith('-') && currentSection === 'keyPoints') {
                  keyPoints.push(line.replace('-', '').trim());
                }
              }

              return {
                title: title || content.title || 'Content Analysis',
                summary: summary || 'No summary available',
                keyPoints: keyPoints.length > 0 ? keyPoints : ['Content analyzed successfully'],
                url,
                metadata: content.metadata,
                aiEnhanced: true,
                scrapedAt: new Date().toISOString()
              };
            }
          }
        } catch (localError) {
          console.warn('Local AI analysis failed, falling back to server:', localError);
        }
      }

      // Fallback to server-side analysis
      const response = await fetch('/api/ai/analyze-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, task: 'analyze-link' })
      });

      if (!response.ok) {
        throw new Error('Server-side analysis failed');
      }

      const result = await response.json();
      return result.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, prompt]);

  const summarizeContent = useCallback(async (url: string, content: string): Promise<SummarizeResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try local AI first
      if (isAvailable) {
        try {
          const summaryPrompt = `Please provide a concise summary of the following content. Keep it under 500 words and focus on key points:

${content}

Summary:`;

          const summary = await prompt(summaryPrompt);

          return {
            summary,
            url,
            source: 'language-model' as const,
            createdAt: new Date().toISOString()
          };
        } catch (localError) {
          console.warn('Local AI summarization failed, falling back to server:', localError);
        }
      }

      // Fallback to server-side
      const response = await fetch('/api/ai/analyze-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          task: 'summarize-content', 
          options: { content }
        })
      });

      if (!response.ok) {
        throw new Error('Server-side summarization failed');
      }

      const result = await response.json();
      return result.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Summarization failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, prompt]);

  const extractInsights = useCallback(async (url: string, content: string): Promise<InsightsResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try local AI first
      if (isAvailable) {
        try {
          const insightsPrompt = `Extract the most important insights, key findings, or notable points from this content. List them as bullet points:

${content}

Key Insights:`;

          const insightsResponse = await prompt(insightsPrompt);
          
          // Extract bullet points
          const lines = insightsResponse.split('\n');
          const insights: string[] = [];
          
          for (const line of lines) {
            if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
              insights.push(line.replace(/^[-•\d.]\s*/, '').trim());
            }
          }

          return {
            insights: insights.length > 0 ? insights : ['Content analyzed for insights'],
            url,
            source: 'language-model' as const,
            createdAt: new Date().toISOString()
          };
        } catch (localError) {
          console.warn('Local AI insight extraction failed, falling back to server:', localError);
        }
      }

      // Fallback to server-side
      const response = await fetch('/api/ai/analyze-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          task: 'extract-insights', 
          options: { content }
        })
      });

      if (!response.ok) {
        throw new Error('Server-side insight extraction failed');
      }

      const result = await response.json();
      return result.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Insight extraction failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, prompt]);

  const enhanceContent = useCallback(async (
    content: string, 
    style: 'academic' | 'simple' | 'formal' = 'academic'
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Try local AI first
      if (isAvailable) {
        try {
          const stylePrompts = {
            academic: 'Rewrite this content in a more academic style with formal language, proper structure, and scholarly tone.',
            simple: 'Simplify this content to make it easier to understand for a general audience.',
            formal: 'Rewrite this content in a more professional and formal tone suitable for business communication.'
          };

          const enhancePrompt = `${stylePrompts[style]}

Content: ${content}

Enhanced version:`;

          return await prompt(enhancePrompt);
        } catch (localError) {
          console.warn('Local AI content enhancement failed, falling back to server:', localError);
        }
      }

      // Fallback to server-side
      const response = await fetch('/api/ai/analyze-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task: 'enhance-content', 
          options: { content, style }
        })
      });

      if (!response.ok) {
        throw new Error('Server-side content enhancement failed');
      }

      const result = await response.json();
      return result.data.enhanced;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Content enhancement failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, prompt]);

  return {
    analyzeLink,
    summarizeContent,
    extractInsights,
    enhanceContent,
    isLoading: isLoading || isModelLoading,
    error,
    isLocalAIAvailable: isAvailable
  };
};

export default useAIAnalysis;