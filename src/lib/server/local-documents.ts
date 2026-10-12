import path from "node:path";
import { existsSync } from "node:fs";
import { unzipSync } from "fflate";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { parseDocument } from "./document-parser";

function languagePath() {
  return path.resolve(process.env.LOCAL_OCR_DIR || "local-resources/ocr");
}
export function ocrAvailable() {
  return ["deu", "eng"].every((lang) =>
    existsSync(path.join(languagePath(), `${lang}.traineddata.gz`)),
  );
}
async function recognize(bytes: Uint8Array, signal: AbortSignal) {
  if (!ocrAvailable())
    throw new Error(
      "Lokale OCR-Sprachdateien fehlen. Bitte npm run setup:local ausführen.",
    );
  if (signal.aborted) throw new Error("Dokumentverarbeitung abgebrochen.");
  const worker = await createWorker(["deu", "eng"], 1, {
    langPath: languagePath(),
    cacheMethod: "none",
    gzip: true,
  });
  let rejectAbort: (error: Error) => void = () => {};
  const interrupted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  const abort = () => {
    rejectAbort(new Error("OCR abgebrochen oder Zeitlimit erreicht."));
  };
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 120000);
  try {
    if (signal.aborted) throw new Error("Dokumentverarbeitung abgebrochen.");
    const result = await Promise.race([
      worker.recognize(Buffer.from(bytes)),
      interrupted,
    ]);
    if (!result.data.text.trim())
      throw new Error(
        "OCR hat keinen lesbaren Text erkannt. Bitte ein schärferes Dokument verwenden.",
      );
    return result.data.text;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    await worker.terminate();
  }
}
export async function parseLocalDocument(
  bytes: Buffer,
  name: string,
  signal: AbortSignal = new AbortController().signal,
) {
  if (
    !name ||
    name.length > 200 ||
    /[\\/\x00-\x1f]/.test(name) ||
    bytes.length === 0 ||
    bytes.length > 8 * 1024 * 1024
  )
    throw new Error("Ungültige Datei. Maximal 8 MB, ohne Pfadangaben.");
  const extension = path.extname(name).toLowerCase();
  let text: string;
  let mime: string;
  let ocr = false;
  if (extension === ".pdf") {
    mime = "application/pdf";
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
      throw new Error("Ungültige PDF-Datei.");
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      const info = await parser.getInfo({ parsePageInfo: true });
      if (info.total > 30)
        throw new Error("Maximal 30 Seiten pro PDF. Bitte Dokument aufteilen.");
      if (
        info.pages.some(
          (page) =>
            !Number.isFinite(page.width) ||
            !Number.isFinite(page.height) ||
            page.width < 10 ||
            page.height < 10 ||
            page.width > 3000 ||
            page.height > 3000 ||
            page.height / page.width > 5,
        )
      )
        throw new Error("Nicht unterstützte PDF-Seitengröße.");
      const parts: string[] = [];
      // Check every page: scanned attachments must not disappear in mixed PDFs.
      for (let page = 1; page <= info.total; page++) {
        if (signal.aborted)
          throw new Error("Dokumentverarbeitung abgebrochen.");
        let content = (
          await parser.getText({ partial: [page], pageJoiner: "" })
        ).text;
        if (content.trim().length < 25) {
          const image = await parser.getScreenshot({
            partial: [page],
            desiredWidth: 1600,
            imageDataUrl: false,
          });
          content = await recognize(image.pages[0].data, signal);
          ocr = true;
        }
        parts.push(content);
      }
      text = parts.join("\n\n");
    } finally {
      await parser.destroy();
    }
  } else if (extension === ".docx") {
    mime =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    let total = 0;
    let files = 0;
    unzipSync(bytes, {
      filter: (file) => {
        total += file.originalSize;
        files++;
        if (
          total > 25 * 1024 * 1024 ||
          files > 1000 ||
          file.name.includes("..") ||
          file.name.startsWith("/") ||
          file.name.includes("\\")
        )
          throw new Error("Unsicheres Word-Archiv.");
        return false;
      },
    });
    text = await parseDocument(bytes, mime);
  } else if (extension === ".txt") {
    mime = "text/plain";
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Textdatei bitte als UTF-8 speichern.");
    }
    if (text.includes("\0")) throw new Error("Binärdatei ist keine Textdatei.");
  } else if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
    const decoder = sharp(bytes, { limitInputPixels: 25_000_000 });
    const metadata = await decoder.metadata();
    const expected =
      extension === ".jpg" || extension === ".jpeg"
        ? "jpeg"
        : extension.slice(1);
    if (metadata.format !== expected)
      throw new Error("Bildinhalt und Dateiendung stimmen nicht überein.");
    mime = `image/${metadata.format}`;
    text = await recognize(
      await decoder
        .rotate()
        .resize({
          width: 2000,
          height: 3000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer(),
      signal,
    );
    ocr = true;
  } else
    throw new Error(
      "Unterstützt werden PDF, DOCX, UTF-8-TXT, PNG, JPEG und WebP.",
    );
  if (!text.trim() || text.length > 200000)
    throw new Error("Dokument ist leer oder enthält zu viel Text.");
  return { text, mime, ocr };
}
