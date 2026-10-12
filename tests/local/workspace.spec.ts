import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { jsPDF } from "jspdf";

const witness =
  "Erfundene Testdaten. Arbeitszeugnis: Lea Muster war von 01/2021 bis 12/2024 als Sachbearbeiterin bei Beispiel AG tätig. Aufgaben: Kundenkontakt, Terminorganisation, Pflege von Excel-Listen. Sie arbeitete sorgfältig und zuverlässig. Diplom: Kauffrau EFZ, Berufsschule Musterstadt, Abschluss 2020. E-Mail, Telefonnummer und Adresse sind nicht angegeben.";
const job =
  "Die Fiktiv AG sucht eine Sachbearbeiterin für Administration. Aufgaben sind Kundenkontakt, Terminorganisation und Pflege von Excel-Listen. Gesucht werden eine kaufmännische Ausbildung, sorgfältiges Arbeiten und klare Kommunikation. Bitte Lebenslauf, Motivationsschreiben und Arbeitszeugnisse beilegen.";
const headers = { Origin: "http://127.0.0.1:3210", "X-Local-Request": "1" };
test.beforeEach(async ({ request }) => {
  const state = await (await request.get("/api/local")).json();
  expect(
    state.dataDirectory,
    "Tests require an isolated local-evidence data directory",
  ).toMatch(/[\\/]local-evidence[\\/]/);
});
test("local management, offline shell, PDF/Word/ZIP and backup restore", async ({
  page,
  request,
}) => {
  const company = "Browser Test AG " + randomUUID().slice(0, 8);
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      external.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Motivationsboost Lokal" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Neue Bewerbung", exact: true })
    .click();
  await page.getByLabel("Unternehmen", { exact: true }).fill(company);
  await page.getByLabel("Position", { exact: true }).fill("Sachbearbeitung");
  await page.getByLabel("Status", { exact: true }).selectOption("Interview");
  await page
    .getByLabel("Notizen", { exact: true })
    .fill("Termin am Dienstag – erfundene Daten.");
  await page
    .getByLabel("Lebenslauf – bearbeitbarer Exporttext")
    .fill("Lea Muster\nKundenkontakt und Excel\n".repeat(150));
  await page
    .getByLabel("Motivationsschreiben – bearbeitbarer Exporttext")
    .fill("Guten Tag, ich bewerbe mich auf die ausgeschriebene Position.");
  await page
    .getByRole("button", { name: "Bewerbung speichern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Bewerbung gespeichert");
  await page.reload();
  await page.getByRole("button", { name: new RegExp(company) }).click();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "Interview",
  );
  await expect(page.getByLabel("Notizen", { exact: true })).toHaveValue(
    /Dienstag/,
  );
  for (const name of [
    "PDF exportieren",
    "Word exportieren",
    "Vollständige Mappe (ZIP)",
  ]) {
    const received = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const file = await received;
    expect(await file.failure()).toBeNull();
  }
  const backup = await request.get("/api/local?op=backup");
  expect(backup.ok()).toBe(true);
  expect(
    (
      await request.post("/api/local?op=restore", {
        headers,
        data: await backup.body(),
      })
    ).ok(),
  ).toBe(true);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Bewerbung löschen", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("gelöscht");
  expect(external).toEqual([]);
  expect(
    (
      await request.post("/api/local?op=delete", {
        headers: { Origin: "https://evil.example" },
        data: { id: randomUUID() },
      })
    ).ok(),
  ).toBe(false);
  expect((await request.get("/api/session")).status()).toBe(403);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "local-evidence/mobile.png", fullPage: true });
});

test("real local OCR for image and scanned PDF", async ({ request }) => {
  test.skip(
    process.env.LOCAL_REAL_AI !== "1",
    "Requires installed local OCR files.",
  );
  const image = await sharp(
    Buffer.from(
      '<svg width="1400" height="500"><rect width="100%" height="100%" fill="white"/><text x="60" y="100" font-size="42" fill="black">Arbeitszeugnis Lea Muster</text><text x="60" y="180" font-size="36" fill="black">Beispiel AG, Administration 2021 bis 2024.</text><text x="60" y="260" font-size="36" fill="black">Aufgaben: Kundenkontakt und Excel-Listen.</text></svg>',
    ),
  )
    .png()
    .toBuffer();
  for (const [name, content] of [
    ["zeugnis.png", image],
    [
      "scan.pdf",
      (() => {
        const pdf = new jsPDF();
        pdf.addImage(image.toString("base64"), "PNG", 10, 20, 190, 68);
        return Buffer.from(pdf.output("arraybuffer"));
      })(),
    ],
  ] as const) {
    const response = await request.post("/api/local?op=upload", {
      headers: { ...headers, "X-File-Name": name },
      data: content,
      timeout: 180000,
    });
    const output = await response.json();
    expect(response.ok(), JSON.stringify(output)).toBe(true);
    expect(output.ocr).toBe(true);
    expect(output.text).toContain("Lea Muster");
  }
});

test("real Ollama complete applicant workflow with external browser requests blocked", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.LOCAL_REAL_AI !== "1",
    "Explicit real Ollama acceptance run.",
  );
  await mkdir("local-evidence", { recursive: true });
  const company = "Fiktiv AG " + randomUUID().slice(0, 8);
  const outputs: Record<string, unknown> = {};
  const external: string[] = [];
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Neue Bewerbung", exact: true })
    .click();
  await page.getByLabel("Unternehmen", { exact: true }).fill(company);
  await page.getByLabel("Position", { exact: true }).fill("Sachbearbeiterin");
  await page
    .getByLabel("Zusätzlicher Quelltext / Text für Stilprüfung")
    .fill(witness);
  await page.getByLabel("Stellenanzeigentext", { exact: true }).fill(job);
  const run = async (feature: string) => {
    await page.getByLabel("Funktion", { exact: true }).selectOption(feature);
    const response = page.waitForResponse((r) => r.url().includes("op=ai"), {
      timeout: 330000,
    });
    const start = Date.now();
    await page
      .getByRole("button", { name: "Mit Ollama erstellen", exact: true })
      .click();
    const result = await response;
    const body = await result.json();
    expect(result.ok(), JSON.stringify(body)).toBe(true);
    outputs[feature] = { elapsedMs: Date.now() - start, output: body };
    await expect(
      page.getByRole("button", {
        name: "Geprüft übernehmen und speichern",
        exact: true,
      }),
    ).toBeEnabled({ timeout: 15000 });
    await page
      .getByRole("button", {
        name: "Geprüft übernehmen und speichern",
        exact: true,
      })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Geprüfte Überarbeitung",
    );
    return body;
  };
  const cv = await run("cv");
  expect(cv.personalInfo.name).toBe("Lea Muster");
  expect(cv.personalInfo.email).toBe("");
  expect(cv.personalInfo.phone).toBe("");
  expect(cv.personalInfo.address).toBe("");
  expect(JSON.stringify(cv)).toContain("Beispiel AG");
  expect(JSON.stringify(cv)).toContain("Excel");
  await run("letter");
  const ats = await run("ats");
  expect(ats.atsScore).toBeGreaterThanOrEqual(0);
  await page.getByLabel("Funktion", { exact: true }).selectOption("refine");
  await page
    .getByLabel("Zu prüfende Schlüsselbegriffe (Komma getrennt)", {
      exact: true,
    })
    .fill("Excel");
  const refined = await run("refine");
  expect(refined.refinedCvText).not.toMatch(/Python|SAP|Personalführung/);
  const interview = await run("interview");
  expect(interview.technicalQuestions.length).toBeGreaterThan(0);
  await page.getByLabel("Funktion", { exact: true }).selectOption("answer");
  await page
    .getByLabel("Interviewfrage", { exact: true })
    .fill(interview.technicalQuestions[0]);
  await page
    .getByLabel("Deine schriftliche Antwort", { exact: true })
    .fill(
      "Bei Beispiel AG habe ich Kundenanfragen bearbeitet und Excel-Listen sorgfältig gepflegt.",
    );
  await run("answer");
  const linkedin = await run("linkedin");
  expect(linkedin.linkedinSummary).not.toMatch(
    /Ich bin Sachbearbeiterin bei|Ich arbeite (?:aktuell |derzeit )?bei (?:der )?Beispiel/i,
  );
  await run("email");
  const gaps = await run("gaps");
  expect(gaps.filledCvText).not.toMatch(
    /Keine Lücken|Alle Angaben sind vollständig|Keine Klarstellungen erforderlich/i,
  );
  await run("keywords");
  await run("required");
  await run("style");
  await run("salary");
  await run("jobs");
  await run("marketing");
  await page.reload();
  await page
    .getByRole("button", { name: new RegExp(company) })
    .last()
    .click();
  await expect(
    page.getByLabel("Lebenslauf – bearbeitbarer Exporttext"),
  ).not.toBeEmpty();
  const state = await (await request.get("/api/local")).json();
  const saved = state.applications.find(
    (app: { company: string }) => app.company === company,
  );
  expect(Object.keys(saved.results)).toHaveLength(15);
  await writeFile(
    "local-evidence/real-ollama.json",
    JSON.stringify(
      { model: state.model, externalRequests: external, outputs },
      null,
      2,
    ),
  );
  expect(external).toEqual([]);
  await page.screenshot({ path: "local-evidence/desktop.png", fullPage: true });
});
