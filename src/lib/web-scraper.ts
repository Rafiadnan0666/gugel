import * as cheerio from 'cheerio';

export interface URLValidationResult {
  isValid: boolean;
  url: string;
  protocol: string;
  domain: string;
  errors: string[];
  warnings: string[];
}

export interface ScrapedContent {
  url: string;
  title: string;
  description?: string;
  content: string;
  metadata: {
    author?: string;
    publishDate?: string;
    modifiedDate?: string;
    language?: string;
    keywords?: string[];
    wordCount: number;
    readingTime: number;
  };
  links: {
    internal: string[];
    external: string[];
    total: number;
  };
  images: {
    src: string;
    alt?: string;
    title?: string;
  }[];
  social: {
    openGraph: Record<string, string>;
    twitterCard: Record<string, string>;
  };
  technical: {
    statusCode: number;
    responseTime: number;
    contentType: string;
    size: number;
    charset?: string;
  };
  structure: {
    headings: {
      h1: string[];
      h2: string[];
      h3: string[];
      h4: string[];
      h5: string[];
      h6: string[];
    };
    paragraphs: number;
    lists: number;
    tables: number;
    forms: number;
  };
  performance: {
    loadTime: number;
    resourceCount: number;
    hasLazyLoading: boolean;
    hasCDN: boolean;
  };
}

export interface EnhancedAnalysis {
  credibilityScore: number;
  relevanceScore: number;
  keyInsights: string[];
  researchValue: 'high' | 'medium' | 'low';
  suggestedTags: string[];
  relatedTopics: string[];
  sourceType: 'academic' | 'news' | 'blog' | 'documentation' | 'ecommerce' | 'government' | 'other';
  readingDifficulty: 'easy' | 'medium' | 'hard';
  biasAnalysis: {
    politicalLean?: 'left' | 'center' | 'right' | 'unknown';
    biasLevel: 'low' | 'medium' | 'high';
    emotionalTone: 'neutral' | 'positive' | 'negative';
    objectivityScore: number;
  };
  factCheckResults: {
    claims: string[];
    verifiability: 'high' | 'medium' | 'low';
    sourcesMentioned: number;
    citationsFound: boolean;
  };
  contentQuality: {
    depthScore: number;
    accuracyScore: number;
    uniquenessScore: number;
    timestamp: string;
  };
  recommendations: string[];
}

export interface EnhancedAnalysis {
  credibilityScore: number;
  relevanceScore: number;
  keyInsights: string[];
  researchValue: 'high' | 'medium' | 'low';
  suggestedTags: string[];
  relatedTopics: string[];
  sourceType: 'academic' | 'news' | 'blog' | 'documentation' | 'ecommerce' | 'government' | 'other';
  readingDifficulty: 'easy' | 'medium' | 'hard';
  biasAnalysis: {
    politicalLean?: 'left' | 'center' | 'right' | 'unknown';
    biasLevel: 'low' | 'medium' | 'high';
    emotionalTone: 'neutral' | 'positive' | 'negative';
    objectivityScore: number;
  };
  factCheckResults: {
    claims: string[];
    verifiability: 'high' | 'medium' | 'low';
    sourcesMentioned: number;
    citationsFound: boolean;
  };
  contentQuality: {
    depthScore: number;
    accuracyScore: number;
    uniquenessScore: number;
    timestamp: string;
  };
  recommendations: string[];
}

export interface FactCheckResult {
  claim: string;
  verification: 'true' | 'false' | 'misleading' | 'unverifiable';
  confidence: number;
  sources: string[];
  explanation: string;
}

export interface BiasAnalysisResult {
  overallBias: 'low' | 'medium' | 'high';
  politicalLean?: 'left' | 'center' | 'right' | 'unknown';
  emotionalTone: 'neutral' | 'positive' | 'negative';
  loadedLanguage: string[];
  framing: 'balanced' | 'partial' | 'one-sided';
  objectivityScore: number;
}

export interface ScrapingReport {
  url: string;
  timestamp: string;
  success: boolean;
  validationResult: URLValidationResult;
  content: ScrapedContent | null;
  errors: string[];
  warnings: string[];
  summary: {
    contentQuality: 'excellent' | 'good' | 'fair' | 'poor';
    seoScore: number;
    accessibilityScore: number;
    technicalIssues: string[];
    recommendations: string[];
  };
}

export class WebScraper {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private timeout = 30000;
  private maxContentSize = 10 * 1024 * 1024; // 10MB

  validateURL(url: string): URLValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Normalize URL
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
        warnings.push('Protocol added (defaulted to HTTPS)');
      }

      const urlObj = new URL(normalizedUrl);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push('Invalid protocol. Only HTTP and HTTPS are supported');
      }

      // Check domain
      if (!urlObj.hostname) {
        errors.push('Invalid domain name');
      }

      // Check for common issues
      if (urlObj.hostname.includes('localhost') || urlObj.hostname.includes('127.0.0.1')) {
        warnings.push('Localhost detected - may not be accessible');
      }

      if (urlObj.hostname.length > 253) {
        errors.push('Domain name too long');
      }

      return {
        isValid: errors.length === 0,
        url: normalizedUrl,
        protocol: urlObj.protocol,
        domain: urlObj.hostname,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        url,
        protocol: '',
        domain: '',
        errors: [`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  async scrapeWebsite(url: string): Promise<ScrapingReport> {
    const startTime = Date.now();
    const report: ScrapingReport = {
      url,
      timestamp: new Date().toISOString(),
      success: false,
      validationResult: this.validateURL(url),
      content: null,
      errors: [],
      warnings: [],
      summary: {
        contentQuality: 'poor',
        seoScore: 0,
        accessibilityScore: 0,
        technicalIssues: [],
        recommendations: []
      }
    };

    try {
      // Validate URL first
      if (!report.validationResult.isValid) {
        report.errors.push(...report.validationResult.errors);
        return report;
      }

      report.warnings.push(...report.validationResult.warnings);

      // Add warnings to the main report
      if (report.validationResult.warnings.length > 0) {
        report.warnings.push(...report.validationResult.warnings);
      }

      // Fetch the webpage
      const fetchStartTime = Date.now();
      const response = await fetch(report.validationResult.url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      const fetchTime = Date.now() - fetchStartTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0');

      // Check content size
      if (contentLength > this.maxContentSize) {
        throw new Error(`Content too large: ${contentLength} bytes (max: ${this.maxContentSize} bytes)`);
      }

      if (!contentType.includes('text/html')) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const html = await response.text();
      const totalTime = Date.now() - startTime;

      // Parse and extract content
      const loadedCheerio = cheerio.load(html);
      const content = await this.extractContent(loadedCheerio, report.validationResult.url, response.status, fetchTime, totalTime, contentLength, contentType, html);

      report.content = content;
      report.success = true;

      // Generate summary
      report.summary = this.generateSummary(content);

    } catch (error) {
      report.errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
      report.success = false;
    }

    return report;
  }

  private async extractContent(
    $: any,
    url: string,
    statusCode: number,
    responseTime: number,
    totalTime: number,
    contentLength: number,
    contentType: string,
    html: string
  ): Promise<ScrapedContent> {
    // Remove unwanted elements
    $('script, style, noscript, iframe, footer, header, nav, aside').remove();
    $('[aria-hidden="true"], [hidden], .hidden').remove();
    $('[class*="ad"], [id*="ad"], [class*="advertisement"], [class*="banner"], [id*="banner"]').remove();
    $('.popup, .modal, .overlay, .sidebar').remove();

    // Extract basic content
    const title = $('title').first().text().trim() || $('h1').first().text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() || 
                      $('meta[property="og:description"]').attr('content')?.trim();

    // Try to get main content from semantic selectors
    let content = '';
    const mainSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '#main'
    ];

    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // Fallback to body if no main content found
    if (!content) {
      content = $('body').text();
    }

    // Clean up content
    content = content
      .replace(/\s\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Extract metadata
    const author = $('meta[name="author"]').attr('content')?.trim() ||
                   $('meta[property="article:author"]').attr('content')?.trim();
    
    const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                       $('meta[name="date"]').attr('content') ||
                       $('meta[property="datePublished"]').attr('content');

    const modifiedDate = $('meta[property="article:modified_time"]').attr('content') ||
                        $('meta[name="last-modified"]').attr('content');

    const language = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content');

    const keywords = ($('meta[name="keywords"]').attr('content')?.split(',') || [])
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    // Extract links
    const links: { internal: string[], external: string[], total: number } = {
      internal: [],
      external: [],
      total: 0
    };

    const urlDomain = new URL(url).hostname;
    $('a[href]').each((_: number, element: any) => {
      const href = $(element).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const fullUrl = new URL(href, url).href;
          const linkDomain = new URL(fullUrl).hostname;
          
          if (linkDomain === urlDomain) {
            links.internal.push(fullUrl);
          } else {
            links.external.push(fullUrl);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
    links.total = links.internal.length + links.external.length;

    // Extract images
    const images: Array<{ src: string; alt?: string; title?: string }> = [];
    $('img[src]').each((_: number, element: any) => {
      const src = $(element).attr('src');
      if (src) {
        try {
          const fullSrc = new URL(src, url).href;
          images.push({
            src: fullSrc,
            alt: $(element).attr('alt')?.trim(),
            title: $(element).attr('title')?.trim()
          });
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });

    // Extract social media metadata
    const openGraph: Record<string, string> = {};
    $('meta[property^="og:"]').each((_: number, element: any) => {
      const property = $(element).attr('property');
      const content = $(element).attr('content');
      if (property && content) {
        openGraph[property] = content;
      }
    });

    const twitterCard: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_: number, element: any) => {
      const name = $(element).attr('name');
      const content = $(element).attr('content');
      if (name && content) {
        twitterCard[name] = content;
      }
    });

    // Extract headings
    const headings = {
      h1: $('h1').map((_: number, el: any) => $(el).text().trim()).get(),
      h2: $('h2').map((_: number, el: any) => $(el).text().trim()).get(),
      h3: $('h3').map((_: number, el: any) => $(el).text().trim()).get(),
      h4: $('h4').map((_: number, el: any) => $(el).text().trim()).get(),
      h5: $('h5').map((_: number, el: any) => $(el).text().trim()).get(),
      h6: $('h6').map((_: number, el: any) => $(el).text().trim()).get(),
    };

    const structure = {
      headings,
      paragraphs: $('p').length,
      lists: $('ul, ol').length,
      tables: $('table').length,
      forms: $('form').length
    };

    // Performance metrics
    const resources = $('link, script, img, video, audio').length;
    const hasLazyLoading = $('img[loading="lazy"], iframe[loading="lazy"]').length > 0;
    const hasCDN = /cdn|cloudflare|jsdelivr|unpkg/i.test(html) || 
                  /(\.cloudfront\.net|\.fastly\.net|\.jsdelivr\.net)/i.test(html);

    const performance = {
      loadTime: totalTime,
      resourceCount: resources,
      hasLazyLoading,
      hasCDN
    };

    // Extract charset
    const charset = $('meta[charset]').attr('charset') || 
                   /charset=([^;]+)/i.exec(contentType)?.[1];

    return {
      url,
      title,
      description,
      content,
      metadata: {
        author,
        publishDate,
        modifiedDate,
        language,
        keywords,
        wordCount,
        readingTime
      },
      links,
      images,
      social: {
        openGraph,
        twitterCard
      },
      technical: {
        statusCode,
        responseTime,
        contentType,
        size: contentLength,
        charset
      },
      structure,
      performance
    };
  }

  private generateSummary(content: ScrapedContent): ScrapingReport['summary'] {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let seoScore = 100;
    let accessibilityScore = 100;

    // Content quality assessment
    let contentQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    
    if (content.metadata.wordCount < 100) {
      contentQuality = 'poor';
      issues.push('Content is too short');
      recommendations.push('Add more substantive content (minimum 300 words recommended)');
    } else if (content.metadata.wordCount < 300) {
      contentQuality = 'fair';
      issues.push('Content could be more comprehensive');
      recommendations.push('Consider expanding the content to provide more value');
    } else if (content.metadata.wordCount < 600) {
      contentQuality = 'good';
    }

    // SEO Analysis
    if (!content.title) {
      seoScore -= 20;
      issues.push('Missing page title');
      recommendations.push('Add a descriptive title tag');
    } else if (content.title.length > 60) {
      seoScore -= 10;
      issues.push('Title too long for SEO');
      recommendations.push('Keep title under 60 characters for optimal display');
    }

    if (!content.description) {
      seoScore -= 15;
      issues.push('Missing meta description');
      recommendations.push('Add a compelling meta description (150-160 characters)');
    } else if (content.description.length > 160) {
      seoScore -= 5;
      issues.push('Meta description too long');
      recommendations.push('Keep meta description under 160 characters');
    }

    if (content.structure.headings.h1.length === 0) {
      seoScore -= 15;
      issues.push('Missing H1 tag');
      recommendations.push('Add a single H1 tag for the main topic');
    } else if (content.structure.headings.h1.length > 1) {
      seoScore -= 10;
      issues.push('Multiple H1 tags');
      recommendations.push('Use only one H1 tag per page');
    }

    if (content.images.length > 0) {
      const imagesWithoutAlt = content.images.filter(img => !img.alt).length;
      if (imagesWithoutAlt > 0) {
        seoScore -= Math.min(15, imagesWithoutAlt * 2);
        issues.push(`${imagesWithoutAlt} images missing alt text`);
        recommendations.push('Add descriptive alt text to all images');
      }
    }

    // Accessibility Analysis
    if (!content.metadata.language) {
      accessibilityScore -= 10;
      issues.push('Missing language attribute');
      recommendations.push('Add lang attribute to html tag');
    }

    if (content.structure.headings.h1.length > 1) {
      accessibilityScore -= 10;
      issues.push('Multiple H1 tags affect accessibility');
    }

    if (!content.performance.hasLazyLoading && content.images.length > 5) {
      accessibilityScore -= 5;
      issues.push('Consider lazy loading for better performance');
    }

    // Technical issues
    if (content.technical.statusCode >= 400) {
      issues.push(`HTTP Error: ${content.technical.statusCode}`);
    }

    if (content.technical.responseTime > 5000) {
      issues.push('Slow response time');
      recommendations.push('Optimize server response time');
    }

    if (!content.performance.hasCDN) {
      recommendations.push('Consider using a CDN for better performance');
    }

    return {
      contentQuality,
      seoScore: Math.max(0, seoScore),
      accessibilityScore: Math.max(0, accessibilityScore),
      technicalIssues: issues,
      recommendations
    };
  }

  async scrapeMultipleWebsites(urls: string[]): Promise<ScrapingReport[]> {
    const reports: ScrapingReport[] = [];
    
    // Process URLs in parallel with concurrency limit
    const concurrencyLimit = 5;
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
      const batch = urls.slice(i, i + concurrencyLimit);
      const batchReports = await Promise.all(
        batch.map(url => this.scrapeWebsite(url))
      );
      reports.push(...batchReports);
    }

    return reports;
  }

  generateReportSummary(reports: ScrapingReport[]): {
    totalSites: number;
    successful: number;
    failed: number;
    averageSeoScore: number;
    averageAccessibilityScore: number;
    commonIssues: string[];
    overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const successful = reports.filter(r => r.success).length;
    const failed = reports.filter(r => !r.success).length;
    
    const successfulReports = reports.filter(r => r.success && r.content);
    const averageSeoScore = successfulReports.length > 0 
      ? successfulReports.reduce((sum, r) => sum + r.summary.seoScore, 0) / successfulReports.length 
      : 0;
    const averageAccessibilityScore = successfulReports.length > 0
      ? successfulReports.reduce((sum, r) => sum + r.summary.accessibilityScore, 0) / successfulReports.length
      : 0;

    // Find common issues
    const issueFrequency: Record<string, number> = {};
    successfulReports.forEach(report => {
      report.summary.technicalIssues.forEach(issue => {
        issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
      });
    });

    const commonIssues = Object.entries(issueFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue);

    // Overall quality assessment
    let overallQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    const avgScore = (averageSeoScore + averageAccessibilityScore) / 2;
    
    if (avgScore < 60) overallQuality = 'poor';
    else if (avgScore < 75) overallQuality = 'fair';
    else if (avgScore < 90) overallQuality = 'good';

    return {
      totalSites: reports.length,
      successful,
      failed,
      averageSeoScore,
      averageAccessibilityScore,
      commonIssues,
      overallQuality
    };
  }

  async analyzeURLWithAI(url: string, content: ScrapedContent): Promise<EnhancedAnalysis> {
    const analysis: EnhancedAnalysis = {
      credibilityScore: 0,
      relevanceScore: 0,
      keyInsights: [],
      researchValue: 'low',
      suggestedTags: [],
      relatedTopics: [],
      sourceType: 'other',
      readingDifficulty: 'medium',
      biasAnalysis: {
        politicalLean: 'unknown',
        biasLevel: 'medium',
        emotionalTone: 'neutral',
        objectivityScore: 50
      },
      factCheckResults: {
        claims: [],
        verifiability: 'low',
        sourcesMentioned: 0,
        citationsFound: false
      },
      contentQuality: {
        depthScore: 0,
        accuracyScore: 0,
        uniquenessScore: 0,
        timestamp: new Date().toISOString()
      },
      recommendations: []
    };

    // 1. Determine source type
    analysis.sourceType = this.determineSourceType(content, url);

    // 2. Calculate credibility score
    analysis.credibilityScore = this.calculateCredibilityScore(content, url);

    // 3. Analyze reading difficulty
    analysis.readingDifficulty = this.analyzeReadingDifficulty(content);

    // 4. Extract key insights
    analysis.keyInsights = this.extractKeyInsights(content);

    // 5. Determine research value
    analysis.researchValue = this.determineResearchValue(content, analysis);

    // 6. Generate suggested tags
    analysis.suggestedTags = this.generateSuggestedTags(content, analysis);

    // 7. Find related topics
    analysis.relatedTopics = this.generateRelatedTopics(content);

    // 8. Perform bias analysis
    analysis.biasAnalysis = this.analyzeBias(content);

    // 9. Check for fact-checking elements
    analysis.factCheckResults = this.analyzeFactChecking(content);

    // 10. Calculate content quality scores
    analysis.contentQuality = this.calculateContentQuality(content);

    // 11. Generate recommendations
    analysis.recommendations = this.generateRecommendations(content, analysis);

    return analysis;
  }

  private determineSourceType(content: ScrapedContent, url: string): EnhancedAnalysis['sourceType'] {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Government sources
    if (domain.includes('.gov') || domain.includes('.edu')) {
      return 'government';
    }
    
    // Academic sources
    if (domain.includes('.edu') || domain.includes('academic') || domain.includes('journal') || 
        domain.includes('research') || content.metadata.author?.includes('PhD') ||
        content.metadata.author?.includes('Dr.')) {
      return 'academic';
    }
    
    // News sources
    if (domain.includes('news') || domain.includes('times') || domain.includes('post') ||
        domain.includes('herald') || domain.includes('tribune') || domain.includes('gazette') ||
        content.social.openGraph.type === 'article') {
      return 'news';
    }
    
    // Documentation
    if (domain.includes('docs') || domain.includes('documentation') || domain.includes('dev') ||
        content.structure.headings.h1.some(h => h.toLowerCase().includes('documentation'))) {
      return 'documentation';
    }
    
    // E-commerce
    if (domain.includes('shop') || domain.includes('store') || domain.includes('amazon') ||
        domain.includes('ebay') || content.social.openGraph.type === 'product') {
      return 'ecommerce';
    }
    
    // Blog
    if (domain.includes('blog') || domain.includes('medium') || domain.includes('substack') ||
        content.metadata.author && !domain.includes('news')) {
      return 'blog';
    }
    
    return 'other';
  }

  private calculateCredibilityScore(content: ScrapedContent, url: string): number {
    let score = 50; // Base score
    
    const domain = new URL(url).hostname.toLowerCase();
    
    // Domain reputation (+20 for reputable sources)
    if (domain.includes('.gov') || domain.includes('.edu')) {
      score += 25;
    } else if (domain.includes('.org')) {
      score += 15;
    } else if (this.isReputableNewsSource(domain)) {
      score += 20;
    }
    
    // Author information (+15)
    if (content.metadata.author) {
      score += 15;
    }
    
    // Publication date (+10)
    if (content.metadata.publishDate) {
      const publishDate = new Date(content.metadata.publishDate);
      const now = new Date();
      const daysDiff = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 30) score += 10;
      else if (daysDiff <= 365) score += 5;
    }
    
    // Content quality indicators (+20)
    if (content.metadata.wordCount > 1000) score += 10;
    if (content.structure.headings.h2.length > 3) score += 5;
    if (content.links.external.length > 5) score += 5;
    
    // Citations and references (+15)
    const hasCitations = this.hasCitations(content);
    if (hasCitations) score += 15;
    
    // Technical quality (-10 for poor technical aspects)
    if (content.technical.statusCode >= 400) score -= 10;
    if (content.technical.responseTime > 5000) score -= 5;
    
    // Deductions for potential issues
    if (domain.includes('spam') || this.hasSpamIndicators(content)) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private isReputableNewsSource(domain: string): boolean {
    const reputableSources = [
      'bbc', 'cnn', 'reuters', 'ap', 'npr', 'wsj', 'nytimes', 'washingtonpost',
      'theguardian', 'economist', 'bloomberg', 'associatedpress'
    ];
    
    return reputableSources.some(source => domain.includes(source));
  }

  private hasCitations(content: ScrapedContent): boolean {
    const citationPatterns = [
      /\[\d+\]/g, // [1], [2], etc.
      /\(\d{4}\)/g, // (2023), (2022), etc.
      /https?:\/\/[^\s]+/g, // URLs in content
      /doi:/gi, // DOI references
      /source:/gi,
      /reference:/gi
    ];
    
    return citationPatterns.some(pattern => pattern.test(content.content));
  }

  private hasSpamIndicators(content: ScrapedContent): boolean {
    const spamKeywords = ['click here', 'buy now', 'limited time', 'act now', 'free money'];
    const contentLower = content.content.toLowerCase();
    
    return spamKeywords.some(keyword => contentLower.includes(keyword)) ||
           content.content.length < 100 ||
           (content.metadata.wordCount > 0 && content.metadata.wordCount < 50);
  }

  private analyzeReadingDifficulty(content: ScrapedContent): EnhancedAnalysis['readingDifficulty'] {
    const { content: text, metadata } = content;
    
    // Simple readability analysis based on average sentence length and word complexity
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    
    // Count complex words (more than 6 characters)
    const words = text.split(/\s+/);
    const complexWords = words.filter(word => word.length > 6).length;
    const complexWordRatio = complexWords / words.length;
    
    if (avgSentenceLength < 15 && complexWordRatio < 0.15) {
      return 'easy';
    } else if (avgSentenceLength < 25 && complexWordRatio < 0.25) {
      return 'medium';
    } else {
      return 'hard';
    }
  }

  private extractKeyInsights(content: ScrapedContent): string[] {
    const insights: string[] = [];
    const { content: text, structure } = content;
    
    // Extract from headings
    structure.headings.h1.forEach(h1 => {
      if (h1.length > 10 && h1.length < 100) {
        insights.push(h1);
      }
    });
    
    structure.headings.h2.slice(0, 3).forEach(h2 => {
      if (h2.length > 10 && h2.length < 100) {
        insights.push(h2);
      }
    });
    
    // Extract sentences with key indicators
    const sentences = text.split(/[.!?]+/);
    const keySentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return (lower.includes('important') || lower.includes('key') || 
              lower.includes('significant') || lower.includes('critical') ||
              lower.includes('essential') || lower.includes('main')) &&
             sentence.length > 20 && sentence.length < 200;
    });
    
    insights.push(...keySentences.slice(0, 2));
    
    return insights.slice(0, 5); // Return top 5 insights
  }

  private determineResearchValue(content: ScrapedContent, analysis: Partial<EnhancedAnalysis>): EnhancedAnalysis['researchValue'] {
    let score = 0;
    
    // Source type value
    const sourceTypeScores = {
      academic: 30,
      government: 25,
      news: 20,
      documentation: 15,
      blog: 10,
      ecommerce: 5,
      other: 5
    };
    
    score += sourceTypeScores[analysis.sourceType || 'other'];
    
    // Credibility impact
    score += (analysis.credibilityScore || 0) / 4;
    
    // Content depth
    if (content.metadata.wordCount > 2000) score += 20;
    else if (content.metadata.wordCount > 1000) score += 10;
    else if (content.metadata.wordCount > 500) score += 5;
    
    // Structure and organization
    if (content.structure.headings.h2.length > 5) score += 10;
    if (content.structure.headings.h3.length > 10) score += 5;
    if (content.links.external.length > 10) score += 5;
    
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  private generateSuggestedTags(content: ScrapedContent, analysis: Partial<EnhancedAnalysis>): string[] {
    const tags: string[] = [];
    
    // Source type tag
    tags.push(analysis.sourceType || 'general');
    
    // From existing keywords
    if (content.metadata.keywords) {
      tags.push(...content.metadata.keywords.slice(0, 3));
    }
    
    // From headings
    const headingTexts = [
      ...content.structure.headings.h1,
      ...content.structure.headings.h2.slice(0, 3)
    ];
    
    headingTexts.forEach(heading => {
      const words = heading.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4 && !tags.includes(word) && tags.length < 10) {
          tags.push(word);
        }
      });
    });
    
    // Content analysis tags
    if (content.metadata.wordCount > 1000) tags.push('in-depth');
    if (content.images.length > 5) tags.push('visual');
    if (this.hasCitations(content)) tags.push('researched');
    
    return tags.slice(0, 8);
  }

  private generateRelatedTopics(content: ScrapedContent): string[] {
    const topics: string[] = [];
    const { content: text, metadata } = content;
    
    // Extract common noun phrases (simplified)
    const sentences = text.split(/[.!?]+/);
    const phrases: string[] = [];
    
    sentences.forEach(sentence => {
      const words = sentence.split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`.toLowerCase();
        if (phrase.length > 8 && phrase.length < 30 && !phrases.includes(phrase)) {
          phrases.push(phrase);
        }
      }
    });
    
    // Return most common phrases as topics
    return phrases.slice(0, 5);
  }

  private analyzeBias(content: ScrapedContent): EnhancedAnalysis['biasAnalysis'] {
    const analysis = {
      politicalLean: 'unknown' as 'left' | 'center' | 'right' | 'unknown',
      biasLevel: 'medium' as 'low' | 'medium' | 'high',
      emotionalTone: 'neutral' as 'neutral' | 'positive' | 'negative',
      objectivityScore: 50
    };
    
    const text = content.content.toLowerCase();
    
    // Political lean detection (simplified)
    const leftIndicators = ['progressive', 'liberal', 'democrat', 'equality', 'social justice'];
    const rightIndicators = ['conservative', 'republican', 'traditional', 'free market', 'individual rights'];
    
    let leftScore = 0;
    let rightScore = 0;
    
    leftIndicators.forEach(indicator => {
      if (text.includes(indicator)) leftScore++;
    });
    
    rightIndicators.forEach(indicator => {
      if (text.includes(indicator)) rightScore++;
    });
    
    if (leftScore > rightScore + 2) analysis.politicalLean = 'left';
    else if (rightScore > leftScore + 2) analysis.politicalLean = 'right';
    else if (Math.abs(leftScore - rightScore) <= 2) analysis.politicalLean = 'center';
    
    // Emotional tone
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting', 'disappointing'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) positiveCount += matches.length;
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) negativeCount += matches.length;
    });
    
    if (positiveCount > negativeCount * 1.5) analysis.emotionalTone = 'positive';
    else if (negativeCount > positiveCount * 1.5) analysis.emotionalTone = 'negative';
    
    // Objectivity score based on emotional words and opinion indicators
    const opinionWords = ['think', 'believe', 'feel', 'opinion', 'subjectively'];
    const factWords = ['according to', 'research shows', 'data indicates', 'evidence suggests'];
    
    let opinionCount = 0;
    let factCount = 0;
    
    opinionWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) opinionCount += matches.length;
    });
    
    factWords.forEach(phrase => {
      const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) factCount += matches.length;
    });
    
    const totalOpinionAndFact = opinionCount + factCount;
    if (totalOpinionAndFact > 0) {
      analysis.objectivityScore = Math.max(0, Math.min(100, (factCount / totalOpinionAndFact) * 100));
    }
    
    return analysis;
  }

  private analyzeFactChecking(content: ScrapedContent): EnhancedAnalysis['factCheckResults'] {
    const results = {
      claims: [] as string[],
      verifiability: 'low' as 'high' | 'medium' | 'low',
      sourcesMentioned: 0,
      citationsFound: false
    };
    
    // Count external links as potential sources
    results.sourcesMentioned = content.links.external.length;
    
    // Check for citations
    results.citationsFound = this.hasCitations(content);
    
    // Extract potential claims (sentences with numbers, statistics, or strong statements)
    const sentences = content.content.split(/[.!?]+/);
    const claims = sentences.filter(sentence => {
      const hasNumber = /\d+/.test(sentence);
      const hasStrongStatement = /\b(all|every|always|never|proven|guaranteed|certainly)\b/i.test(sentence);
      const hasPercentage = /\d+%/.test(sentence);
      
      return (hasNumber || hasPercentage || hasStrongStatement) && 
             sentence.length > 20 && sentence.length < 200;
    });
    
    results.claims = claims.slice(0, 5);
    
    // Determine verifiability based on sources and citations
    if (results.citationsFound && results.sourcesMentioned >= 3) {
      results.verifiability = 'high';
    } else if (results.sourcesMentioned >= 1 || results.citationsFound) {
      results.verifiability = 'medium';
    }
    
    return results;
  }

  private calculateContentQuality(content: ScrapedContent): EnhancedAnalysis['contentQuality'] {
    const quality = {
      depthScore: 0,
      accuracyScore: 0,
      uniquenessScore: 0,
      timestamp: new Date().toISOString()
    };
    
    // Depth score based on content length and structure
    let depthScore = 0;
    if (content.metadata.wordCount > 2000) depthScore += 30;
    else if (content.metadata.wordCount > 1000) depthScore += 20;
    else if (content.metadata.wordCount > 500) depthScore += 10;
    
    if (content.structure.headings.h2.length > 5) depthScore += 20;
    else if (content.structure.headings.h2.length > 2) depthScore += 10;
    
    if (content.structure.headings.h3.length > 10) depthScore += 15;
    else if (content.structure.headings.h3.length > 5) depthScore += 8;
    
    if (content.structure.lists > 3) depthScore += 10;
    if (content.structure.tables > 1) depthScore += 10;
    if (content.images.length > 3) depthScore += 5;
    
    quality.depthScore = Math.min(100, depthScore);
    
    // Accuracy score (simplified - based on citations and source quality)
    let accuracyScore = 50; // Base score
    if (this.hasCitations(content)) accuracyScore += 30;
    if (content.metadata.author) accuracyScore += 10;
    if (content.metadata.publishDate) accuracyScore += 10;
    
    quality.accuracyScore = Math.min(100, accuracyScore);
    
    // Uniqueness score (simplified - based on structure diversity)
    let uniquenessScore = 50; // Base score
    const uniqueElements = [
      content.structure.headings.h2.length > 0,
      content.structure.headings.h3.length > 0,
      content.structure.lists > 0,
      content.structure.tables > 0,
      content.images.length > 0,
      content.links.external.length > 0
    ];
    
    const uniqueCount = uniqueElements.filter(Boolean).length;
    uniquenessScore += uniqueCount * 8;
    
    quality.uniquenessScore = Math.min(100, uniquenessScore);
    
    return quality;
  }

  private generateRecommendations(content: ScrapedContent, analysis: Partial<EnhancedAnalysis>): string[] {
    const recommendations: string[] = [];
    
    // Content recommendations
    if (content.metadata.wordCount < 300) {
      recommendations.push('Consider expanding the content for better research value');
    }
    
    if (content.structure.headings.h2.length === 0) {
      recommendations.push('Add section headings to improve structure');
    }
    
    if (!this.hasCitations(content) && (analysis.sourceType === 'academic' || analysis.sourceType === 'news')) {
      recommendations.push('Add citations and references to improve credibility');
    }
    
    if (!content.metadata.author) {
      recommendations.push('Consider adding author information for transparency');
    }
    
    if (!content.metadata.publishDate) {
      recommendations.push('Add publication date to help assess recency');
    }
    
    // Technical recommendations
    if (content.images.filter(img => !img.alt).length > 0) {
      recommendations.push('Add alt text to images for better accessibility');
    }
    
    if (content.technical.responseTime > 3000) {
      recommendations.push('Optimize page load time for better user experience');
    }
    
    // Bias and objectivity recommendations
    if (analysis.biasAnalysis?.objectivityScore && analysis.biasAnalysis.objectivityScore < 60) {
      recommendations.push('Consider adding more factual evidence and data to improve objectivity');
    }
    
    if (analysis.biasAnalysis?.emotionalTone !== 'neutral') {
      recommendations.push('Consider using more neutral language for better balance');
    }
    
    return recommendations;
  }
}