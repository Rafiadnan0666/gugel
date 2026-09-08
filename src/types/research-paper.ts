export interface ResearchPaper {
  id: string;
  sessionId: string;
  userId: string;
  title: string;
  subtitle?: string;
  coverPage: CoverPage;
  metadata: PaperMetadata;
  structure: PaperStructure;
  references: Reference[];
  figures: Figure[];
  tables: TableData[];
  appendices: Appendix[];
  versions: PaperVersion[];
  currentVersion: number;
  status: PaperStatus;
  language: string;
  citationStyle: CitationStyle;
  createdAt: Date;
  updatedAt: Date;
  exportedAt?: Date;
  exportFormats?: ExportFormat[];
}

export interface CoverPage {
  title: string;
  subtitle?: string;
  authors: Author[];
  institution: string;
  department?: string;
  date: string | Date;
  doi?: string;
  keywords: string[];
  abstract: string;
  funding?: string;
  conflictStatement?: string;
  conflictOfInterest?: string;
  coverImage?: CoverImage;
  customFields?: Record<string, string>;
  template?: CoverTemplate;
}

export interface CoverImage {
  url: string;
  alt: string;
  position: 'top' | 'center' | 'bottom' | 'full';
  opacity: number;
  overlayColor?: string;
}

export interface CoverTemplate {
  id: string;
  name: string;
  layout: 'classic' | 'modern' | 'minimal' | 'academic' | 'conference' | 'journal';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  fonts: {
    title: string;
    subtitle: string;
    body: string;
  };
  showInstitution: boolean;
  showDate: boolean;
  showDOI: boolean;
  showKeywords: boolean;
}

export interface Author {
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  affiliation?: string;
  orcid?: string;
  corresponding?: boolean;
  equalContribution?: boolean;
  order?: number;
}

export interface PaperMetadata {
  doi?: string;
  arxivId?: string;
  journal?: string;
  conference?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  year: number;
  month?: number;
  publisher?: string;
  license?: string;
  funding?: FundingInfo[];
  acknowledgments?: string;
  dataAvailability?: string;
  codeAvailability?: string;
  ethicsStatement?: string;
  conflictOfInterest?: string;
  authorContributions?: AuthorContribution[];
}

export interface FundingInfo {
  agency: string;
  grantNumber: string;
  country?: string;
}

export interface AuthorContribution {
  authorId: string;
  contributions: string[];
}

export interface PaperStructure {
  abstract: Section;
  introduction: Section;
  literatureReview: Section;
  methodology: Section;
  results: Section;
  discussion: Section;
  conclusion: Section;
  customSections: Section[];
}

export interface Section {
  id: string;
  title: string;
  content: string;
  order: number;
  level: 1 | 2 | 3;
  subsections: Section[];
  citations: Citation[];
  figures: string[];
  tables: string[];
  equations: Equation[];
  status: SectionStatus;
  wordCount: number;
  lastEditedBy?: string;
  lastEditedAt: Date;
  aiGenerated: boolean;
  aiProvider?: string;
  aiModel?: string;
  reviewNotes?: ReviewNote[];
}

export interface SectionStatus {
  draft: boolean;
  reviewed: boolean;
  approved: boolean;
  needsRevision: boolean;
  revisionNotes?: string;
}

export interface ReviewNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  position: { start: number; end: number };
  type: 'comment' | 'suggestion' | 'correction' | 'question';
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Citation {
  id: string;
  referenceId: string;
  text: string;
  position: { start: number; end: number };
  format: 'inline' | 'footnote' | 'endnote';
}

export interface Equation {
  id: string;
  latex: string;
  label?: string;
  position: { start: number; end: number };
}

export interface Reference {
  id: string;
  type: ReferenceType | string;
  title: string;
  authors: ReferenceAuthor[] | string;
  year: number;
  journal?: string;
  conference?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  arxivId?: string;
  publisher?: string;
  isbn?: string;
  abstract?: string;
  keywords?: string[];
  source: ReferenceSource | string;
  credibilityScore: number;
  verified: boolean;
  citations?: CitationLocation[];
  addedBy?: 'user' | 'ai';
  aiProvider?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ReferenceType = 
  | 'journal-article'
  | 'conference-paper'
  | 'book'
  | 'book-chapter'
  | 'thesis'
  | 'preprint'
  | 'report'
  | 'patent'
  | 'website'
  | 'dataset'
  | 'software'
  | 'standard'
  | 'other';

export interface ReferenceAuthor {
  firstName: string;
  lastName: string;
  orcid?: string;
}

export type ReferenceSource = 
  | 'manual'
  | 'crossref'
  | 'pubmed'
  | 'arxiv'
  | 'google-scholar'
  | 'semantic-scholar'
  | 'ai-generated'
  | 'doi'
  | 'isbn';

export interface CitationLocation {
  sectionId: string;
  position: { start: number; end: number };
  context: string;
}

export interface Figure {
  id: string;
  type: FigureType | string;
  title: string;
  caption: string;
  source?: FigureSource | string;
  url?: string;
  data?: FigureData;
  position?: { sectionId: string; order: number };
  dimensions?: { width: number; height: number };
  format?: 'png' | 'jpg' | 'svg' | 'pdf' | 'tex';
  generatedBy?: 'user' | 'ai';
  aiProvider?: string;
  aiPrompt?: string;
  altText?: string;
  license?: string;
  metadata?: Record<string, string>;
  createdAt?: Date;
}

export type FigureType = 
  | 'chart'
  | 'graph'
  | 'diagram'
  | 'illustration'
  | 'photograph'
  | 'screenshot'
  | 'map'
  | 'schematic'
  | 'flowchart'
  | 'network'
  | 'heatmap'
  | 'timeline'
  | 'simulation'
  | 'other';

export type FigureSource = 
  | 'uploaded'
  | 'generated'
  | 'scraped'
  | 'referenced'
  | 'simulation';

export interface FigureData {
  type: 'chart' | 'graph' | 'simulation';
  config: ChartConfig | GraphConfig | SimulationConfig;
  rawData?: any[];
}

export interface ChartConfig {
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'radar' | 'box' | 'violin' | 'histogram';
  data: ChartDataPoint[];
  options: ChartOptions;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  group?: string;
}

export interface ChartOptions {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  legend: boolean;
  gridLines: boolean;
  colors: string[];
  responsive: boolean;
}

export interface GraphConfig {
  graphType: 'network' | 'tree' | 'directed' | 'undirected' | 'bipartite';
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: 'force' | 'hierarchical' | 'circular' | 'grid';
  options: GraphOptions;
}

export interface GraphNode {
  id: string;
  label: string;
  group?: string;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
  label?: string;
  directed?: boolean;
}

export interface GraphOptions {
  showLabels: boolean;
  showArrows: boolean;
  nodeSize: number;
  edgeWidth: number;
  physics: boolean;
}

export interface SimulationConfig {
  simulationType: 'monte-carlo' | 'agent-based' | 'system-dynamics' | 'discrete-event' | 'differential-equation';
  parameters: Record<string, number>;
  steps: number;
  runs: number;
  outputVariables: string[];
  initialConditions: Record<string, number>;
}

export interface TableData {
  id: string;
  title: string;
  caption: string;
  headers: string[];
  rows: string[][];
  position?: { sectionId: string; order: number };
  format?: 'markdown' | 'latex' | 'html' | 'csv';
  source?: TableSource | string;
  generatedBy?: 'user' | 'ai';
  aiProvider?: string;
  aiPrompt?: string;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  metadata?: Record<string, string>;
  createdAt?: Date;
}

export type TableSource = 'manual' | 'generated' | 'scraped' | 'computed' | 'referenced';

export interface Appendix {
  id: string;
  title: string;
  content: string;
  type: AppendixType;
  order: number;
  figures: string[];
  tables: string[];
  createdAt: Date;
}

export type AppendixType = 
  | 'supplementary-data'
  | 'methodology-details'
  | 'additional-results'
  | 'survey-instrument'
  | 'code'
  | 'raw-data'
  | 'proofs'
  | 'glossary'
  | 'abbreviations'
  | 'other';

export interface PaperVersion {
  version: number;
  content: Partial<PaperStructure>;
  changes: VersionChange[];
  authorId: string;
  authorName: string;
  commitMessage: string;
  createdAt: Date;
  aiProvidersUsed: string[];
}

export interface VersionChange {
  sectionId: string;
  type: 'added' | 'modified' | 'deleted' | 'moved';
  diff: string;
  aiAssisted: boolean;
}

export type PaperStatus = 
  | 'draft'
  | 'in-review'
  | 'revision-needed'
  | 'accepted'
  | 'published'
  | 'archived';

export type CitationStyle = 
  | 'APA'
  | 'MLA'
  | 'IEEE'
  | 'Chicago'
  | 'Harvard'
  | 'Vancouver'
  | 'AMA'
  | 'ACM'
  | 'Nature'
  | 'Science'
  | 'Custom';

export type ExportFormat = 
  | 'pdf'
  | 'docx'
  | 'latex'
  | 'markdown'
  | 'html'
  | 'epub'
  | 'xml';

export interface ExportOptions {
  format: ExportFormat;
  template: string;
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  includeFigures: boolean;
  includeTables: boolean;
  includeReferences: boolean;
  includeAppendices: boolean;
  language: string;
  citationStyle: CitationStyle;
  pageSize: 'A4' | 'Letter' | 'A5' | 'Legal';
  margins: { top: number; bottom: number; left: number; right: number };
  fontSize: number;
  lineSpacing: number;
  twoColumn: boolean;
  watermark?: string;
  password?: string;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  provider: AIProviderType;
  apiKey: string;
  baseUrl?: string;
  models: AIModelConfig[];
  rateLimit: RateLimitConfig;
  enabled: boolean;
  priority: number;
  costPer1kTokens: { input: number; output: number };
  freeTier: boolean;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  supportsVision: boolean;
}

export type AIProviderType = 
  | 'gemini'
  | 'google-ai-studio'
  | 'mistral'
  | 'deepseek'
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'local';

export interface AIModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kTokens: { input: number; output: number };
  capabilities: ModelCapability[];
  freeTier: boolean;
  deprecated: boolean;
}

export type ModelCapability = 
  | 'text-generation'
  | 'code-generation'
  | 'reasoning'
  | 'analysis'
  | 'summarization'
  | 'translation'
  | 'rewriting'
  | 'fact-checking'
  | 'citation-generation'
  | 'latex-generation'
  | 'chart-generation'
  | 'simulation'
  | 'vision';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerHour: number;
  tokensPerDay: number;
}

export interface AgenticTask {
  id: string;
  type: AgenticTaskType;
  description: string;
  assignedProvider: string;
  assignedModel: string;
  input: any;
  output?: any;
  status: TaskStatus;
  progress: number;
  dependencies: string[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export type AgenticTaskType = 
  | 'research-planning'
  | 'literature-search'
  | 'literature-synthesis'
  | 'hypothesis-generation'
  | 'methodology-design'
  | 'data-analysis'
  | 'results-interpretation'
  | 'discussion-writing'
  | 'abstract-writing'
  | 'introduction-writing'
  | 'conclusion-writing'
  | 'citation-formatting'
  | 'reference-verification'
  | 'fact-checking'
  | 'plagiarism-check'
  | 'quality-assessment'
  | 'language-polishing'
  | 'translation'
  | 'figure-generation'
  | 'table-generation'
  | 'simulation-running'
  | 'cover-page-design'
  | 'cross-validation';

export type TaskStatus = 
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retrying';

export interface AgenticWorkflow {
  id: string;
  paperId: string;
  name: string;
  description: string;
  tasks: AgenticTask[];
  status: WorkflowStatus;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  currentTask?: string;
  results: WorkflowResult[];
}

export type WorkflowStatus = 
  | 'idle'
  | 'planning'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowResult {
  taskId: string;
  success: boolean;
  output: any;
  qualityScore: number;
  tokensUsed: number;
  cost: number;
  duration: number;
}

export interface AIOrchestrationConfig {
  providers: AIProviderConfig[];
  defaultProvider: string;
  fallbackProviders: string[];
  taskRouting: TaskRoutingRule[];
  collaborationMode: CollaborationMode;
  qualityThresholds: QualityThresholds;
  costOptimization: boolean;
  maxConcurrentTasks: number;
}

export interface TaskRoutingRule {
  taskType: AgenticTaskType;
  preferredProviders: string[];
  fallbackProviders: string[];
  requiredCapabilities: ModelCapability[];
  maxCost?: number;
  maxLatency?: number;
}

export type CollaborationMode = 
  | 'sequential'
  | 'parallel'
  | 'consensus'
  | 'voting'
  | 'hierarchical'
  | 'adaptive';

export interface QualityThresholds {
  minQualityScore: number;
  minCoherenceScore: number;
  minAccuracyScore: number;
  minOriginalityScore: number;
  maxPlagiarismScore: number;
  requireCitations: boolean;
  requirePeerReview: boolean;
}

export interface GeneratedPaper {
  config: PaperConfig;
  sections: PaperSection[];
  coverPage: CoverPage;
  references: Reference[];
  verificationReport: string;
  stats: { tokensUsed: number; tasksCompleted: number };
  appendices?: Appendix[];
  id?: string;
  status?: string;
  totalWordCount?: number;
}

export interface PaperConfig {
  topic: string;
  discipline: string;
  citationStyle: CitationStyle;
  language: string;
  includeGraphs: boolean;
  includeSimulations: boolean;
  pageCount?: number;
  customInstructions?: string;
}

export interface PaperSection {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  figures?: Figure[];
  tables?: TableData[];
}

export interface EvidenceVerificationResult {
  referenceId: string;
  verified: boolean;
  confidenceScore: number;
  sources: { database: string; found: boolean }[];
  issues: string[];
  recommendations: string[];
}

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  dateFormat: string;
  numberFormat: string;
  citationStyles: CitationStyle[];
  supported: boolean;
  aiTranslationQuality: number;
}