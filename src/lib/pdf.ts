import jsPDF from 'jspdf';
import { IDraft } from '@/types/main.db';

interface ITab {
  title: string;
  url: string;
}

const addHeader = (doc: jsPDF, title: string) => {
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(10);
  doc.setTextColor(150);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
};

const addTitlePage = (doc: jsPDF, title: string, version: number) => {
  doc.setFontSize(22);
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 140, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Version ${version}`, doc.internal.pageSize.getWidth() / 2, 150, { align: 'center' });
};

const addContent = (doc: jsPDF, content: string) => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const textContent = tempDiv.innerText;

  doc.setFontSize(12);
  doc.setTextColor(0);
  const splitText = doc.splitTextToSize(textContent, 180);
  let y = 20;
  const pageHeight = doc.internal.pageSize.height;

  splitText.forEach((line: string) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 10, y);
    y += 7;
  });
};

const addReferences = (doc: jsPDF, tabs: ITab[]) => {
  doc.addPage();
  doc.setFontSize(18);
  doc.text('References', 10, 20);
  let y = 30;
  doc.setFontSize(12);
  const pageHeight = doc.internal.pageSize.height;

  tabs.forEach(tab => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(tab.title || '', 10, y);
    y += 5;
    doc.setTextColor(0, 0, 255);
    doc.textWithLink(tab.url, 10, y, { url: tab.url });
    doc.setTextColor(0);
    y += 10;
  });
};

export const exportToPDF = async (
  template: string,
  draft: IDraft & { research_sessions: { title: string } },
  tabs: ITab[]
) => {
  const doc = new jsPDF();
  const title = draft.research_sessions?.title || 'Draft';

  if (template === 'simple') {
    addHeader(doc, title);
    doc.setFontSize(22);
    doc.text(title, 10, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Version ${draft.version}`, 10, 30);
    doc.setDrawColor(200);
    doc.line(10, 35, 200, 35);
    
    doc.addPage();
    addContent(doc, draft.content);
    addFooter(doc);
  } else if (template === 'academic' || template === 'research') {
    addTitlePage(doc, title, draft.version);
    doc.addPage();
    addContent(doc, draft.content);
    if (tabs && tabs.length > 0) {
      addReferences(doc, tabs);
    }
    addFooter(doc);
  }

  doc.save(`${title}.pdf`);
};
