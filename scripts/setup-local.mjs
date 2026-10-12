import { mkdir, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const directory = path.resolve(
  process.env.LOCAL_OCR_DIR || "local-resources/ocr",
);
await mkdir(directory, { recursive: true });
const hashes = {};
for (const language of ["deu", "eng"]) {
  const url = `https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0/${language}.traineddata.gz`;
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`OCR-Download fehlgeschlagen: ${language}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    bytes.length < 100000 ||
    bytes.length > 30000000 ||
    bytes[0] !== 0x1f ||
    bytes[1] !== 0x8b
  )
    throw new Error("Ungültige OCR-Sprachdatei.");
  const temp = path.join(directory, `${language}.tmp`);
  try {
    await writeFile(temp, bytes);
    await rename(temp, path.join(directory, `${language}.traineddata.gz`));
  } finally {
    await rm(temp, { force: true });
  }
  hashes[language] = createHash("sha256").update(bytes).digest("hex");
  console.log(`${language}: lokale OCR-Sprachdatei installiert.`);
}
await writeFile(
  path.join(directory, "checksums.json"),
  JSON.stringify(hashes, null, 2),
);
console.log(
  "OCR bereit. Modell separat mit ollama pull qwen3:4b-instruct installieren.",
);
