export const ocrLanguages = [
  ['deu', 'Deutsch'],
  ['eng', 'English'],
  ['fra', 'Français'],
  ['ita', 'Italiano'],
] as const;

export type OcrLanguage = typeof ocrLanguages[number][0];
export const maximumRecognizedTextLength = 30_000;
export const maximumRecognizedPdfPages = 10;

export class OcrPageLimit extends Error {}

export function supportsLocalTextRecognition(name: string) {
  return /\.(pdf|jpe?g|png|webp|hei[cf])$/i.test(name);
}

function documentCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
}

export async function recognizeDocumentText(file: Blob, name: string, language: OcrLanguage, progress: (value: number) => void) {
  const assets = new URL('/ocr/v7/', window.location.origin);
  let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | undefined;
  let currentPage = 0;
  let pages = 1;

  async function recogniseCanvas(canvas: HTMLCanvasElement) {
    if (!worker) {
      const { createWorker, OEM } = await import('tesseract.js');
      worker = await createWorker(language, OEM.LSTM_ONLY, {
        workerPath: new URL('worker.min.js', assets).href,
        corePath: assets.href,
        langPath: assets.href,
        workerBlobURL: false,
        logger: event => {
          if (event.status === 'recognizing text') progress((currentPage + event.progress) / pages);
        },
      });
    }
    const { data } = await worker.recognize(canvas);
    return data.text.trim();
  }

  try {
    if (/\.pdf$/i.test(name)) {
      const pdfModule = new URL('pdf.min.mjs', assets).href;
      const { getDocument, GlobalWorkerOptions } = await import(/* webpackIgnore: true */ pdfModule) as typeof import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', assets).href;
      const loading = getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        isEvalSupported: false,
        disableFontFace: true,
        useSystemFonts: true,
        useWasm: false,
        maxImageSize: 32_000_000,
      });
      try {
        const pdf = await loading.promise;
        pages = pdf.numPages;
        if (pages > maximumRecognizedPdfPages) throw new OcrPageLimit();
        const text: string[] = [];
        for (currentPage = 0; currentPage < pages; currentPage++) {
          const page = await pdf.getPage(currentPage + 1);
          try {
            const selectable = (await page.getTextContent()).items
              .map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('').trim();
            if (selectable) text.push(selectable);
            else {
              const original = page.getViewport({ scale: 1 });
              const viewport = page.getViewport({ scale: Math.min(4, 2500 / Math.max(original.width, original.height)) });
              const canvas = documentCanvas(viewport.width, viewport.height);
              await page.render({ canvas, viewport }).promise;
              text.push(await recogniseCanvas(canvas));
            }
          } finally {
            page.cleanup();
          }
          progress((currentPage + 1) / pages);
        }
        return text.filter(Boolean).join('\n\n').slice(0, maximumRecognizedTextLength);
      } finally {
        await loading.destroy();
      }
    }

    const image = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 3000 / Math.max(image.width, image.height));
      const canvas = documentCanvas(image.width * scale, image.height * scale);
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Image conversion unavailable');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return (await recogniseCanvas(canvas)).slice(0, maximumRecognizedTextLength);
    } finally {
      image.close();
    }
  } finally {
    await worker?.terminate();
  }
}
