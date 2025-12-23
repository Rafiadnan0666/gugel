import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

interface ExportSection {
  title: string;
  content: string;
  type: 'introduction' | 'main' | 'conclusion' | 'references' | 'appendix';
  ai_enhanced: boolean;
  word_count: number;
  processing_time?: number;
}

interface BatchAIProcessingResult {
  sections: ExportSection[];
  total_processing_time: number;
  success_rate: number;
  ai_enhanced_sections: number;
  recommendations: string[];
}

export async function POST(request: Request) {
  const { 
    content, 
    template = 'comprehensive',
    includeSources = false,
    sources = [],
    batchProcessing = false,
    plagiarismCheck = false,
    sections = []
  } = await request.json();

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ 
      error: 'Content is required and must be a string' 
    }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startTime = Date.now();
    let processedContent = content;
    let plagiarismResult = null;
    let batchResults = null;

    // Step 1: Batch AI Processing if enabled
    if (batchProcessing && sections.length > 0) {
      batchResults = await processContentInBatches(sections);
      processedContent = batchResults.sections.map(section => 
        `## ${section.title}\n\n${section.content}`
      ).join('\n\n');
    }

    // Step 2: Plagiarism Check if enabled
    if (plagiarismCheck) {
      const plagiarismResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/plagiarism`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: processedContent })
      });

      if (plagiarismResponse.ok) {
        const plagiarismData = await plagiarismResponse.json();
        plagiarismResult = plagiarismData.result;
      }
    }

    // Step 3: Apply template formatting
    const formattedContent = applyTemplate(processedContent, template, sources, includeSources);

    // Step 4: Generate PDF
    const pdfResult = await generatePDFFromContent(formattedContent, template, user.id);

    // Step 5: Create export record
    const exportRecord = {
      user_id: user.id,
      template,
      word_count: processedContent.split(/\s+/).length,
      include_sources: includeSources,
      batch_processing: batchProcessing,
      plagiarism_check: plagiarismCheck,
      plagiarism_score: plagiarismResult?.originality_score || null,
      processing_time: Date.now() - startTime,
      created_at: new Date().toISOString()
    };

    await supabase.from('export_history').insert(exportRecord);

    return NextResponse.json({
      success: true,
      pdf_url: pdfResult.url,
      metadata: {
        template,
        word_count: processedContent.split(/\s+/).length,
        processing_time: Date.now() - startTime,
        sources_included: includeSources,
        sources_count: sources.length
      },
      analysis: {
        plagiarism: plagiarismResult,
        batch_processing: batchResults,
        template_applied: template
      }
    });

  } catch (error) {
    console.error('Export processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process export',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processContentInBatches(sections: Array<{title: string, content: string}>): Promise<BatchAIProcessingResult> {
  const startTime = Date.now();
  const processedSections: ExportSection[] = [];
  let aiEnhancedCount = 0;

  for (const section of sections) {
    const sectionStartTime = Date.now();
    
    // Process each section with AI enhancement
    const enhancedContent = await enhanceSectionWithAI(section.content, section.title);
    
    const processedSection: ExportSection = {
      title: section.title,
      content: enhancedContent.content,
      type: determineSectionType(section.title),
      ai_enhanced: enhancedContent.ai_enhanced,
      word_count: enhancedContent.content.split(/\s+/).length,
      processing_time: Date.now() - sectionStartTime
    };

    processedSections.push(processedSection);
    if (processedSection.ai_enhanced) {
      aiEnhancedCount++;
    }
  }

  const recommendations = generateBatchRecommendations(processedSections);

  return {
    sections: processedSections,
    total_processing_time: Date.now() - startTime,
    success_rate: (processedSections.filter(s => s.content.length > 50).length / processedSections.length) * 100,
    ai_enhanced_sections: aiEnhancedCount,
    recommendations
  };
}

async function enhanceSectionWithAI(content: string, title: string): Promise<{content: string, ai_enhanced: boolean}> {
  try {
    // Use AI service for enhancement
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Enhance this research section titled "${title}" for better clarity, flow, and academic quality. Improve writing style while preserving meaning and adding analytical depth. Content: ${content.substring(0, 3000)}`,
        task: 'enhance-content'
      })
    });

    if (response.ok) {
      const result = await response.json();
      return {
        content: result.result || content,
        ai_enhanced: true
      };
    }
  } catch (error) {
    console.warn('AI enhancement failed:', error);
  }

  return { content, ai_enhanced: false };
}

function determineSectionType(title: string): ExportSection['type'] {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('intro') || lowerTitle.includes('background') || lowerTitle.includes('overview')) {
    return 'introduction';
  } else if (lowerTitle.includes('conclusion') || lowerTitle.includes('summary') || lowerTitle.includes('discussion')) {
    return 'conclusion';
  } else if (lowerTitle.includes('referenc') || lowerTitle.includes('bibliograph') || lowerTitle.includes('sources')) {
    return 'references';
  } else if (lowerTitle.includes('appendix') || lowerTitle.includes('appendix')) {
    return 'appendix';
  } else {
    return 'main';
  }
}

function generateBatchRecommendations(sections: ExportSection[]): string[] {
  const recommendations: string[] = [];
  
  // Analyze section lengths
  const totalWords = sections.reduce((sum, s) => sum + s.word_count, 0);
  const avgSectionLength = totalWords / sections.length;
  
  sections.forEach(section => {
    if (section.word_count < avgSectionLength * 0.5) {
      recommendations.push(`Consider expanding the "${section.title}" section for better coverage`);
    } else if (section.word_count > avgSectionLength * 2) {
      recommendations.push(`Consider breaking down the "${section.title}" section into smaller parts`);
    }
  });

  // Check AI enhancement usage
  const aiEnhancedPercentage = (sections.filter(s => s.ai_enhanced).length / sections.length) * 100;
  if (aiEnhancedPercentage < 50) {
    recommendations.push('Consider using AI enhancement for more sections to improve overall quality');
  }

  // Section flow recommendations
  const introCount = sections.filter(s => s.type === 'introduction').length;
  const conclusionCount = sections.filter(s => s.type === 'conclusion').length;
  
  if (introCount === 0) {
    recommendations.push('Add an introduction section to provide context');
  }
  if (conclusionCount === 0) {
    recommendations.push('Add a conclusion section to summarize findings');
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}

function applyTemplate(content: string, template: string, sources: any[], includeSources: boolean): string {
  let formattedContent = '';

  switch (template) {
    case 'academic':
      formattedContent = applyAcademicTemplate(content, sources, includeSources);
      break;
    case 'research':
      formattedContent = applyResearchTemplate(content, sources, includeSources);
      break;
    case 'simple':
      formattedContent = applySimpleTemplate(content, sources, includeSources);
      break;
    default:
      formattedContent = applyComprehensiveTemplate(content, sources, includeSources);
  }

  return formattedContent;
}

function applyAcademicTemplate(content: string, sources: any[], includeSources: boolean): string {
  const timestamp = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let formatted = `ACADEMIC PAPER\n${'='.repeat(50)}\n\n`;
  formatted += `Generated: ${timestamp}\n\n`;
  formatted += `ABSTRACT\n${'-'.repeat(20)}\n`;
  formatted += extractAbstract(content) + '\n\n';
  formatted += `INTRODUCTION\n${'-'.repeat(20)}\n\n`;
  formatted += content + '\n\n';

  if (includeSources && sources.length > 0) {
    formatted += `REFERENCES\n${'-'.repeat(20)}\n\n`;
    formatted += formatAcademicReferences(sources) + '\n\n';
  }

  formatted += `APPENDIX\n${'-'.repeat(20)}\n\n`;
  formatted += `Document Statistics:\n`;
  formatted += `- Word Count: ${content.split(/\s+/).length}\n`;
  formatted += `- Sources: ${sources.length}\n`;
  formatted += `- Template: Academic\n`;
  formatted += `- Generated: ${timestamp}\n`;

  return formatted;
}

function applyResearchTemplate(content: string, sources: any[], includeSources: boolean): string {
  const timestamp = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let formatted = `RESEARCH PAPER\n${'='.repeat(50)}\n\n`;
  formatted += `Generated: ${timestamp}\n\n`;
  formatted += `EXECUTIVE SUMMARY\n${'-'.repeat(20)}\n`;
  formatted += extractExecutiveSummary(content) + '\n\n';
  formatted += `METHODOLOGY\n${'-'.repeat(20)}\n`;
  formatted += `This research was conducted through comprehensive analysis of ${sources.length} primary and secondary sources.\n\n`;
  formatted += `FINDINGS AND ANALYSIS\n${'-'.repeat(20)}\n\n`;
  formatted += content + '\n\n';

  if (includeSources && sources.length > 0) {
    formatted += `RESEARCH SOURCES\n${'-'.repeat(20)}\n\n`;
    formatted += formatResearchSources(sources) + '\n\n';
  }

  formatted += `CONCLUSION\n${'-'.repeat(20)}\n`;
  formatted += extractConclusion(content) + '\n\n';
  formatted += `RESEARCH METADATA\n${'-'.repeat(20)}\n`;
  formatted += `- Total Words: ${content.split(/\s+/).length}\n`;
  formatted += `- Sources Analyzed: ${sources.length}\n`;
  formatted += `- Template: Research Paper\n`;
  formatted += `- Analysis Date: ${timestamp}\n`;

  return formatted;
}

function applySimpleTemplate(content: string, sources: any[], includeSources: boolean): string {
  let formatted = `Research Document\n${'='.repeat(30)}\n\n`;
  formatted += `Generated: ${new Date().toLocaleDateString()}\n\n`;
  formatted += content + '\n\n';

  if (includeSources && sources.length > 0) {
    formatted += `Sources\n${'-'.repeat(15)}\n`;
    sources.forEach((source, index) => {
      formatted += `${index + 1}. ${source.title || source.url}\n`;
    });
    formatted += '\n';
  }

  formatted += `Document Info\n${'-'.repeat(15)}\n`;
  formatted += `Word Count: ${content.split(/\s+/).length}\n`;
  formatted += `Sources: ${sources.length}\n`;

  return formatted;
}

function applyComprehensiveTemplate(content: string, sources: any[], includeSources: boolean): string {
  const timestamp = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let formatted = `COMPREHENSIVE RESEARCH REPORT\n${'='.repeat(50)}\n\n`;
  formatted += `Report Generated: ${timestamp}\n`;
  formatted += `Word Count: ${content.split(/\s+/).length}\n`;
  formatted += `Sources: ${sources.length}\n\n`;
  
  formatted += `TABLE OF CONTENTS\n${'-'.repeat(30)}\n`;
  formatted += `1. Executive Summary\n`;
  formatted += `2. Introduction\n`;
  formatted += `3. Main Analysis\n`;
  formatted += `4. Key Findings\n`;
  formatted += `5. Conclusion\n`;
  if (includeSources && sources.length > 0) {
    formatted += `6. References\n`;
    formatted += `7. Appendix\n\n`;
  }

  formatted += `EXECUTIVE SUMMARY\n${'-'.repeat(30)}\n`;
  formatted += extractExecutiveSummary(content) + '\n\n';
  
  formatted += `INTRODUCTION\n${'-'.repeat(30)}\n`;
  formatted += extractIntroduction(content) + '\n\n';
  
  formatted += `MAIN ANALYSIS\n${'-'.repeat(30)}\n\n`;
  formatted += content + '\n\n';
  
  formatted += `KEY FINDINGS\n${'-'.repeat(30)}\n`;
  formatted += extractKeyFindings(content) + '\n\n';
  
  formatted += `CONCLUSION\n${'-'.repeat(30)}\n`;
  formatted += extractConclusion(content) + '\n\n';

  if (includeSources && sources.length > 0) {
    formatted += `REFERENCES\n${'-'.repeat(30)}\n\n`;
    formatted += formatComprehensiveReferences(sources) + '\n\n';
    
    formatted += `APPENDIX\n${'-'.repeat(30)}\n\n`;
    formatted += `Source Details:\n`;
    sources.forEach((source, index) => {
      formatted += `\nSource ${index + 1}:\n`;
      formatted += `- Title: ${source.title || 'Untitled'}\n`;
      formatted += `- URL: ${source.url}\n`;
      if (source.content) {
        formatted += `- Summary: ${source.content.substring(0, 200)}...\n`;
      }
    });
  }

  return formatted;
}

// Helper functions for content extraction
function extractAbstract(content: string): string {
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, 3).join(' ');
}

function extractExecutiveSummary(content: string): string {
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, 5).join(' ');
}

function extractIntroduction(content: string): string {
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, 7).join(' ');
}

function extractKeyFindings(content: string): string {
  // Look for sentences with indicators of findings
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(-8, -3).join(' ');
}

function extractConclusion(content: string): string {
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(-3).join(' ');
}

// Reference formatting functions
function formatAcademicReferences(sources: any[]): string {
  return sources.map((source, index) => {
    const year = source.publish_date ? new Date(source.publish_date).getFullYear() : 'n.d.';
    return `${index + 1}. ${source.author || 'Unknown Author'}. (${year}). "${source.title}". Retrieved from ${source.url}`;
  }).join('\n');
}

function formatResearchSources(sources: any[]): string {
  return sources.map((source, index) => {
    return `${index + 1}. ${source.title || 'Untitled Source'}\n   URL: ${source.url}\n   Added: ${source.created_at || 'Unknown date'}\n`;
  }).join('\n\n');
}

function formatComprehensiveReferences(sources: any[]): string {
  return sources.map((source, index) => {
    return `[${index + 1}] ${source.title || 'Untitled'}\n    ${source.url}\n    ${source.author ? `Author: ${source.author}` : ''}`;
  }).join('\n\n');
}

// PDF generation function (placeholder - would use a real PDF library)
async function generatePDFFromContent(content: string, template: string, userId: string): Promise<{url: string, size: number}> {
  // This would use a library like puppeteer, jsPDF, or a PDF generation service
  // For now, we'll simulate PDF generation
  
  const pdfUrl = `exports/${userId}/${Date.now()}-${template}.pdf`;
  const size = content.length; // Approximate size in bytes
  
  // In a real implementation:
  // 1. Generate PDF using a library
  // 2. Save to cloud storage
  // 3. Return the URL
  
  return {
    url: pdfUrl,
    size
  };
}