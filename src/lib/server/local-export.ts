import { Document, Packer, Paragraph } from "docx";
import { zipSync } from "fflate";
import { ApplicationSchema } from "@/lib/local-schema";
import { createTextPdf } from "@/lib/export-documents";
import { readDocument, saveExport } from "./local-store";

export async function exportApplication(
  value: unknown,
  format: "pdf" | "docx" | "zip",
) {
  const app = ApplicationSchema.parse(value);
  if (!app.cvText.trim() && !app.letter.trim())
    throw new Error("Bitte zuerst geprüfte Bewerbungstexte speichern.");
  const text = [app.letter, app.cvText].filter(Boolean).join("\n\n---\n\n");
  const pdf = new Uint8Array(createTextPdf(text).output("arraybuffer"));
  const word = new Uint8Array(
    await Packer.toBuffer(
      new Document({
        sections: [
          { children: text.split("\n").map((line) => new Paragraph(line)) },
        ],
      }),
    ),
  );
  let bytes: Uint8Array;
  if (format === "zip") {
    const entries: Record<string, Uint8Array> = {
      "Bewerbung.pdf": pdf,
      "Bewerbung.docx": word,
      "Bewerbung.txt": Buffer.from(text),
    };
    for (const [index, id] of app.documentIds.entries()) {
      const { doc, bytes } = readDocument(id);
      entries[
        `Anlagen/${index + 1}-${doc.name.replace(/[^a-zA-Z0-9._äöüÄÖÜß -]/g, "_")}`
      ] = bytes;
    }
    bytes = zipSync(entries);
  } else bytes = format === "pdf" ? pdf : word;
  const name = saveExport(bytes, format);
  return {
    bytes,
    name,
    mime:
      format === "pdf"
        ? "application/pdf"
        : format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/zip",
  };
}
