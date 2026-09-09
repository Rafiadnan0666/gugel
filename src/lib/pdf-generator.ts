import type { GeneratedPaper, CitationStyle, CoverPage, PaperSection, Reference } from './research-paper-engine';

export interface PDFOptions {
  pageSize: 'a4' | 'letter';
  margins: { top: number; bottom: number; left: number; right: number };
  fontSize: number;
  lineSpacing: number;
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  includePageNumbers: boolean;
  includeHeader: boolean;
  watermark?: string;
  font?: string;
}

const DEFAULT_PDF_OPTIONS: PDFOptions = {
  pageSize: 'a4',
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  fontSize: 12,
  lineSpacing: 1.5,
  includeCoverPage: true,
  includeTableOfContents: true,
  includePageNumbers: true,
  includeHeader: true,
  font: 'Times New Roman',
};

export function generatePDFHTML(paper: GeneratedPaper, options: Partial<PDFOptions> = {}): string {
  const opts = { ...DEFAULT_PDF_OPTIONS, ...options };
  const pageWidth = opts.pageSize === 'a4' ? '210mm' : '215.9mm';
  const pageHeight = opts.pageSize === 'a4' ? '297mm' : '279.4mm';

  let html = `<!DOCTYPE html>
<html lang="${paper.config.language}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${paper.coverPage.title}</title>
<style>
@page {
  size: ${pageWidth} ${pageHeight};
  margin: ${opts.margins.top}pt ${opts.margins.right}pt ${opts.margins.bottom}pt ${opts.margins.left}pt;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: '${opts.font}', 'Times New Roman', Times, serif;
  font-size: ${opts.fontSize}pt;
  line-height: ${opts.lineSpacing};
  color: #000;
  background: #fff;
}

.page {
  width: ${pageWidth};
  min-height: ${pageHeight};
  padding: ${opts.margins.top}pt ${opts.margins.right}pt ${opts.margins.bottom}pt ${opts.margins.left}pt;
  page-break-after: always;
  position: relative;
}

.page:last-child { page-break-after: auto; }

/* Cover Page */
.cover-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  min-height: ${pageHeight};
}

.cover-title {
  font-size: 28pt;
  font-weight: bold;
  margin-bottom: 12pt;
  line-height: 1.2;
  color: #1a1a2e;
}

.cover-subtitle {
  font-size: 16pt;
  font-style: italic;
  color: #4a4a6a;
  margin-bottom: 36pt;
}

.cover-authors {
  font-size: 14pt;
  margin-bottom: 8pt;
}

.cover-author-name { font-weight: bold; }
.cover-author-affiliation { font-style: italic; color: #555; }

.cover-institution {
  font-size: 14pt;
  margin-top: 24pt;
  font-weight: bold;
  color: #333;
}

.cover-department {
  font-size: 12pt;
  color: #666;
  margin-top: 4pt;
}

.cover-date {
  font-size: 12pt;
  margin-top: 36pt;
  color: #555;
}

.cover-doi {
  font-size: 10pt;
  margin-top: 12pt;
  color: #0066cc;
}

.cover-abstract-box {
  margin-top: 36pt;
  padding: 16pt 24pt;
  border: 1pt solid #ccc;
  max-width: 80%;
  text-align: left;
}

.cover-abstract-label {
  font-weight: bold;
  font-size: 12pt;
  margin-bottom: 8pt;
}

.cover-abstract-text {
  font-size: 10pt;
  line-height: 1.4;
}

.cover-keywords {
  margin-top: 12pt;
  font-size: 10pt;
  color: #555;
}

/* Table of Contents */
.toc-title {
  font-size: 18pt;
  font-weight: bold;
  text-align: center;
  margin-bottom: 24pt;
}

.toc-item {
  display: flex;
  justify-content: space-between;
  padding: 4pt 0;
  border-bottom: 1px dotted #ccc;
}

.toc-item-level-1 { font-weight: bold; font-size: 12pt; }
.toc-item-level-2 { padding-left: 16pt; font-size: 11pt; }

/* Section Content */
.section-title {
  font-size: 16pt;
  font-weight: bold;
  margin-top: 24pt;
  margin-bottom: 12pt;
  color: #1a1a2e;
  border-bottom: 2pt solid #1a1a2e;
  padding-bottom: 4pt;
}

.section-subtitle {
  font-size: 13pt;
  font-weight: bold;
  margin-top: 16pt;
  margin-bottom: 8pt;
  color: #333;
}

.section-subsubtitle {
  font-size: 12pt;
  font-weight: bold;
  margin-top: 12pt;
  margin-bottom: 6pt;
  color: #444;
}

.section-content {
  text-align: justify;
  text-indent: 24pt;
  margin-bottom: 6pt;
}

.section-content p {
  margin-bottom: 6pt;
}

/* References */
.references-title {
  font-size: 16pt;
  font-weight: bold;
  margin-top: 24pt;
  margin-bottom: 16pt;
}

.reference-item {
  margin-bottom: 8pt;
  padding-left: 36pt;
  text-indent: -36pt;
  font-size: ${opts.fontSize}pt;
}

/* Figures */
.figure-container {
  margin: 16pt 0;
  text-align: center;
  page-break-inside: avoid;
}

.figure-caption {
  font-size: 10pt;
  font-style: italic;
  margin-top: 4pt;
  color: #333;
}

/* Tables */
.table-container {
  margin: 16pt 0;
  page-break-inside: avoid;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

th, td {
  border: 1pt solid #333;
  padding: 4pt 8pt;
  text-align: left;
}

th {
  background-color: #f0f0f0;
  font-weight: bold;
}

.table-caption {
  font-size: 10pt;
  font-weight: bold;
  margin-bottom: 4pt;
  text-align: center;
}

/* Page Numbers */
.page-number {
  position: absolute;
  bottom: 36pt;
  right: 72pt;
  font-size: 10pt;
  color: #555;
}

/* Header */
.page-header {
  position: absolute;
  top: 36pt;
  right: 72pt;
  font-size: 9pt;
  color: #888;
  font-style: italic;
}

/* Watermark */
.watermark {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  font-size: 72pt;
  color: rgba(0, 0, 0, 0.03);
  pointer-events: none;
  z-index: -1;
  white-space: nowrap;
}

/* Appendix */
.appendix-title {
  font-size: 16pt;
  font-weight: bold;
  margin-top: 24pt;
  margin-bottom: 12pt;
}

/* Lists */
ul, ol {
  margin-left: 24pt;
  margin-bottom: 8pt;
}

li {
  margin-bottom: 4pt;
}

/* Blockquotes */
blockquote {
  margin: 12pt 24pt;
  padding: 8pt 16pt;
  border-left: 3pt solid #ccc;
  font-style: italic;
  color: #444;
}

/* Code */
code {
  font-family: 'Courier New', monospace;
  font-size: 10pt;
  background: #f5f5f5;
  padding: 1pt 3pt;
}

pre {
  font-family: 'Courier New', monospace;
  font-size: 9pt;
  background: #f5f5f5;
  padding: 12pt;
  margin: 8pt 0;
  overflow-x: auto;
  white-space: pre-wrap;
}

/* Abstract inline */
.abstract-section {
  margin-bottom: 24pt;
  padding-bottom: 16pt;
  border-bottom: 1pt solid #ccc;
}

.abstract-label {
  font-weight: bold;
  font-size: 12pt;
  margin-bottom: 8pt;
}

.keywords-label {
  font-weight: bold;
  font-size: 11pt;
  margin-top: 8pt;
}
</style>
</head>
<body>
${opts.watermark ? `<div class="watermark">${opts.watermark}</div>` : ''}

${opts.includeCoverPage ? generateCoverPageHTML(paper.coverPage) : ''}
${opts.includeTableOfContents ? generateTOCHTML(paper.sections) : ''}`;

  // Generate each section
  for (const section of paper.sections) {
    if (!section.content) continue;
    html += generateSectionHTML(section);
  }

  // References
  if (paper.references.length > 0) {
    html += `
<div class="page">
  <div class="references-title">References</div>
  ${paper.references.map(ref => `<div class="reference-item">${formatReferenceHTML(ref, paper.config.citationStyle)}</div>`).join('\n')}
</div>`;
  }

  // Appendices
  for (let i = 0; i < (paper.appendices || []).length; i++) {
    html += `
<div class="page">
  <div class="appendix-title">Appendix ${String.fromCharCode(65 + i)}: ${paper.appendices[i].title}</div>
  <div class="section-content">${paper.appendices[i].content}</div>
</div>`;
  }

  html += `
</body>
</html>`;

  return html;
}

function generateCoverPageHTML(cover: CoverPage): string {
  const authorsHTML = cover.authors
    .filter(a => a.name)
    .map(a => `
    <div class="cover-authors">
      <span class="cover-author-name">${a.name}</span><br>
      <span class="cover-author-affiliation">${a.affiliation}${a.email ? ` | ${a.email}` : ''}</span>
      ${a.orcid ? `<br><span style="font-size:10pt;color:#0066cc;">ORCID: ${a.orcid}</span>` : ''}
    </div>`)
    .join('');

  const keywordsHTML = cover.keywords.length > 0
    ? `<div class="cover-keywords"><strong>Keywords:</strong> ${cover.keywords.join(', ')}</div>`
    : '';

  return `
<div class="page cover-page">
  <div class="cover-title">${cover.title}</div>
  ${cover.subtitle ? `<div class="cover-subtitle">${cover.subtitle}</div>` : ''}
  ${authorsHTML}
  <div class="cover-institution">${cover.institution}</div>
  ${cover.department ? `<div class="cover-department">${cover.department}</div>` : ''}
  <div class="cover-date">${cover.date}</div>
  ${cover.doi ? `<div class="cover-doi">DOI: ${cover.doi}</div>` : ''}
  ${cover.abstract ? `
  <div class="cover-abstract-box">
    <div class="cover-abstract-label">Abstract</div>
    <div class="cover-abstract-text">${cover.abstract}</div>
  </div>` : ''}
  ${keywordsHTML}
  ${cover.funding ? `<div style="margin-top:16pt;font-size:10pt;color:#555;"><strong>Funding:</strong> ${cover.funding}</div>` : ''}
  ${cover.conflictOfInterest ? `<div style="margin-top:8pt;font-size:10pt;color:#555;"><strong>Conflict of Interest:</strong> ${cover.conflictOfInterest}</div>` : ''}
</div>`;
}

function generateTOCHTML(sections: PaperSection[]): string {
  let html = `<div class="page"><div class="toc-title">Table of Contents</div>`;
  sections.forEach((section, idx) => {
    if (!section.content) return;
    html += `
    <div class="toc-item toc-item-level-1">
      <span>${section.title}</span>
      <span>${idx + 3}</span>
    </div>`;
  });
  html += `
    <div class="toc-item toc-item-level-1">
      <span>References</span>
      <span>${sections.filter(s => s.content).length + 3}</span>
    </div>
  </div>`;
  return html;
}

function generateSectionHTML(section: PaperSection): string {
  // Convert markdown-like content to HTML
  let content = section.content
    .replace(/^### (.+)$/gm, '<div class="section-subsubtitle">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="section-subtitle">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  content = content.split(/(<(?:div|li|strong|em|br)[^>]*>)/).map(part => {
    if (part.startsWith('<')) return part;
    return `<p>${part}</p>`;
  }).join('');

  // Wrap lists
  content = content.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
    if (!match.includes('<ul>') && !match.includes('<ol>')) {
      return `<ul>${match}</ul>`;
    }
    return match;
  });

  return `
<div class="page">
  <div class="section-title">${section.title}</div>
  <div class="section-content">${content}</div>
  ${section.figures?.map((fig, i) => `
  <div class="figure-container">
    <div class="figure-caption"><strong>Figure ${i + 1}.</strong> ${fig.title} — ${fig.caption}</div>
  </div>`).join('') || ''}
  ${section.tables?.map((table, i) => `
  <div class="table-container">
    <div class="table-caption">Table ${i + 1}: ${table.title}</div>
    <table>
      <thead><tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${table.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <div class="figure-caption">${table.caption}</div>
  </div>`).join('') || ''}
</div>`;
}

function formatReferenceHTML(ref: Reference, style: CitationStyle): string {
  switch (style) {
    case 'APA':
      return `${ref.authors} (${ref.year}). ${ref.title}. ${ref.journal ? `<em>${ref.journal}</em>, ` : ''}${ref.volume ? `${ref.volume}(${ref.issue}), ` : ''}${ref.pages || ''}. ${ref.doi ? `<a href="https://doi.org/${ref.doi}">https://doi.org/${ref.doi}</a>` : ''}`;
    case 'MLA':
      return `${ref.authors}. "${ref.title}." <em>${ref.journal || ref.publisher || ''}</em>, vol. ${ref.volume || 'n.d.'}, no. ${ref.issue || ''}, ${ref.year}, pp. ${ref.pages || ''}.`;
    case 'IEEE':
      return `${ref.authors}, "${ref.title}," <em>${ref.journal || ''}</em>, vol. ${ref.volume || ''}, no. ${ref.issue || ''}, pp. ${ref.pages || ''}, ${ref.year}.`;
    case 'Chicago':
      return `${ref.authors}. "${ref.title}." <em>${ref.journal || ''}</em> ${ref.volume || ''} (${ref.year}): ${ref.pages || ''}.`;
    case 'Harvard':
      return `${ref.authors} (${ref.year}) '${ref.title}', <em>${ref.journal || ''}</em>, ${ref.volume}(${ref.issue}), pp. ${ref.pages || ''}.`;
    case 'Vancouver':
      return `${ref.authors}. ${ref.title}. <em>${ref.journal || ''}</em>. ${ref.year};${ref.volume}(${ref.issue}):${ref.pages || ''}.`;
    default:
      return `${ref.authors}. (${ref.year}). ${ref.title}. ${ref.journal || ref.publisher || ''}.`;
  }
}
