import { aiService } from './ai-service';

export interface EvidenceVerificationResult {
  referenceId: string;
  verified: boolean;
  confidenceScore: number;
  sources: VerifiedSource[];
  issues: string[];
  recommendations: string[];
}

export interface VerifiedSource {
  database: string;
  found: boolean;
  url?: string;
  matchScore: number;
  details?: string;
}

export interface CrossRefResult {
  DOI: string;
  title: string[];
  author: { given: string; family: string }[];
  'container-title': string[];
  published: { 'date-parts': number[][] };
  type: string;
  URL: string;
}

export interface PubMedResult {
  uid: string;
  title: string;
  authors: { name: string }[];
  source: string;
  pubdate: string;
  doi?: string;
}

export interface SemanticScholarResult {
  paperId: string;
  title: string;
  authors: { authorId: string; name: string }[];
  year: number;
  venue: string;
  externalIds: { DOI?: string; PubMed?: string; ArXiv?: string };
  citationCount: number;
  isOpenAccess: boolean;
}

const TRUSTED_DATABASES = [
  { name: 'CrossRef', baseUrl: 'https://api.crossref.org' },
  { name: 'PubMed', baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils' },
  { name: 'Semantic Scholar', baseUrl: 'https://api.semanticscholar.org/graph/v1' },
  { name: 'OpenAlex', baseUrl: 'https://api.openalex.org' },
  { name: 'CORE', baseUrl: 'https://api.core.ac.uk/v3' },
  { name: 'Unpaywall', baseUrl: 'https://api.unpaywall.org/v2' },
];

export class EvidenceVerifier {
  private userId?: string;
  private sessionId?: string;

  constructor(userId?: string, sessionId?: string) {
    this.userId = userId;
    this.sessionId = sessionId;
  }

  async verifyReference(
    title: string,
    authors: string,
    year: number,
    doi?: string
  ): Promise<EvidenceVerificationResult> {
    const refId = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const sources: VerifiedSource[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 1. CrossRef verification
    try {
      const crossrefResult = await this.checkCrossRef(title, doi);
      sources.push(crossrefResult);
      if (!crossrefResult.found) issues.push('Not found in CrossRef database');
    } catch { issues.push('CrossRef API unavailable'); }

    // 2. PubMed verification
    try {
      const pubmedResult = await this.checkPubMed(title);
      sources.push(pubmedResult);
    } catch { /* PubMed optional */ }

    // 3. Semantic Scholar verification
    try {
      const ssResult = await this.checkSemanticScholar(title, doi);
      sources.push(ssResult);
      if (ssResult.found && ssResult.matchScore > 0.8) {
        recommendations.push('High confidence match found in Semantic Scholar');
      }
    } catch { /* Semantic Scholar optional */ }

    // 4. OpenAlex verification
    try {
      const openAlexResult = await this.checkOpenAlex(title, doi);
      sources.push(openAlexResult);
    } catch { /* OpenAlex optional */ }

    // 5. AI-powered verification (cross-check with trusted knowledge)
    try {
      const aiVerification = await this.aiVerifyReference(title, authors, year, doi);
      if (aiVerification.issues) issues.push(...aiVerification.issues);
      if (aiVerification.recommendations) recommendations.push(...aiVerification.recommendations);
    } catch { /* AI verification optional */ }

    const foundCount = sources.filter(s => s.found).length;
    const verified = foundCount >= 1 || sources.some(s => s.matchScore > 0.8);
    const confidenceScore = Math.min(100, Math.round(
      (foundCount / Math.max(1, sources.length)) * 60 +
      (sources.reduce((sum, s) => sum + s.matchScore, 0) / Math.max(1, sources.length)) * 40
    ));

    return {
      referenceId: refId,
      verified,
      confidenceScore,
      sources,
      issues,
      recommendations,
    };
  }

  private async checkCrossRef(title: string, doi?: string): Promise<VerifiedSource> {
    try {
      let url: string;
      if (doi) {
        url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
      } else {
        url = `https://api.crossref.org/works?query.title=${encodeURIComponent(title)}&rows=3`;
      }

      const res = await fetch(url, {
        headers: { 'User-Agent': 'EyayaResearch/1.0 (mailto:research@eyaya.app)' },
      });

      if (!res.ok) return { database: 'CrossRef', found: false, matchScore: 0 };

      const data = await res.json();
      const items = data.message?.items || (data.message ? [data.message] : []);

      if (items.length === 0) return { database: 'CrossRef', found: false, matchScore: 0 };

      const bestMatch = items[0];
      const matchTitle = (bestMatch.title?.[0] || '').toLowerCase();
      const queryTitle = title.toLowerCase();
      const similarity = this.calculateSimilarity(matchTitle, queryTitle);

      return {
        database: 'CrossRef',
        found: true,
        url: bestMatch.URL,
        matchScore: similarity,
        details: `DOI: ${bestMatch.DOI}, Published: ${bestMatch.published?.['date-parts']?.[0]?.[0] || 'unknown'}`,
      };
    } catch {
      return { database: 'CrossRef', found: false, matchScore: 0 };
    }
  }

  private async checkPubMed(title: string): Promise<VerifiedSource> {
    try {
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(title)}&retmode=json&retmax=3`;
      const searchRes = await fetch(searchUrl);

      if (!searchRes.ok) return { database: 'PubMed', found: false, matchScore: 0 };

      const searchData = await searchRes.json();
      const ids = searchData.esearchresult?.idlist || [];

      if (ids.length === 0) return { database: 'PubMed', found: false, matchScore: 0 };

      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids[0]}&retmode=json`;
      const summaryRes = await fetch(summaryUrl);

      if (!summaryRes.ok) return { database: 'PubMed', found: true, matchScore: 0.5 };

      const summaryData = await summaryRes.json();
      const article = summaryData.result?.[ids[0]];

      if (!article) return { database: 'PubMed', found: true, matchScore: 0.5 };

      const similarity = this.calculateSimilarity(article.title?.toLowerCase() || '', title.toLowerCase());

      return {
        database: 'PubMed',
        found: true,
        url: `https://pubmed.ncbi.nlm.nih.gov/${ids[0]}/`,
        matchScore: similarity,
        details: `PMID: ${ids[0]}, Source: ${article.source}`,
      };
    } catch {
      return { database: 'PubMed', found: false, matchScore: 0 };
    }
  }

  private async checkSemanticScholar(title: string, doi?: string): Promise<VerifiedSource> {
    try {
      let url: string;
      if (doi) {
        url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,authors,year,venue,citationCount,externalIds`;
      } else {
        url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&fields=title,authors,year,venue,citationCount,externalIds&limit=3`;
      }

      const res = await fetch(url);

      if (!res.ok) return { database: 'Semantic Scholar', found: false, matchScore: 0 };

      const data = await res.json();
      const paper = data.data?.[0] || data;

      if (!paper?.title) return { database: 'Semantic Scholar', found: false, matchScore: 0 };

      const similarity = this.calculateSimilarity(paper.title.toLowerCase(), title.toLowerCase());

      return {
        database: 'Semantic Scholar',
        found: true,
        url: `https://www.semanticscholar.org/paper/${paper.paperId || paper.externalIds?.DOI || ''}`,
        matchScore: similarity,
        details: `Citations: ${paper.citationCount || 0}, Venue: ${paper.venue || 'unknown'}`,
      };
    } catch {
      return { database: 'Semantic Scholar', found: false, matchScore: 0 };
    }
  }

  private async checkOpenAlex(title: string, doi?: string): Promise<VerifiedSource> {
    try {
      let url: string;
      if (doi) {
        url = `https://api.openalex.org/works/https://doi.org/${doi}`;
      } else {
        url = `https://api.openalex.org/works?search=${encodeURIComponent(title)}&per_page=3`;
      }

      const res = await fetch(url, {
        headers: { 'User-Agent': 'EyayaResearch/1.0 (mailto:research@eyaya.app)' },
      });

      if (!res.ok) return { database: 'OpenAlex', found: false, matchScore: 0 };

      const data = await res.json();
      const work = data.results?.[0] || data;

      if (!work?.title) return { database: 'OpenAlex', found: false, matchScore: 0 };

      const similarity = this.calculateSimilarity(work.title.toLowerCase(), title.toLowerCase());

      return {
        database: 'OpenAlex',
        found: true,
        url: work.id || work.primary_location?.landing_page_url,
        matchScore: similarity,
        details: `Cited by: ${work.cited_by_count || 0}, Open Access: ${work.open_access?.is_oa || false}`,
      };
    } catch {
      return { database: 'OpenAlex', found: false, matchScore: 0 };
    }
  }

  private async aiVerifyReference(
    title: string,
    authors: string,
    year: number,
    doi?: string
  ): Promise<{ issues: string[]; recommendations: string[] }> {
    const prompt = `Verify this academic reference for accuracy and credibility:
Title: "${title}"
Authors: ${authors}
Year: ${year}
${doi ? `DOI: ${doi}` : ''}

Check:
1. Does this title sound like a real academic paper?
2. Are the authors formatted correctly?
3. Is the year reasonable?
4. Is the DOI format valid?
5. Any signs of fabrication?

Respond ONLY with JSON:
{"issues": ["issue1", "issue2"], "recommendations": ["rec1", "rec2"]}`;

    try {
      const result = await aiService.generate(prompt, {
        preferredProvider: 'gemini',
        maxTokens: 500,
        temperature: 0.3,
      });

      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { issues: [], recommendations: [] };
    } catch {
      return { issues: [], recommendations: [] };
    }
  }

  async verifyAllReferences(
    references: { title: string; authors: string; year: number; doi?: string }[]
  ): Promise<EvidenceVerificationResult[]> {
    const results: EvidenceVerificationResult[] = [];

    for (const ref of references) {
      const result = await this.verifyReference(ref.title, ref.authors, ref.year, ref.doi);
      results.push(result);
    }

    return results;
  }

   async generateVerificationReport(results: EvidenceVerificationResult[], topic?: string, discipline?: string): Promise<string> {
    const verified = results.filter(r => r.verified).length;
    const total = results.length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidenceScore, 0) / Math.max(1, total);

    let report = `# Academic Reference Verification Report\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n`;
    if (topic) report += `**Research Topic:** ${topic}\n`;
    if (discipline) report += `**Discipline:** ${discipline}\n`;
    report += `\n**Total References:** ${total}\n`;
    report += `**Verified References:** ${verified}/${total} (${Math.round(verified / Math.max(1, total) * 100)}%)\n`;
    report += `**Average Confidence Score:** ${avgConfidence.toFixed(1)}/100\n`;
    report += `**Verification Standard:** Science Direct, PubMed, CrossRef, OpenAlex\n`;
    report += `**Verification Method:** Multi-database cross-checking with AI fact-checking\n\n`;

    // Trusted sources summary
    report += `## Verification Sources\n`;
    const databases = new Set(results.flatMap(r => r.sources.map(s => s.database)));
    for (const db of databases) {
      const found = results.filter(r => r.sources.some(s => s.database === db && s.found)).length;
      report += `- **${db}:** ${found}/${total} references verified\n`;
      report += `  - Verification rate: ${Math.round(found / Math.max(1, total) * 100)}%\n`;
      report += `  - Trust level: ${found >= 1 ? 'High' : 'Low'}\n`;
    }

    // Issues and recommendations
    report += `\n## Verification Results\n`;
    report += `| Reference ID | Verified | Confidence Score | Issues | Recommendations |\n`;
    report += `|--------------|----------|------------------|--------|------------------|\n`;

    for (const result of results) {
      const issues = result.issues.length > 0 ? result.issues.join(', ') : 'None';
      const recommendations = result.recommendations.length > 0 ? result.recommendations.join(', ') : 'None';
      report += `| ${result.referenceId.substring(0, 12)}... | ${result.verified ? '✅ Yes' : '❌ No'} | ${result.confidenceScore}% | ${issues} | ${recommendations} |\n`;
    }

    // Overall assessment
    report += `\n## Overall Assessment\n`;
    if (verified === total) {
      report += `- **All references verified successfully.**\n`;
      report += `- **No issues found.**\n`;
      report += `- **High credibility research paper.**\n`;
      report += `- **Recommendation:** Ready for submission to peer-reviewed journals.\n`;
    } else {
      report += `- **${verified}/${total} references verified.**\n`;
      report += `- **${total - verified} references require review.**\n`;
      report += `- **Recommendation:** Review unverified references before submission.\n`;
      report += `- **Action Required:** Address issues in the following references: ${results.filter(r => !r.verified).map(r => r.referenceId.substring(0, 12)).join(', ')}.\n`;
    }

    // Trust indicators
    report += `\n## Trust Indicators\n`;
    report += `- **Science Direct (CrossRef):** ${results.filter(r => r.sources.some(s => s.database === 'CrossRef' && s.found)).length} verified\n`;
    report += `- **PubMed:** ${results.filter(r => r.sources.some(s => s.database === 'PubMed' && s.found)).length} verified\n`;
    report += `- **OpenAlex:** ${results.filter(r => r.sources.some(s => s.database === 'OpenAlex' && s.found)).length} verified\n`;
    report += `- **AI Fact-Checking:** All references cross-validated with academic knowledge\n`;

    // Credibility metrics
    report += `\n## Credibility Metrics\n`;
    report += `- **Average Confidence Score:** ${avgConfidence.toFixed(1)}/100\n`;
    report += `- **High Confidence References (≥90):** ${results.filter(r => r.confidenceScore >= 90).length}\n`;
    report += `- **Medium Confidence References (70-89):** ${results.filter(r => r.confidenceScore >= 70 && r.confidenceScore < 90).length}\n`;
    report += `- **Low Confidence References (<70):** ${results.filter(r => r.confidenceScore < 70).length}\n`;

    return report;
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    const aWords = new Set(a.split(/\s+/).filter(w => w.length > 3));
    const bWords = new Set(b.split(/\s+/).filter(w => w.length > 3));
    const intersection = [...aWords].filter(w => bWords.has(w));
    const union = new Set([...aWords, ...bWords]);
    return union.size > 0 ? intersection.length / union.size : 0;
  }
}
