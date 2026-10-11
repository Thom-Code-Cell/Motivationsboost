import { jsPDF } from 'jspdf';
export function createTextPdf(text: string): jsPDF {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  const lines: string[] = doc.splitTextToSize(text, 180);
  let y = 20;
  for (const line of lines) {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(line, 15, y); y += 5;
  }
  return doc;
}
