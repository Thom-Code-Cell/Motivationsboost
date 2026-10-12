import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { zipSync, unzipSync } from "fflate";
import { Document, Packer, Paragraph } from "docx";
import { assertLocalRequest, localRequest } from "@/lib/server/local-security";
import { checkOllama, generateLocal, ollamaConfig } from "@/lib/server/ollama";
import { getJobPosting } from "@/lib/server/job-posting";
import * as store from "@/lib/server/local-store";
import { parseLocalDocument } from "@/lib/server/local-documents";
import { exportApplication } from "@/lib/server/local-export";
import { createTextPdf } from "@/lib/export-documents";
import { ai } from "@/ai/genkit";
import { z } from "zod";
import { localFlows } from "@/lib/server/local-flows";
import { ApplicationSchema, currentCv } from "@/lib/local-schema";
import {
  checkApplicantFacts,
  conservativeGapReport,
} from "@/lib/server/local-facts";

let directory: string;
beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "motivationsboost-test-"));
  vi.stubEnv("APP_MODE", "local");
  vi.stubEnv("LOCAL_DATA_DIR", directory);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  rmSync(directory, { recursive: true, force: true });
});
const application = () => ({
  id: randomUUID(),
  company: "Fiktiv AG",
  title: "Administration",
  status: "Entwurf",
  notes: "",
  jobText: "",
  cvText: "Erfundene Bewerbungsdaten\n".repeat(200),
  letter: "Guten Tag",
  cv: null,
  documentIds: [] as string[],
  results: {},
});
describe("local request isolation", () => {
  it("requires loopback host, exact origin and custom write header", () => {
    const headers = new Headers({
      host: "127.0.0.1:3210",
      origin: "http://127.0.0.1:3210",
      "x-local-request": "1",
    });
    expect(() => assertLocalRequest(headers)).not.toThrow();
    headers.set("origin", "https://attacker.example");
    expect(() => assertLocalRequest(headers)).toThrow();
    headers.delete("origin");
    expect(() => assertLocalRequest(headers)).toThrow();
    headers.set("host", "evil.example:3210");
    expect(() => assertLocalRequest(headers, false)).toThrow();
  });
  it("rejects external Ollama endpoints and cloud models", () => {
    vi.stubEnv("OLLAMA_BASE_URL", "https://ollama.com");
    expect(ollamaConfig).toThrow();
    vi.stubEnv("OLLAMA_BASE_URL", "http://127.0.0.1:11434");
    vi.stubEnv("OLLAMA_MODEL", "gpt-oss:20b-cloud");
    expect(ollamaConfig).toThrow();
  });
  it("never downloads a job advert in local mode", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(getJobPosting("https://example.com")).rejects.toThrow(
      "Stellenanzeigentext",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
describe("Ollama", () => {
  it("checks local capabilities before structured generation", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ capabilities: ["completion"] }))
      .mockResolvedValueOnce(
        Response.json({ done: true, message: { content: '{"ok":true}' } }),
      );
    vi.stubGlobal("fetch", fetch);
    expect(
      (await generateLocal("Fiktive Daten", { type: "object" })).text,
    ).toContain("true");
    expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:11434/api/show");
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body.format).toEqual({ type: "object" });
    expect(body.stream).toBe(false);
  });
  it.each([
    { capabilities: ["embedding"] },
    { capabilities: ["completion"], remote_host: "https://ollama.com" },
  ])("rejects incompatible or remote model", async (info) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(info)));
    await expect(checkOllama()).rejects.toThrow("lokales Textmodell");
  });
  it("reports missing models and offline Ollama", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 404 })),
    );
    await expect(checkOllama()).rejects.toThrow("Modell fehlt");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error()));
    await expect(checkOllama()).rejects.toThrow("nicht erreichbar");
  });
  it("propagates cancellation to requests", async () => {
    const abort = new AbortController();
    abort.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init) => {
        expect(init.signal.aborted).toBe(true);
        throw new Error();
      }),
    );
    await expect(
      localRequest.run({ signal: abort.signal }, () => generateLocal("Test")),
    ).rejects.toThrow("abgebrochen");
  });
  it("rejects truncated responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ capabilities: ["completion"] }))
        .mockResolvedValueOnce(
          Response.json({
            done: true,
            done_reason: "length",
            message: { content: "{}" },
          }),
        ),
    );
    await expect(generateLocal("Test")).rejects.toThrow("unvollständig");
  });
  it("validates Ollama output using the existing prompt schema", async () => {
    const prompt = ai.definePrompt({
      name: "test",
      input: { schema: z.object({ text: z.string() }) },
      output: { schema: z.object({ score: z.number().min(0).max(100) }) },
      prompt: "{{text}}",
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ capabilities: ["completion"] }))
        .mockResolvedValueOnce(
          Response.json({ done: true, message: { content: '{"score":1000}' } }),
        ),
    );
    await expect(prompt({ text: "Fiktive Daten" })).rejects.toThrow("Format");
  });
  it("times out a slow local model without fallback", async () => {
    vi.stubEnv("OLLAMA_TIMEOUT_MS", "1000");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ capabilities: ["completion"] }))
      .mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener("abort", () =>
              reject(new Error("timeout")),
            ),
          ),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(generateLocal("Fiktive Daten")).rejects.toThrow("Zeitlimit");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("rejects oversized context without sending applicant text", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async () =>
        Response.json({ capabilities: ["completion"] }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(generateLocal("x".repeat(50000))).rejects.toThrow(
      "Kontextbudget",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
describe("SQLite, backup and exports", () => {
  it("rejects invented dates/contact details and preserves source text in gap checks", () => {
    expect(() =>
      checkApplicantFacts(
        "linkedin",
        { cvData: "Lea Muster, 2021–2024" },
        { linkedinSummary: "Beschäftigt seit 2017" },
      ),
    ).toThrow("Jahreszahl");
    expect(() =>
      checkApplicantFacts(
        "cv",
        { documentTexts: ["Lea Muster, 2021–2024"] },
        { personalInfo: { name: "Lea Muster", email: "invented@example.com" } },
      ),
    ).toThrow("persönliche Angaben");
    const text = "Lea Muster, Sachbearbeiterin 2021–2024";
    const report = conservativeGapReport(text).filledCvText;
    expect(report.startsWith(text)).toBe(true);
    expect(report).toContain("2024");
    expect(report).not.toContain("2017");
    expect(report).toContain("regelbasierter");
  });
  it("uses the current reviewed CV in downstream functions", () => {
    const app = ApplicationSchema.parse({
      ...application(),
      cv: {
        personalInfo: { name: "Alt", email: "", phone: "", address: "" },
        summary: "Veraltete Daten",
        sections: [],
        skills: ["Alt"],
      },
      cvText: "Geprüfte neue Daten",
    });
    expect(JSON.stringify(currentCv(app))).toContain("Geprüfte neue Daten");
    expect(JSON.stringify(currentCv(app))).not.toContain("Veraltete");
  });
  it("does not invent ATS revisions when requested skills are unsupported or absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async () =>
          Response.json({ capabilities: ["completion"] }),
        ),
    );
    const input = {
      cvText: "Lea Muster: Kundenkontakt und Excel.",
      coverLetterText: "Guten Tag",
      missingKeywords: ["Python"],
      language: "de",
    };
    expect(await localFlows.refine(input)).toEqual({
      refinedCvText: input.cvText,
      refinedCoverLetterText: input.coverLetterText,
    });
    expect(await localFlows.refine({ ...input, missingKeywords: [] })).toEqual({
      refinedCvText: input.cvText,
      refinedCoverLetterText: input.coverLetterText,
    });
  });
  it("persists create/edit/status/delete across reopened connections", () => {
    const app = application();
    store.saveApplication(app);
    store.saveApplication({ ...app, status: "Interview", notes: "Termin" });
    expect(store.listApplications()[0]).toMatchObject({
      status: "Interview",
      notes: "Termin",
    });
    store.deleteApplication(app.id);
    expect(store.listApplications()).toEqual([]);
  });
  it("restores documents and records into an empty directory and preserves conflicts", () => {
    const doc = store.saveDocument(
      "Zeugnis.txt",
      "text/plain",
      "Fiktiver Text",
      Buffer.from("Fiktiver Text"),
    );
    const app = { ...application(), documentIds: [doc.id] };
    store.saveApplication(app);
    store.saveSettings({ language: "fr" });
    const backup = store.createBackup();
    expect(unzipSync(backup)["motivationsboost.sqlite"].length).toBeGreaterThan(
      0,
    );
    expect(store.restoreBackup(backup)).toEqual({
      applications: 1,
      documents: 1,
    });
    expect(store.listApplications()).toHaveLength(2);
    vi.stubEnv("LOCAL_DATA_DIR", path.join(directory, "restored"));
    store.restoreBackup(backup);
    expect(store.listApplications()[0]).toMatchObject(app);
    expect(store.getSettings().language).toBe("fr");
    expect(store.readDocument(doc.id).bytes.toString()).toBe("Fiktiver Text");
  });
  it("rejects malicious paths and corrupt archives without writes", () => {
    expect(() =>
      store.restoreBackup(zipSync({ "../escape": Buffer.from("evil") })),
    ).toThrow();
    expect(store.listApplications()).toEqual([]);
    expect(() =>
      store.saveDocument("../bad.txt", "text/plain", "x", Buffer.from("x")),
    ).toThrow();
  });
  it("exports multi-page PDF, Word and attached originals", async () => {
    const doc = store.saveDocument(
      "Diplom.txt",
      "text/plain",
      "Fiktiv",
      Buffer.from("Fiktiv"),
    );
    const app = { ...application(), documentIds: [doc.id] };
    const pdf = await exportApplication(app, "pdf");
    expect(
      Buffer.from(pdf.bytes)
        .toString()
        .match(/\/Type \/Page\b/g)!.length,
    ).toBeGreaterThan(1);
    const word = await exportApplication(app, "docx");
    expect(unzipSync(word.bytes)["word/document.xml"]).toBeDefined();
    const zip = await exportApplication(app, "zip");
    expect(unzipSync(zip.bytes)["Anlagen/1-Diplom.txt"]).toEqual(
      new Uint8Array(Buffer.from("Fiktiv")),
    );
    expect(readFileSync(path.join(directory, "exports", zip.name))).toEqual(
      Buffer.from(zip.bytes),
    );
  });
});
describe("local file processing", () => {
  it("extracts UTF8, DOCX and digital PDF locally", async () => {
    expect(
      (
        await parseLocalDocument(
          Buffer.from("Erfundene Ausbildung in Zürich."),
          "diplom.txt",
        )
      ).text,
    ).toContain("Zürich");
    const bytes = await Packer.toBuffer(
      new Document({
        sections: [
          {
            children: [
              new Paragraph(
                "Fiktives Arbeitszeugnis: Administration und Kundenkontakt.",
              ),
            ],
          },
        ],
      }),
    );
    expect((await parseLocalDocument(bytes, "zeugnis.docx")).text).toContain(
      "Administration",
    );
    expect(
      (
        await parseLocalDocument(
          Buffer.from(
            createTextPdf(
              "Fiktives Arbeitszeugnis: Administration und Kundenkontakt.",
            ).output("arraybuffer"),
          ),
          "zeugnis.pdf",
        )
      ).text,
    ).toContain("Administration");
  });
  it("rejects deceptive types, archives and oversized files", async () => {
    await expect(
      parseLocalDocument(Buffer.from("no PDF"), "cv.pdf"),
    ).rejects.toThrow();
    await expect(
      parseLocalDocument(Buffer.alloc(9 * 1024 * 1024), "cv.txt"),
    ).rejects.toThrow();
    await expect(
      parseLocalDocument(Buffer.from("x"), "../cv.txt"),
    ).rejects.toThrow();
    await expect(
      parseLocalDocument(
        Buffer.from(zipSync({ "../evil": Buffer.from("x") })),
        "cv.docx",
      ),
    ).rejects.toThrow();
  });
});
