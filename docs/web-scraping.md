# Enhanced Web Scraping and Crawling System

This document describes the enhanced web scraping and crawling capabilities implemented in the application.

## Overview

The new web scraping system provides comprehensive, accurate, and robust website analysis with advanced features including:

- **URL Validation**: Pre-scraping validation with detailed error reporting
- **Comprehensive Data Extraction**: Extracts content, metadata, links, images, social media tags
- **SEO Analysis**: Automated SEO scoring and recommendations
- **Accessibility Assessment**: Accessibility scoring and improvement suggestions
- **Performance Metrics**: Response time, resource analysis, CDN detection
- **Error Handling**: Robust error handling with detailed reporting
- **Batch Processing**: Support for multiple URL scraping with concurrency control

## Core Components

### WebScraper Class (`/src/lib/web-scraper.ts`)

The main engine that handles all web scraping operations.

#### Key Features:

1. **URL Validation**:
   - Protocol validation (HTTP/HTTPS)
   - Domain name checking
   - Format normalization
   - Warning detection (localhost, etc.)

2. **Content Extraction**:
   - Smart content detection (article, main, content areas)
   - Metadata extraction (author, dates, language, keywords)
   - Social media tags (Open Graph, Twitter Cards)
   - Structured data (headings, lists, tables)

3. **Analysis Features**:
   - SEO scoring (0-100)
   - Accessibility scoring (0-100)
   - Content quality assessment
   - Performance analysis
   - Link analysis (internal/external)

4. **Technical Features**:
   - 30-second timeout protection
   - 10MB content size limit
   - Proper User-Agent headers
   - Concurrency control for batch operations

## API Endpoints

### 1. `/api/scrape` - Main Scraping Endpoint

#### POST Methods:

**Single URL Scraping**:
```json
{
  "urls": "https://example.com",
  "task": "scrape-single"
}
```

**Multiple URLs Scraping**:
```json
{
  "urls": ["https://example.com", "https://example2.com"],
  "task": "scrape-multiple"
}
```

**URL Validation Only**:
```json
{
  "urls": ["https://example.com"],
  "task": "validate-urls"
}
```

#### GET Method:

**URL Validation**:
```
GET /api/scrape?url=https://example.com&task=validate
```

### 2. `/api/ai` - Enhanced AI Integration

The AI endpoint now supports web scraping with enhanced features:

```json
{
  "prompt": "https://example.com",
  "task": "summarize-url"
}
```

Returns comprehensive data including title, metadata, and summary.

**URL Analysis**:
```json
{
  "prompt": "https://example.com",
  "task": "analyze-url"
}
```

Returns full scraping report with SEO and accessibility analysis.

### 3. `/api/summarize` - Enhanced Summarization

Enhanced summarization with intelligent content analysis:

```json
{
  "url": "https://example.com"
}
```

Returns smart summary with metadata including word count, reading time, and author information.

### 4. `/api/proxy` - Enhanced Proxy Endpoint

Enhanced proxy with multiple format support and validation:

```
GET /api/proxy?url=https://example.com&format=html&validate=true
```

**Format Options**:
- `html` (default) - Returns HTML content
- `json` - Returns parsed JSON
- `text` - Returns plain text

**Options**:
- `validate=true` - Validates URL before fetching

## Response Formats

### Scraping Report Structure

```typescript
interface ScrapingReport {
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
```

### Scraped Content Structure

The content object includes:

- **Basic Info**: title, description, content
- **Metadata**: author, dates, language, keywords, word count, reading time
- **Links**: internal/external links analysis
- **Images**: with alt text analysis
- **Social**: Open Graph and Twitter Card tags
- **Technical**: status code, response time, content type
- **Structure**: headings hierarchy, paragraphs, lists, tables
- **Performance**: load time, resources, lazy loading, CDN usage

## Usage Examples

### Basic URL Scraping

```javascript
const response = await fetch('/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls: 'https://example.com',
    task: 'scrape-single'
  })
});

const { result } = await response.json();
console.log(result.content.title);
console.log(result.summary.seoScore);
```

### Multiple URL Analysis

```javascript
const urls = ['https://site1.com', 'https://site2.com', 'https://site3.com'];
const response = await fetch('/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls,
    task: 'scrape-multiple'
  })
});

const { result } = await response.json();
console.log(`Success rate: ${result.summary.successful}/${result.summary.totalSites}`);
console.log(`Average SEO Score: ${result.summary.averageSeoScore}`);
```

### URL Validation Only

```javascript
const response = await fetch('/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls: ['https://example.com', 'invalid-url'],
    task: 'validate-urls'
  })
});

const { result } = await response.json();
result.validations.forEach(validation => {
  console.log(`${validation.url}: ${validation.validation.isValid ? 'Valid' : 'Invalid'}`);
});
```

## Error Handling

The system provides comprehensive error handling:

### URL Validation Errors
- Invalid protocol
- Invalid domain name
- Malformed URL

### Scraping Errors
- Network timeouts (30 seconds)
- Large content (>10MB)
- Unsupported content types
- HTTP errors (4xx, 5xx)
- Network connectivity issues

### Response Format for Errors

```json
{
  "error": "Failed to fetch content from URL",
  "details": [
    "HTTP 404: Not Found",
    "Response timeout after 30000ms"
  ],
  "url": "https://example.com/not-found",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Performance Considerations

- **Concurrency**: Limited to 5 concurrent requests to prevent rate limiting
- **Timeout**: 30-second timeout per request
- **Size Limit**: 10MB maximum content size
- **Rate Limiting**: Built-in delays between batch requests

## Security Features

- **Authentication**: All endpoints require user authentication
- **Input Validation**: Comprehensive URL validation
- **Size Limits**: Protection against extremely large responses
- **Timeout Protection**: Prevents hanging requests

## Best Practices

1. **Always validate URLs** before scraping
2. **Handle errors gracefully** in your application code
3. **Use batch processing** for multiple URLs
4. **Monitor response times** and implement retry logic if needed
5. **Respect robots.txt** and website terms of service
6. **Implement rate limiting** on the client side

## Integration Notes

The web scraper integrates seamlessly with existing components:
- Works with Supabase authentication
- Compatible with existing AI services
- Maintains response format consistency
- Provides enhanced data for dashboard analytics

## Future Enhancements

Planned improvements include:
- JavaScript rendering support
- Sitemap parsing
- RSS feed extraction
- Image analysis
- Multi-language support
- Custom CSS selectors
- Webhook integration