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
}