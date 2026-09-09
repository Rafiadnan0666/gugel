// tests/unit/research-paper-engine.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResearchPaperEngine } from '../../src/lib/research-paper-engine';
import type { EvidenceVerificationResult } from '../../src/types/research-paper';

const baseConfig = {
  topic: 'Test Research Paper',
  discipline: 'Computer Science',
  citationStyle: 'APA' as const,
  language: 'en',
  includeGraphs: true,
  includeSimulations: true,
};

/** Generic successful engine: output contains the keywords figure/sim parsers look for. */
function createMockEngine(output?: string) {
  return {
    executeTask: vi.fn(async (type: string, _desc: string, input: any) => ({
      status: 'completed',
      output:
        output ??
        `${type} output on "${input?.topic ?? 'topic'}". Monte Carlo simulation with parameters, bar chart with p-values < 0.05 and confidence intervals.`,
      providerUsed: 'mistral',
    })),
    getTotalTokensUsed: vi.fn(() => 1000),
    getCompletedTasks: vi.fn(() => []),
    getAllTasks: vi.fn(() => []),
  };
}

describe('ResearchPaperEngine', () => {
  let engine: ResearchPaperEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ResearchPaperEngine({ ...baseConfig });
    engine.setEngine(createMockEngine());
  });

  // --- Simulation Tests ---
  describe('generateSimulation', () => {
    it('should generate a Monte Carlo simulation with correct metadata', async () => {
      engine.setEngine(
        createMockEngine('Monte Carlo simulation with 1000 iterations and parameters.')
      );

      await engine.generateSimulation({ topic: 'Test Research Paper' });

      const simulation = engine.getPaper()?.sections[4].figures?.find(f => f.type === 'simulation');
      expect(simulation).toBeDefined();
      expect(simulation?.metadata?.simulationType).toBe('Monte Carlo');
      expect(simulation?.metadata?.parameters).toBe('Included');
      expect(simulation?.metadata?.validation).toBe('Cross-validated with academic standards');
    });

    it('should generate an agent-based simulation with correct metadata', async () => {
      engine.setEngine(
        createMockEngine('Agent-based simulation with 50 agents and parameters.')
      );

      await engine.generateSimulation({ topic: 'Test Research Paper' });

      const simulation = engine.getPaper()?.sections[4].figures?.find(f => f.type === 'simulation');
      expect(simulation?.metadata?.simulationType).toBe('Agent-based');
    });

    it('should handle simulations with missing parameters', async () => {
      engine.setEngine(createMockEngine('Simulation results with 100 runs.'));

      await engine.generateSimulation({ topic: 'Test Research Paper' });

      const simulation = engine.getPaper()?.sections[4].figures?.find(f => f.type === 'simulation');
      expect(simulation?.metadata?.parameters).toBe('Not specified');
    });
  });

  // --- Verification Report Tests ---
  describe('generateVerificationReport', () => {
    it('should generate a report with credibility metrics', async () => {
      const mockResults: EvidenceVerificationResult[] = [
        {
          referenceId: 'ref-1',
          verified: true,
          confidenceScore: 95,
          sources: [{ database: 'CrossRef', found: true }],
          issues: [],
          recommendations: [],
        },
        {
          referenceId: 'ref-2',
          verified: false,
          confidenceScore: 65,
          sources: [{ database: 'PubMed', found: false }],
          issues: ['Unverified source'],
          recommendations: ['Review before submission'],
        },
      ];

      const report = await engine.generateVerificationReport(mockResults);
      expect(report).toContain('High Confidence References (≥90):** 1');
      expect(report).toContain('Medium Confidence References (70-89):** 0');
      expect(report).toContain('Low Confidence References (<70):** 1');
      expect(report).toContain('Action Required:** Address issues in the following references: ref-2');
    });

    it('should categorize references by confidence level', async () => {
      const mockResults: EvidenceVerificationResult[] = [
        { referenceId: 'ref-1', verified: true, confidenceScore: 92, sources: [], issues: [], recommendations: [] },
        { referenceId: 'ref-2', verified: true, confidenceScore: 75, sources: [], issues: [], recommendations: [] },
        { referenceId: 'ref-3', verified: true, confidenceScore: 60, sources: [], issues: [], recommendations: [] },
      ];

      const report = await engine.generateVerificationReport(mockResults);
      expect(report).toContain('High Confidence References (≥90):** 1');
      expect(report).toContain('Medium Confidence References (70-89):** 1');
      expect(report).toContain('Low Confidence References (<70):** 1');
    });

    it('should flag unverified references with recommendations', async () => {
      const mockResults: EvidenceVerificationResult[] = [
        {
          referenceId: 'ref-1',
          verified: false,
          confidenceScore: 50,
          sources: [],
          issues: ['No database match'],
          recommendations: ['Find alternative sources'],
        },
      ];

      const report = await engine.generateVerificationReport(mockResults);
      expect(report).toContain('Action Required:** Address issues in the following references: ref-1');
      expect(report).toContain('Recommendation:** Review unverified references before submission.');
    });
  });

  // --- Figures/Charts Tests ---
  describe('generateFigures', () => {
    it('should generate a bar chart with correct metadata', async () => {
      engine.setEngine(
        createMockEngine('Bar chart showing research results with p-values < 0.05.')
      );

      await engine.generateFigures({ topic: 'Test Research Paper', includeGraphs: true });

      const figure = engine.getPaper()?.sections[4].figures?.find(f => f.type === 'chart');
      expect(figure?.metadata?.chartType).toBe('Bar Chart');
      expect(figure?.metadata?.statisticalTests).toBe('Included');
    });

    it('should generate a line chart with correct metadata', async () => {
      engine.setEngine(
        createMockEngine('Line chart showing trends with confidence intervals.')
      );

      await engine.generateFigures({ topic: 'Test Research Paper', includeGraphs: true });

      const figure = engine.getPaper()?.sections[4].figures?.find(f => f.type === 'chart');
      expect(figure?.metadata?.chartType).toBe('Line Chart');
    });

    it('should handle figures without statistical tests', async () => {
      engine.setEngine(createMockEngine('Scatter plot without metrics.'));

      await engine.generateFigures({ topic: 'Test Research Paper', includeGraphs: true });

      const figure = engine.getPaper()?.sections[4].figures?.find(f => f.type === 'chart');
      expect(figure?.metadata?.statisticalTests).toBe('Not specified');
    });
  });

  // --- Tables Tests ---
  describe('generateTables', () => {
    it('should generate a methodology table with validation metadata', async () => {
      await engine.generateFigures({ topic: 'Test Research Paper', includeGraphs: true });

      const table = engine.getPaper()?.sections[3].tables?.[0];
      expect(table).toBeDefined();
      expect(table?.metadata?.statisticalTests).toBe('Included');
      expect(table?.metadata?.academicStandards).toBe('Compliant');
    });
  });

  // --- Cover Page Tests ---
  describe('createBlankCoverPage', () => {
    it('should include ORCIDs, funding info, and conflict statements', () => {
      const coverPage = engine.createBlankCoverPage({
        topic: 'Test Research Paper',
        authors: [{ name: 'Test Author', orcid: '0000-0000-0000-0001' }],
        funding: 'National Science Foundation Grant #12345',
        conflictStatement: 'None',
      });
      expect(coverPage.authors[0].orcid).toBe('0000-0000-0000-0001');
      expect(coverPage.funding).toBe('National Science Foundation Grant #12345');
      expect(coverPage.conflictOfInterest).toBe('None');
    });

    it('should handle missing ORCIDs and funding info', () => {
      const coverPage = engine.createBlankCoverPage({
        topic: 'Test Research Paper',
        authors: [{ name: 'Test Author' }],
      });
      expect(coverPage.authors[0].orcid).toBe('0000-0000-0000-0000'); // Default
      expect(coverPage.funding).toBeUndefined();
    });
  });

  // --- Integration Test ---
  describe('Full Workflow', () => {
    it('should generate a paper with simulations, figures, and verification reports', async () => {
      // Generic mock answers every task (planning, 7 sections, lit search, figure, table, simulation)
      await engine.generatePaper();

      const paper = engine.getPaper();
      expect(paper).toBeDefined();
      expect(paper?.sections.length).toBe(7); // Abstract, Introduction, etc.
      expect(paper?.sections[4].figures?.some(f => f.type === 'simulation')).toBe(true);
      expect(paper?.sections[4].figures?.some(f => f.type === 'chart')).toBe(true);
      expect(paper?.sections[3].tables).toBeDefined();
      expect(paper?.coverPage).toBeDefined();
      expect(paper?.references.length).toBeGreaterThan(0);
      expect(paper?.verificationReport).toContain('Academic Reference Verification Report');
    }, 30000);
  });
});
