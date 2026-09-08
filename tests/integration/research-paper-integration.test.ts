# Research Paper Integration Tests

import { ResearchPaperEngine } from '../../src/lib/research-paper-engine';
import { EvidenceVerificationResult } from '../../src/types/research-paper';

describe('ResearchPaperEngine Integration', () => {
  let engine: ResearchPaperEngine;

  beforeEach(() => {
    engine = new ResearchPaperEngine({
      topic: 'Integration Test Paper',
      discipline: 'Computer Science',
      citationStyle: 'APA',
      language: 'en',
      includeGraphs: true,
      includeSimulations: true,
    });
  });

  // Mock AI engine responses
  const mockAIEngine = {
    executeTask: jest.fn(),
    getTotalTokensUsed: jest.fn(() => 2000),
    getCompletedTasks: jest.fn(() => []),
    getAllTasks: jest.fn(() => []),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    engine['engine'] = mockAIEngine;
  });

  // --- Full Paper Generation Test ---
  describe('Full Paper Workflow', () => {
    it('should generate a complete paper with all sections, simulations, and figures', async () => {
      // Mock AI responses for all tasks
      mockAIEngine.executeTask
        .mockResolvedValueOnce({ status: 'completed', output: 'Monte Carlo simulation with parameters.', providerUsed: 'deepseek' }) // Simulation
        .mockResolvedValueOnce({ status: 'completed', output: 'Bar chart with p-values < 0.05.', providerUsed: 'google-ai-studio' }) // Figure
        .mockResolvedValueOnce({ status: 'completed', output: 'Methodology table with validation.', providerUsed: 'mistral' }); // Table

      // Generate the paper
      await engine.generatePaper();

      // Validate the paper structure
      const paper = engine.getPaper();
      expect(paper).toBeDefined();
      expect(paper?.sections.length).toBe(7); // Abstract, Introduction, etc.
      expect(paper?.sections[4].figures).toBeDefined(); // Results section
      expect(paper?.sections[4].figures?.some(f => f.type === 'simulation')).toBe(true);
      expect(paper?.sections[4].figures?.some(f => f.type === 'chart')).toBe(true);
      expect(paper?.sections[3].tables).toBeDefined(); // Methodology section
      expect(paper?.coverPage).toBeDefined();
    });

    it('should handle mixed verified/unverified references in verification reports', async () => {
      // Mock AI responses
      mockAIEngine.executeTask
        .mockResolvedValueOnce({ status: 'completed', output: 'Monte Carlo simulation.', providerUsed: 'deepseek' }); // Simulation

      // Generate the paper
      await engine.generatePaper();

      // Manually add references for verification testing
      const mockResults: EvidenceVerificationResult[] = [
        {
          referenceId: 'ref-verified',
          verified: true,
          confidenceScore: 95,
          sources: [{ database: 'CrossRef', found: true }],
          issues: [],
          recommendations: [],
        },
        {
          referenceId: 'ref-unverified',
          verified: false,
          confidenceScore: 60,
          sources: [{ database: 'PubMed', found: false }],
          issues: ['No database match'], 
          recommendations: ['Find alternative sources'],
        },
      ];

      // Generate verification report
      const report = await engine.generateVerificationReport(mockResults);

      // Validate report content
      expect(report).toContain('High Confidence References (≥90): 1');
      expect(report).toContain('Low Confidence References (<70): 1');
      expect(report).toContain('Action Required: Address issues in the following references: ref-unverified...');
    });
  });

  // --- Edge Cases ---
  describe('Edge Cases', () => {
    it('should handle low-confidence references in verification reports', async () => {
      const mockResults: EvidenceVerificationResult[] = [
        {
          referenceId: 'ref-low-confidence',
          verified: true,
          confidenceScore: 55,
          sources: [{ database: 'OpenAlex', found: true }],
          issues: [],
          recommendations: [],
        },
      ];

      const report = await engine.generateVerificationReport(mockResults);
      expect(report).toContain('Low Confidence References (<70): 1');
      expect(report).toContain('Recommendation: Review unverified references before submission.');
    });

    it('should handle multi-language references (simulated)', async () => {
      // Mock AI responses
      mockAIEngine.executeTask
        .mockResolvedValueOnce({ status: 'completed', output: 'Simulación de Monte Carlo.', providerUsed: 'deepseek' }); // Spanish

      await engine.generatePaper();

      // Note: Full multi-language testing requires additional setup
      // This test ensures the engine doesn't crash with non-English content
      const paper = engine.getPaper();
      expect(paper).toBeDefined();
    });
  });

  // --- Performance Test ---
  describe('Performance', () => {
    it('should track token usage and task completion', async () => {
      // Mock AI responses
      mockAIEngine.executeTask
        .mockResolvedValueOnce({ status: 'completed', output: 'Simulation output.', providerUsed: 'deepseek' });

      await engine.generatePaper();

      const stats = engine.getStats();
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.completedTasks).toBeGreaterThan(0);
    });
  });
});