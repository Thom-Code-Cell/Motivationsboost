import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { PDFParse } from 'pdf-parse';

async function readDocumentXml(bytes: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('Ungültige Word-Datei.');
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []; let size = 0;
    const stream = file.nodeStream();
    stream.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 20 * 1024 * 1024) { stream.pause(); reject(new Error('Das entpackte Dokument ist zu groß.')); }
      else chunks.push(chunk);
    }).on('error', reject).on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))).resume();
  });
}
export async function parseDocument(bytes: Buffer, mimeType: string): Promise<string> {
  if (bytes.length > 8 * 1024 * 1024) throw new Error('Datei überschreitet 8 MB.');
  if (mimeType === 'application/pdf') {
    if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Ungültige PDF-Datei.');
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try { return (await parser.getText()).text; } finally { await parser.destroy(); }
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const xml = await readDocumentXml(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Dieses Word-Dokument enthält nicht unterstützte XML-Definitionen.');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    return Array.from(doc.getElementsByTagName('w:p')).map(paragraph => Array.from(paragraph.getElementsByTagName('w:t')).map(t => t.textContent).join('')).join('\n');
  }
  if (mimeType === 'text/plain') return bytes.toString('utf8');
  throw new Error('Dieser Dateityp wird nicht unterstützt.');
}
