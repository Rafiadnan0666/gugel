# Research Paper Generation System: Testing Workflow

## Overview
This workflow outlines the steps to test the **research paper generation system**, including simulations, verification reports, figures/tables, and cover pages. The goal is to ensure **academic rigor, metadata accuracy, and export integrity**.

---

## 1. Simulation Testing

### Objective
Verify that **Monte Carlo/agent-based simulations** render correctly in the **Results section** with proper metadata.

### Steps
1. **Input Configuration**:
   - Set `includeSimulations: true` in the paper config.
   - Specify a research topic (e.g., "Climate Change Impact Analysis").

2. **Generate Paper**:
   - Run the paper generation workflow.
   - Check the **Results section** for the simulation figure.

3. **Validation**:
   - **Metadata Check**: Ensure the simulation figure includes:
     - `simulationType` (Monte Carlo/agent-based).
     - `parameters` (Included/Not specified).
     - `validation` (Cross-validated with academic standards).
     - `statisticalTests` (Included/Not specified).
   - **Caption Check**: Verify the caption includes methodology and expected results.

4. **Edge Cases**:
   - Test with **low-confidence simulations** (mock AI responses with missing parameters).
   - Verify error handling for **invalid simulation types**.

---

## 2. Verification Reports

### Objective
Ensure **credibility metrics** and **trust indicators** display accurately in verification reports.

### Steps
1. **Input Configuration**:
   - Include a mix of **verified/unverified references** in the paper config.
   - Specify citation style (e.g., APA).

2. **Generate Paper**:
   - Run the paper generation workflow.
   - Extract the verification report.

3. **Validation**:
   - **Credibility Metrics**:
     - High-confidence references (≥90).
     - Medium-confidence references (70-89).
     - Low-confidence references (<70).
   - **Trust Indicators**:
     - Science Direct (CrossRef) verified references.
     - PubMed verified references.
     - OpenAlex verified references.
     - AI fact-checking status.
   - **Overall Assessment**:
     - Verify recommendations for unverified references.
     - Check submission readiness status.

4. **Edge Cases**:
   - Test with **all unverified references** (should flag action required).
   - Test with **multi-language references** (ensure verification works across languages).

---

## 3. Figures/Tables

### Objective
Confirm **metadata** (chart type, statistical tests, resolution) is included in exports.

### Steps
1. **Input Configuration**:
   - Set `includeGraphs: true` in the paper config.
   - Specify a research topic (e.g., "Healthcare Data Analysis").

2. **Generate Paper**:
   - Run the paper generation workflow.
   - Check the **Results section** for figures and the **Methodology section** for tables.

3. **Validation**:
   - **Figures**:
     - Verify metadata includes:
       - `chartType` (Bar Chart/Line Chart/Scatter Plot).
       - `statisticalTests` (Included/Not specified).
       - `resolution` (High-resolution).
       - `academicStandards` (Compliant).
     - Check captions for **statistical significance indicators** (p-values, confidence intervals).
   - **Tables**:
     - Verify metadata includes:
       - `statisticalTests` (Included).
       - `resolution` (High-resolution).
       - `academicStandards` (Compliant).
     - Check rows for **validation methodology** (e.g., pilot-tested, cross-validated).

4. **Edge Cases**:
   - Test with **no statistical tests** in figures/tables.
   - Verify handling of **empty or malformed AI outputs**.

---

## 4. Cover Page

### Objective
Validate that **ORCIDs, funding info, and conflict statements** are included.

### Steps
1. **Input Configuration**:
   - Customize the cover page with:
     - ORCIDs (e.g., `0000-0000-0000-0000`).
     - Funding info (e.g., "National Science Foundation Grant #12345").
     - Conflict statements (e.g., "None").

2. **Generate Paper**:
   - Run the paper generation workflow.
   - Extract the cover page from the generated paper.

3. **Validation**:
   - Verify all custom fields are rendered correctly.
   - Check formatting for **academic standards compliance**.

4. **Edge Cases**:
   - Test with **missing ORCIDs/funding info** (should default to placeholders).
   - Verify handling of **multi-author ORCIDs**.

---

## 5. Edge Cases

### Objective
Test **unverified references, low-confidence sources, and multi-language support**.

### Steps
1. **Unverified References**:
   - Include references with **no database matches**.
   - Verify the verification report flags them as **unverified** with recommendations.

2. **Low-Confidence Sources**:
   - Include references with **confidence scores <70**.
   - Verify the report categorizes them as **low confidence** and suggests review.

3. **Multi-Language Support**:
   - Generate a paper in **Spanish/French/German**.
   - Verify references are **translated and verified** correctly.
   - Check that **academic terminology** is preserved.

---

## 6. Performance Testing

### Objective
Measure **token usage** and **generation time** for large papers.

### Steps
1. **Large Paper Test**:
   - Generate a paper with **10+ sections** and **50+ references**.
   - Monitor **token usage** via `getStats()`.

2. **Timing**:
   - Measure **end-to-end generation time** (from topic input to export).
   - Identify bottlenecks (e.g., AI response times, verification steps).

3. **Optimization**:
   - Adjust **rate limiting** or **parallel task execution** if needed.
   - Log results for future reference.

---

## 7. Export Validation

### Objective
Ensure **PDF/HTML exports** include all metadata and formatting.

### Steps
1. **Export Paper**:
   - Generate a paper and export as **PDF/HTML**.

2. **Validation**:
   - **Figures/Tables**: Verify metadata is visible in exports.
   - **Cover Page**: Check ORCIDs, funding info, and conflict statements.
   - **Verification Reports**: Ensure credibility metrics are included.
   - **Simulations**: Confirm results are rendered with captions.

3. **Edge Cases**:
   - Test exports with **missing metadata** (should gracefully handle gaps).
   - Verify **multi-language exports** retain formatting.

---

## Tools and Commands

### Run Tests
```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Lint and type-check
npm run lint
npm run typecheck

# Generate a test paper
npm run dev -- --topic "Test Research Paper" --includeSimulations --includeGraphs
```

### Debugging
- Use `console.log` in `research-paper-engine.ts` to inspect intermediate states.
- Check `getStats()` for token usage and task completion.

---

## Expected Outcomes
| Component               | Pass Criteria                                                                                     |
|-------------------------|--------------------------------------------------------------------------------------------------|
| Simulations             | Rendered with correct metadata and captions.                                                    |
| Verification Reports     | Credibility metrics and trust indicators displayed accurately.                                    |
| Figures/Tables          | Metadata (chart type, statistical tests) included in exports.                                   |
| Cover Page              | ORCIDs, funding info, and conflict statements included.                                          |
| Edge Cases              | Unverified/low-confidence references flagged; multi-language support works.                       |
| Performance             | Token usage and generation time within acceptable limits.                                        |
| Exports                 | PDF/HTML include all metadata and formatting.                                                   |

---

## Next Steps
1. **Automate Tests**: Convert workflow steps into **Jest/Puppeteer tests**.
2. **Document Findings**: Log results for future reference.
3. **Optimize**: Adjust rate limiting or parallel tasks if bottlenecks are found.
4. **Deploy**: Push changes to GitHub with updated documentation.