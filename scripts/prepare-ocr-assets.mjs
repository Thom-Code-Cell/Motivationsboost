import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const directory = name => dirname(require.resolve(name + '/package.json'));
const output = fileURLToPath(new URL('../public/ocr/v7/', import.meta.url));
mkdirSync(output, { recursive: true });

const engine = directory('tesseract.js');
const core = directory('tesseract.js-core');
for (const name of ['worker.min.js', 'worker.min.js.LICENSE.txt']) {
  copyFileSync(join(engine, 'dist', name), join(output, name));
}
copyFileSync(join(core, 'LICENSE'), join(output, 'core-LICENSE'));
for (const variant of ['lstm', 'simd-lstm', 'relaxedsimd-lstm']) {
  const name = 'tesseract-core-' + variant + '.wasm.js';
  copyFileSync(join(core, name), join(output, name));
}
for (const language of ['deu', 'eng', 'fra', 'ita']) {
  const name = language + '.traineddata.gz';
  copyFileSync(join(directory('@tesseract.js-data/' + language), '4.0.0_best_int', name), join(output, name));
}

const pdf = directory('pdfjs-dist');
for (const name of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  copyFileSync(join(pdf, 'legacy', 'build', name), join(output, name));
}
copyFileSync(join(pdf, 'LICENSE'), join(output, 'pdf-LICENSE'));
