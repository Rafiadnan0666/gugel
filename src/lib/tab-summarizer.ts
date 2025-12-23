export interface LanguageModelSession {
  prompt(input: string): Promise<string>;
}

export interface LanguageModelCapabilities {
  available: boolean;
  session?: LanguageModelSession;
  error?: string;
}

class TabSummarizer {
  private session: LanguageModelSession | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<LanguageModelCapabilities> {
    if (this.isInitialized) {
      return {
        available: !!this.session,
        session: this.session || undefined,
      };
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return {
        available: !!this.session,
        session: this.session || undefined,
      };
    }

    this.initializationPromise = this.createSession();
    await this.initializationPromise;

    return {
      available: !!this.session,
      session: this.session || undefined,
    };
  }

  private async createSession(): Promise<void> {
    try {
      // Check if LanguageModel is available (Chrome AI API)
      if (typeof window === 'undefined' || !('LanguageModel' in window)) {
        console.warn('LanguageModel API not available in this environment');
        return;
      }

      const LanguageModelAPI = (window as any).LanguageModel;
      
      const opts = {
        expectedOutputs: [{ type: "text", languages: ["en"] }]
      };

      const availability = await LanguageModelAPI.availability(opts);
      console.log("LanguageModel availability:", availability);

      if (availability === "unavailable") {
        console.error("❌ LanguageModel is unavailable.");
        return;
      }

      this.session = await LanguageModelAPI.create({
        ...opts,
        monitor(m: any) {
          m.addEventListener("downloadprogress", (e: any) => {
            console.log(`📥 Download progress: ${(e.loaded * 100).toFixed(1)}%`);
          });
          m.addEventListener("statechange", (e: any) => {
            console.log("⚡ State change:", e.target.state);
          });
        }
      });

      console.log("✅ LanguageModel session ready");
      this.isInitialized = true;

    } catch (error) {
      console.error("Error creating LanguageModel session:", error);
      this.isInitialized = true;
    }
  }

  async summarizeContent(content: string, type: 'tab' | 'draft' = 'tab'): Promise<string> {
    const capabilities = await this.initialize();
    
    if (!capabilities.available || !capabilities.session) {
      throw new Error('LanguageModel is not available');
    }

    const maxLength = 8000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..." 
      : content;

    const prompt = `Create a concise and informative summary of the following ${type} content. Focus on the main points, key insights, and important details:

"""${truncatedContent}"""

Please provide a clear, well-structured summary that captures the essence of the content.`;

    try {
      const result = await capabilities.session.prompt(prompt);
      return result;
    } catch (error) {
      console.error('Error summarizing content:', error);
      throw new Error('Failed to generate summary');
    }
  }

  async summarizeUrlContent(url: string, scrapedContent: string): Promise<string> {
    const capabilities = await this.initialize();
    
    if (!capabilities.available || !capabilities.session) {
      throw new Error('LanguageModel is not available');
    }

    const maxLength = 8000;
    const truncatedContent = scrapedContent.length > maxLength 
      ? scrapedContent.substring(0, maxLength) + "..." 
      : scrapedContent;

    const prompt = `Create a comprehensive summary of the content from ${url}. Focus on extracting the main points, key information, and valuable insights:

"""${truncatedContent}"""

Please provide a clear, well-structured summary that effectively summarizes the webpage content.`;

    try {
      const result = await capabilities.session.prompt(prompt);
      return result;
    } catch (error) {
      console.error('Error summarizing URL content:', error);
      throw new Error('Failed to generate URL summary');
    }
  }

  async processTabsContent(tabs: Array<{ id: string; title: string; content?: string; url?: string }>): Promise<Array<{ id: string; summary: string; error?: string }>> {
    const results: Array<{ id: string; summary: string; error?: string }> = [];

    for (const tab of tabs) {
      try {
        let contentToSummarize = '';
        
        if (tab.content) {
          contentToSummarize = tab.content;
        } else if (tab.url) {
          // For tabs with URLs, we'd need to scrape first
          // This is a placeholder - actual scraping would happen elsewhere
          contentToSummarize = `Content from ${tab.url} - Title: ${tab.title}`;
        } else {
          results.push({
            id: tab.id,
            summary: '',
            error: 'No content available for summarization'
          });
          continue;
        }

        const summary = await this.summarizeContent(contentToSummarize, 'tab');
        results.push({
          id: tab.id,
          summary
        });
      } catch (error) {
        results.push({
          id: tab.id,
          summary: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  async rewriteContent(content: string, style: string = 'professional'): Promise<string> {
    const capabilities = await this.initialize();
    
    if (!capabilities.available || !capabilities.session) {
      throw new Error('LanguageModel is not available');
    }

    const maxLength = 8000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + "..." 
      : content;

    const prompt = `Rewrite the following content in a ${style} style. Maintain the core meaning and important details while adapting the tone and structure:

"""${truncatedContent}"""

Please provide a well-written version that matches the requested style.`;

    try {
      const result = await capabilities.session.prompt(prompt);
      return result;
    } catch (error) {
      console.error('Error rewriting content:', error);
      throw new Error('Failed to rewrite content');
    }
  }

  async expandContent(content: string): Promise<string> {
    const capabilities = await this.initialize();
    
    if (!capabilities.available || !capabilities.session) {
      throw new Error('LanguageModel is not available');
    }

    const prompt = `Expand and elaborate on the following content. Add more detail, context, and depth while maintaining the original message:

"""${content}"""

Please provide a more comprehensive version that explores the topic in greater depth.`;

    try {
      const result = await capabilities.session.prompt(prompt);
      return result;
    } catch (error) {
      console.error('Error expanding content:', error);
      throw new Error('Failed to expand content');
    }
  }

  isSessionReady(): boolean {
    return this.isInitialized && !!this.session;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const capabilities = await this.initialize();
      return capabilities.available;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const tabSummarizer = new TabSummarizer();

// Export types for external use
export type { TabSummarizer };