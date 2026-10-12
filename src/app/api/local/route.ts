import { z } from "zod";
import { assertLocalRequest, localRequest } from "@/lib/server/local-security";
import { checkOllama, ollamaConfig } from "@/lib/server/ollama";
import * as store from "@/lib/server/local-store";
import { localFlows } from "@/lib/server/local-flows";
import { checkApplicantFacts } from "@/lib/server/local-facts";
import { exportApplication } from "@/lib/server/local-export";
import { parseLocalDocument, ocrAvailable } from "@/lib/server/local-documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let aiBusy = false;
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function failure(error: unknown) {
  return json(
    {
      error:
        error instanceof z.ZodError
          ? "Ungültige Eingabe oder Dokumentstruktur. Bitte Felder prüfen."
          : error instanceof Error
            ? error.message
            : "Lokaler Vorgang fehlgeschlagen.",
    },
    400,
  );
}
export async function GET(request: Request) {
  try {
    assertLocalRequest(request.headers, false);
    const operation = new URL(request.url).searchParams.get("op");
    if (operation === "model") return json(await checkOllama());
    if (operation === "backup")
      return new Response(Buffer.from(store.createBackup()), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition":
            'attachment; filename="Motivationsboost-Sicherung.zip"',
          "Cache-Control": "no-store",
        },
      });
    if (operation === "document") {
      const { doc, bytes } = store.readDocument(
        new URL(request.url).searchParams.get("id") || "",
      );
      return new Response(bytes, {
        headers: {
          "Content-Type": doc.mime,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
          "Cache-Control": "no-store",
        },
      });
    }
    return json({
      applications: store.listApplications(),
      documents: store.listDocuments(),
      settings: store.getSettings(),
      dataDirectory: store.dataDirectory(),
      model: ollamaConfig().model,
      ocr: ocrAvailable(),
    });
  } catch (error) {
    return failure(error);
  }
}
async function readBounded(request: Request, max: number) {
  if (Number(request.headers.get("content-length") || 0) > max)
    throw new Error("Datei oder Anfrage ist zu groß.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Leere Anfrage.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw new Error("Datei oder Anfrage ist zu groß.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function POST(request: Request) {
  try {
    assertLocalRequest(request.headers);
    const operation = new URL(request.url).searchParams.get("op");
    if (operation === "upload") {
      const bytes = await readBounded(request, 8 * 1024 * 1024);
      const name = decodeURIComponent(request.headers.get("x-file-name") || "");
      const { text, mime, ocr } = await parseLocalDocument(
        bytes,
        name,
        request.signal,
      );
      return json({ ...store.saveDocument(name, mime, text, bytes), ocr });
    }
    if (operation === "restore")
      return json(
        store.restoreBackup(await readBounded(request, 100 * 1024 * 1024)),
      );
    const body = JSON.parse(
      (await readBounded(request, 2_000_000)).toString("utf8"),
    );
    if (operation === "save") return json(store.saveApplication(body));
    if (operation === "delete") {
      store.deleteApplication(body.id);
      return json({ ok: true });
    }
    if (operation === "settings") return json(store.saveSettings(body));
    if (operation === "export") {
      const format = z.enum(["pdf", "docx", "zip"]).parse(body.format);
      const { bytes, name, mime } = await exportApplication(
        body.application,
        format,
      );
      return new Response(Buffer.from(bytes), {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="${name}"`,
        },
      });
    }
    if (operation === "ai") {
      if (aiBusy)
        throw new Error(
          "Eine lokale KI-Anfrage läuft bereits. Bitte warten oder abbrechen.",
        );
      const flow = Object.hasOwn(localFlows, body.feature)
        ? localFlows[body.feature]
        : null;
      if (!flow) throw new Error("Diese lokale Funktion ist nicht verfügbar.");
      aiBusy = true;
      try {
        const output = await localRequest.run({ signal: request.signal }, () =>
          flow(body.input),
        );
        checkApplicantFacts(body.feature, body.input, output);
        return json(output);
      } finally {
        aiBusy = false;
      }
    }
    throw new Error("Unbekannte lokale Aktion.");
  } catch (error) {
    return failure(error);
  }
}
