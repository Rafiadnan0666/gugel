interface LanguageModelOptions {
  expectedOutputs: Array<{ type: string; languages: string[] }>;
}

interface LanguageModelSession {
  prompt: (text: string) => Promise<string>;
  destroy?: () => void;
}

interface LanguageModelStatic {
  availability: (opts: LanguageModelOptions) => Promise<string>;
  create: (opts: LanguageModelOptions & { monitor?: (m: any) => void }) => Promise<LanguageModelSession>;
}

declare global {
  interface Window {
    LanguageModelAI?: LanguageModelStatic;
  }
}

class LanguageModelService {
  private session: LanguageModelSession | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.session) return;
    if (this.isInitializing && this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      if (!window.LanguageModelAI) {
        throw new Error('LanguageModel API is not available');
      }

      const opts = {
        expectedOutputs: [{ type: 'text', languages: ['en'] }]
      };

      const availability = await window.LanguageModelAI.availability(opts);
      console.log('LanguageModel availability:', availability);

      if (availability === 'unavailable') {
        throw new Error('LanguageModel is unavailable');
      }

      this.session = await window.LanguageModelAI.create({
        ...opts,
        monitor(m: any) {
          m.addEventListener('downloadprogress', (e: any) => {
            console.log(`LanguageModel download progress: ${(e.loaded * 100).toFixed(1)}%`);
          });
          m.addEventListener('statechange', (e: any) => {
            console.log('LanguageModel state change:', e.target.state);
          });
        }
      });

      console.log('LanguageModel session ready:', this.session);
    } catch (error) {
      console.error('Failed to initialize LanguageModel:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async prompt(text: string): Promise<string> {
    await this.initialize();
    
    if (!this.session) {
      throw new Error('LanguageModel session is not initialized');
    }

    try {
      const result = await this.session.prompt(text);
      return result;
    } catch (error) {
      console.error('LanguageModel prompt failed:', error);
      throw error;
    }
  }

  async summarizeContent(content: string, maxLength: number = 500): Promise<string> {
    const prompt = `Please provide a concise summary of the following content. Keep it under ${maxLength} words and focus on the key points:

${content}

Summary:`;
    
    return this.prompt(prompt);
  }

  async analyzeUrl(url: string, content: string): Promise<{ title: string; summary: string; keyPoints: string[] }> {
    const prompt = `Analyze this web content and provide a structured analysis:

URL: ${url}
Content: ${content.substring(0, 8000)}

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

    const response = await this.prompt(prompt);
    
    // Parse the response
    const lines = response.split('\n');
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
      title: title || 'Content Analysis',
      summary: summary || 'No summary available',
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Content analyzed successfully']
    };
  }

  async enhanceContent(content: string, style: 'academic' | 'simple' | 'formal' = 'academic'): Promise<string> {
    const stylePrompts = {
      academic: 'Rewrite this content in a more academic style with formal language, proper structure, and scholarly tone.',
      simple: 'Simplify this content to make it easier to understand for a general audience.',
      formal: 'Rewrite this content in a more professional and formal tone suitable for business communication.'
    };

    const prompt = `${stylePrompts[style]}

Content: ${content}

Enhanced version:`;

    return this.prompt(prompt);
  }

  async extractInsights(content: string): Promise<string[]> {
    const prompt = `Extract the most important insights, key findings, or notable points from this content. List them as bullet points:

${content}

Key Insights:`;

    const response = await this.prompt(prompt);
    
    // Extract bullet points
    const lines = response.split('\n');
    const insights: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
        insights.push(line.replace(/^[-•\d.]\s*/, '').trim());
      }
    }

    return insights.length > 0 ? insights : ['Content analyzed for insights'];
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!window.LanguageModelAI) return false;
      
      const opts = {
        expectedOutputs: [{ type: 'text', languages: ['en'] }]
      };
      
      const availability = await window.LanguageModelAI.availability(opts);
      return availability !== 'unavailable';
    } catch {
      return false;
    }
  }

  destroy(): void {
    if (this.session && this.session.destroy) {
      this.session.destroy();
    }
    this.session = null;
    this.isInitializing = false;
    this.initPromise = null;
  }
}

export const languageModelService = new LanguageModelService();
export default languageModelService;