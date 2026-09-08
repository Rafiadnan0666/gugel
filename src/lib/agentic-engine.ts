import { aiService, type ProviderId, type GenerateResult } from './ai-service';

export type TaskType =
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
  | 'simulation'
  | 'cover-page-design'
  | 'cross-validation';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgenticTask {
  id: string;
  type: TaskType;
  description: string;
  input: any;
  output?: any;
  status: TaskStatus;
  progress: number;
  providerUsed?: ProviderId;
  modelUsed?: string;
  tokensUsed: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowConfig {
  maxConcurrentTasks: number;
  costOptimization: boolean;
  crossValidation: boolean;
  userId?: string;
  sessionId?: string;
}

// Task routing: which provider is best for which task type
const TASK_ROUTING: Record<TaskType, { preferred: ProviderId[]; minCapabilities: string[] }> = {
  'research-planning':       { preferred: ['gemini', 'deepseek', 'mistral'], minCapabilities: ['reasoning', 'analysis'] },
  'literature-search':       { preferred: ['gemini', 'deepseek', 'openrouter'], minCapabilities: ['analysis', 'fact-checking'] },
  'literature-synthesis':    { preferred: ['deepseek', 'gemini', 'mistral'], minCapabilities: ['reasoning', 'analysis', 'fact-checking'] },
  'hypothesis-generation':   { preferred: ['deepseek', 'gemini', 'mistral'], minCapabilities: ['reasoning', 'analysis'] },
  'methodology-design':      { preferred: ['deepseek', 'gemini', 'mistral'], minCapabilities: ['reasoning', 'analysis'] },
  'data-analysis':           { preferred: ['deepseek', 'gemini', 'openrouter'], minCapabilities: ['analysis', 'reasoning'] },
  'results-interpretation':  { preferred: ['deepseek', 'gemini', 'mistral'], minCapabilities: ['reasoning', 'analysis', 'fact-checking'] },
  'discussion-writing':      { preferred: ['mistral', 'deepseek', 'gemini'], minCapabilities: ['text-generation', 'reasoning'] },
  'abstract-writing':        { preferred: ['mistral', 'gemini', 'deepseek'], minCapabilities: ['text-generation', 'summarization', 'reasoning'] },
  'introduction-writing':    { preferred: ['mistral', 'deepseek', 'gemini'], minCapabilities: ['text-generation', 'reasoning'] },
  'conclusion-writing':      { preferred: ['mistral', 'deepseek', 'gemini'], minCapabilities: ['text-generation', 'summarization', 'reasoning'] },
  'citation-formatting':     { preferred: ['deepseek', 'mistral', 'openrouter'], minCapabilities: ['text-generation', 'fact-checking'] },
  'reference-verification':  { preferred: ['gemini', 'deepseek', 'mistral'], minCapabilities: ['fact-checking', 'analysis', 'reasoning'] },
  'fact-checking':           { preferred: ['deepseek', 'gemini', 'mistral'], minCapabilities: ['fact-checking', 'analysis', 'reasoning'] },
  'plagiarism-check':        { preferred: ['deepseek', 'mistral', 'openrouter'], minCapabilities: ['analysis', 'fact-checking'] },
  'quality-assessment':      { preferred: ['deepseek', 'gemini', 'mistral'], minCapabilities: ['analysis', 'reasoning', 'fact-checking'] },
  'language-polishing':      { preferred: ['mistral', 'gemini', 'deepseek'], minCapabilities: ['rewriting', 'text-generation'] },
  'translation':             { preferred: ['gemini', 'mistral', 'deepseek'], minCapabilities: ['translation', 'text-generation'] },
  'figure-generation':       { preferred: ['deepseek', 'gemini', 'openrouter'], minCapabilities: ['text-generation', 'analysis'] },
  'table-generation':        { preferred: ['deepseek', 'gemini', 'openrouter'], minCapabilities: ['text-generation', 'analysis'] },
  'simulation':              { preferred: ['deepseek', 'gemini', 'openrouter'], minCapabilities: ['reasoning', 'analysis', 'fact-checking'] },
  'cover-page-design':       { preferred: ['gemini', 'mistral', 'openrouter'], minCapabilities: ['text-generation', 'reasoning'] },
  'cross-validation':        { preferred: ['deepseek', 'gemini', 'mistral'], minCapabilities: ['fact-checking', 'analysis', 'reasoning'] },
};

function selectProvider(taskType: TaskType): ProviderId {
  const routing = TASK_ROUTING[taskType];
  // Prioritize Gemini for research tasks, Mistral for writing, DeepSeek for reasoning
  if (taskType.includes('research') || taskType.includes('literature') || taskType.includes('verification')) {
    return 'gemini';
  } else if (taskType.includes('writing') || taskType.includes('polishing')) {
    return 'mistral';
  } else if (taskType.includes('reasoning') || taskType.includes('analysis') || taskType.includes('simulation')) {
    return 'deepseek';
  }
  return routing.preferred[0];
}

function selectCrossValidator(): ProviderId {
  // Use DeepSeek for cross-validation due to its strong reasoning capabilities
  return 'deepseek';
}

export class AgenticEngine {
  private tasks: Map<string, AgenticTask> = new Map();
  private config: WorkflowConfig;

  constructor(config: WorkflowConfig = { maxConcurrentTasks: 3, costOptimization: true, crossValidation: true }) {
    this.config = config;
  }

  async executeTask(taskType: TaskType, description: string, input: any): Promise<AgenticTask> {
    const task: AgenticTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: taskType,
      description,
      input,
      status: 'pending',
      progress: 0,
      tokensUsed: 0,
    };

    this.tasks.set(task.id, task);
    task.status = 'running';
    task.startedAt = new Date();

    try {
      const provider = selectProvider(taskType);
      task.providerUsed = provider;

      const prompt = this.buildPrompt(taskType, description, input);
      const result = await aiService.generate(prompt, {
        preferredProvider: provider,
        maxTokens: 4096,
        temperature: 0.7,
        userId: this.config.userId,
        sessionId: this.config.sessionId,
      });

      task.output = result.text;
      task.modelUsed = result.model;
      task.tokensUsed = result.usage.inputTokens + result.usage.outputTokens;
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress = 100;

      // Cross-validation: run a second model to verify
      if (this.config.crossValidation && result.text.length > 200) {
        const validated = await this.crossValidate(taskType, result.text);
        if (validated) task.output = validated;
      }

      return task;
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();
      return task;
    }
  }

  private async crossValidate(taskType: TaskType, content: string): Promise<string | null> {
    try {
      const validatorProvider = selectCrossValidator();
      const validationPrompt = `Review and improve the following ${taskType.replace(/-/g, ' ')} content. Fix any errors, improve clarity, and ensure academic quality. Return ONLY the improved version, no commentary:\n\n${content}`;

      const result = await aiService.generate(validationPrompt, {
        preferredProvider: validatorProvider,
        maxTokens: 4096,
        temperature: 0.5,
        userId: this.config.userId,
      });

      // Use cross-validated version only if it's substantial (not a regression)
      if (result.text.length > content.length * 0.5) {
        return result.text;
      }
      return null;
    } catch {
      return null;
    }
  }

  private buildPrompt(taskType: TaskType, description: string, input: any): string {
    const baseContext = input.context ? `Context: ${input.context}\n\n` : '';
    const topic = input.topic ? `Topic: ${input.topic}\n\n` : '';
    const existingContent = input.existingContent ? `Existing content:\n${input.existingContent}\n\n` : '';
    const references = input.references ? `References:\n${input.references}\n\n` : '';
    const instructions = input.instructions ? `Instructions: ${input.instructions}\n\n` : '';

    switch (taskType) {
      case 'research-planning':
        return `${baseContext}${topic}Create a detailed research plan with:\n1. Research objectives and questions\n2. Literature review strategy\n3. Methodology approach\n4. Expected outcomes\n5. Timeline\n\nGenerate a comprehensive plan that addresses the research gap.`;

      case 'literature-search':
        return `${baseContext}${topic}Identify key literature sources and studies relevant to this research topic. For each source, provide:\n- Title, authors, year\n- Key findings\n- Relevance to the topic\n- Methodology used\n\nFocus on peer-reviewed sources from journals like Science Direct, Nature, IEEE, PubMed.`;

      case 'literature-synthesis':
        return `${baseContext}${topic}${existingContent}${references}Synthesize the literature into a coherent literature review. Identify:\n1. Theoretical frameworks\n2. Key trends and patterns\n3. Conflicts and debates\n4. Research gaps\n5. How this study addresses those gaps`;

      case 'hypothesis-generation':
        return `${baseContext}${topic}${existingContent}Based on the research context, generate:\n1. Primary hypothesis\n2. Secondary hypotheses\n3. Null hypotheses\n4. Expected relationships between variables\n5. Theoretical justification`;

      case 'methodology-design':
        return `${baseContext}${topic}${existingContent}Design a rigorous methodology including:\n1. Research design (qualitative/quantitative/mixed)\n2. Data collection methods\n3. Sampling strategy\n4. Analysis approach\n5. Validity and reliability measures\n6. Ethical considerations`;

      case 'data-analysis':
        return `${baseContext}${existingContent}Analyze the research data and findings. Provide:\n1. Statistical analysis results\n2. Key patterns and trends\n3. Effect sizes and significance levels\n4. Data visualization recommendations`;

      case 'results-interpretation':
        return `${baseContext}${topic}${existingContent}${references}Interpret the research findings:\n1. What do the results mean?\n2. How do they relate to the hypotheses?\n3. What are the implications?\n4. How do they compare to prior studies?`;

      case 'discussion-writing':
        return `${baseContext}${topic}${existingContent}${references}Write a comprehensive discussion section:\n1. Interpretation of results\n2. Comparison with existing literature\n3. Theoretical implications\n4. Practical implications\n5. Limitations\n6. Future research directions`;

      case 'abstract-writing':
        return `${baseContext}${topic}${existingContent}Write a 150-250 word abstract covering:\n1. Background/Purpose\n2. Methods\n3. Key Results\n4. Conclusions\n5. Keywords (4-6)`;

      case 'introduction-writing':
        return `${baseContext}${topic}${existingContent}${references}Write a compelling introduction:\n1. Background and context\n2. Literature gap\n3. Research question/objectives\n4. Thesis statement/hypothesis\n5. Paper structure overview`;

      case 'conclusion-writing':
        return `${baseContext}${topic}${existingContent}${references}Write a strong conclusion:\n1. Summary of key findings\n2. Answers to research questions\n3. Contributions to the field\n4. Limitations\n5. Future research directions\n6. Final statement`;

      case 'citation-formatting':
        return `${baseContext}${existingContent}${references}Format all citations and references in APA 7th edition style. Ensure:\n1. All in-text citations are properly formatted\n2. Reference list is complete and alphabetized\n3. DOIs are included where available\n4. hanging indents are noted`;

      case 'reference-verification':
        return `${baseContext}${references}Verify the academic references. For each:\n1. Check if the source likely exists (journal, authors, year)\n2. Verify the citation format\n3. Flag any questionable sources\n4. Suggest replacements for unreliable sources\n5. Cross-reference with known databases (Science Direct, PubMed, IEEE)`;

      case 'fact-checking':
        return `${baseContext}${existingContent}Fact-check the following content. For each claim:\n1. Assess accuracy based on established knowledge\n2. Flag unsupported claims\n3. Suggest corrections\n4. Rate overall factual accuracy (0-100)`;

      case 'quality-assessment':
        return `${baseContext}${existingContent}Assess the quality of this research paper content:\n1. Academic tone and language (0-100)\n2. Logical coherence (0-100)\n3. Evidence strength (0-100)\n4. Citation quality (0-100)\n5. Structural completeness (0-100)\n6. Specific improvement suggestions`;

      case 'language-polishing':
        return `${baseContext}${existingContent}${instructions}Polish the language:\n1. Fix grammar and spelling\n2. Improve sentence structure\n3. Enhance academic tone\n4. Ensure consistency\n5. Improve clarity and flow\nReturn only the polished text.`;

      case 'translation':
        return `${baseContext}${existingContent}Translate to ${input.targetLanguage || 'English'}:\nMaintain academic tone, technical accuracy, and proper terminology.`;

      case 'figure-generation':
        return `${baseContext}${topic}${existingContent}Generate a description for a research figure:\n1. Figure type (bar chart, line graph, scatter plot, etc.)\n2. Data points and axes\n3. Caption\n4. Key insights the figure shows`;

      case 'table-generation':
        return `${baseContext}${topic}${existingContent}Generate a research table in markdown format:\n1. Appropriate headers\n2. Organized data\n3. Caption/title\n4. Notes if needed`;

      case 'simulation':
        return `${baseContext}${topic}${existingContent}Design a research simulation:\n1. Simulation type (Monte Carlo, agent-based, etc.)\n2. Parameters and variables\n3. Expected outcomes\n4. Interpretation of results`;

      case 'cover-page-design':
        return `${baseContext}${topic}${existingContent}Design a professional research paper cover page:\n1. Title and subtitle\n2. Author information\n3. Institution/affiliation\n4. Date\n5. Keywords\n6. Abstract summary`;

      case 'cross-validation':
        return `${baseContext}${topic}${existingContent}${references}Cross-validate the research:\n1. Check internal consistency\n2. Verify all claims have support\n3. Ensure methodology matches claims\n4. Validate conclusions follow from results\n5. Identify any logical gaps`;

      default:
        return `${baseContext}${topic}${existingContent}${instructions}\n\n${description}`;
    }
  }

  getTask(id: string): AgenticTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): AgenticTask[] {
    return Array.from(this.tasks.values());
  }

  getCompletedTasks(): AgenticTask[] {
    return this.getAllTasks().filter(t => t.status === 'completed');
  }

  getTotalTokensUsed(): number {
    return this.getAllTasks().reduce((sum, t) => sum + t.tokensUsed, 0);
  }

  reset() {
    this.tasks.clear();
  }
}

export function createAgenticEngine(userId?: string, sessionId?: string): AgenticEngine {
  return new AgenticEngine({
    maxConcurrentTasks: 3,
    costOptimization: true,
    crossValidation: true,
    userId,
    sessionId,
  });
}
