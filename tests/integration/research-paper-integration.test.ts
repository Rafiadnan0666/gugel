// Research Paper Integration Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResearchPaperEngine } from '../../src/lib/research-paper-engine';
import type { EvidenceVerificationResult } from '../../src/types/research-paper';

const baseConfig = {
  topic: 'Integration Test Paper',
  discipline: 'Computer Science',
  citationStyle: 'APA' as const,
  language: 'en',
  includeGraphs: true,
  includeSimulations: true,
};

function createMockEngine() {
  return {
    executeTask: vi.fn(async (type: string, _desc: string, input: any) => ({
      status: 'completed',
      output: `${type} output on "${input?.topic ?? 'topic'}". Monte Carlo simulation with parameters, bar chart with p-values < 0.05 and confidence intervals.`,
      providerUsed: 'openrouter',
    })),
    getTotalTokensUsed: vi.fn(() => 2000),
    getCompletedTasks: vi.fn(() => [{}, {}, {}]),
    getAllTasks: vi.fn(() => [{}, {}, {}]),
  };
}

describe('ResearchPaperEngine Integration', () => {
  let engine: ResearchPaperEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ResearchPaperEngine({ ...baseConfig });
    engine.setEngine(createMockEngine());
  });

  // --- Full Paper Generation Test ---
  describe('Full Paper Workflow', () => {
    it('should generate a complete paper with all sections, simulations, and figures', async () => {
      await engine.generatePaper();

      const paper = engine.getPaper();
      expect(paper).toBeDefined();
      expect(paper?.sections.length).toBe(7); // Abstract, Introduction, etc.
      expect(paper?.sections[4].figures).toBeDefined(); // Results section
      expect(paper?.sections[4].figures?.some(f => f.type === 'simulation')).toBe(true);
      expect(paper?.sections[4].figures?.some(f => f.type === 'chart')).toBe(true);
      expect(paper?.sections[3].tables).toBeDefined(); // Methodology section
      expect(paper?.coverPage).toBeDefined();
    }, 30000);

    it('should handle mixed verified/unverified references in verification reports', async () => {
      await engine.generatePaper();

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

      const report = await engine.generateVerificationReport(mockResults);

      expect(report).toContain('High Confidence References (≥90):** 1');
      expect(report).toContain('Low Confidence References (<70):** 1');
      expect(report).toContain('Action Required:** Address issues in the following references: ref-unverifi');
    }, 30000);
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
      expect(report).toContain('Low Confidence References (<70):** 1');
      // All references verified → the all-verified assessment branch applies.
      expect(report).toContain('All references verified successfully.');
    });

    it('should handle multi-language references (simulated)', async () => {
      engine.setEngine({
        ...createMockEngine(),
        executeTask: vi.fn(async () => ({
          status: 'completed',
          output: 'Simulación de Monte Carlo con parámetros y gráfico de barras.',
          providerUsed: 'openrouter',
        })),
      });

      await engine.generatePaper();

      // Full multi-language testing requires additional setup;
      // this ensures the engine doesn't crash with non-English content.
      const paper = engine.getPaper();
      expect(paper).toBeDefined();
    }, 30000);
  });

  // --- Performance Test ---
  describe('Performance', () => {
    it('should track token usage and task completion', async () => {
      await engine.generatePaper();

      const stats = engine.getStats();
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.completedTasks).toBeGreaterThan(0);
    }, 30000);
  });
});
