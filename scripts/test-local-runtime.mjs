// Real production-process checks. Uses an isolated data directory and never stops the user's Ollama.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = "http://127.0.0.1:3212";
const headers = {
  Origin: base,
  "X-Local-Request": "1",
  "Content-Type": "application/json",
};
const evidence = path.resolve("local-evidence/runtime");
await mkdir(evidence, { recursive: true });
let child;
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await exited;
  child = null;
}
async function start(overrides = {}) {
  await stop();
  child = spawn(
    process.execPath,
    [
      "--require",
      path.resolve("scripts/local-egress.cjs"),
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3212",
    ],
    {
      env: {
        ...process.env,
        APP_MODE: "local",
        NEXT_DIST_DIR: ".next-local",
        NEXT_TELEMETRY_DISABLED: "1",
        LOCAL_DATA_DIR: path.join(evidence, "data"),
        ...overrides,
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error("Isolated server exited; port may already be occupied.");
    let state;
    try {
      const response = await fetch(base + "/api/local");
      if (response.ok) state = await response.json();
    } catch {}
    if (state) {
      assert.equal(
        state.dataDirectory,
        path.resolve(overrides.LOCAL_DATA_DIR || path.join(evidence, "data")),
        "Refusing to test against an unrelated data directory",
      );
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Isolated runtime failed to start.");
}
async function post(op, input) {
  return fetch(`${base}/api/local?op=${op}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
}
const results = {};
const id = randomUUID();
try {
  await start();
  const app = {
    id,
    company: "Neustart-Test " + id,
    title: "Administration",
    status: "Interview",
    notes: "Fiktiver Neustartnachweis",
    jobText: "",
    cvText: "Lea Muster, Kundenkontakt",
    letter: "Guten Tag",
    cv: null,
    documentIds: [],
    results: {},
  };
  assert((await post("save", app)).ok);
  const backup = Buffer.from(
    await (await fetch(base + "/api/local?op=backup")).arrayBuffer(),
  );
  await start();
  const state = await (await fetch(base + "/api/local")).json();
  assert(
    state.applications.some((a) => a.id === id && a.status === "Interview"),
  );
  results.restart = "passed across terminated and new Node process";
  await start({ LOCAL_DATA_DIR: path.join(evidence, "restored-" + id) });
  const restored = await fetch(base + "/api/local?op=restore", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/zip" },
    body: backup,
  });
  assert(restored.ok);
  const restoredState = await (await fetch(base + "/api/local")).json();
  assert(restoredState.applications.some((a) => a.id === id));
  results.restore = "passed into empty directory";
  await start({ OLLAMA_BASE_URL: "http://127.0.0.1:11499" });
  const offline = await (await fetch(base + "/api/local?op=model")).json();
  assert.match(offline.error, /nicht erreichbar/);
  results.ollamaUnavailable = offline.error;
  await start({ OLLAMA_MODEL: "motivationsboost-test-missing:" + id });
  const missing = await (await fetch(base + "/api/local?op=model")).json();
  assert.match(missing.error, /Modell fehlt/);
  results.missingModel = missing.error;
  await start({ OLLAMA_TIMEOUT_MS: "1000" });
  const slow = await (
    await post("ai", {
      feature: "interview",
      input: {
        language: "de",
        jobUrl: "https://offline.invalid/job",
        jobText:
          "Fiktive Firma sucht Sachbearbeitung mit Excel, Kundenkontakt, Terminorganisation und zuverlässiger Arbeitsweise.",
        cvData:
          "Erfundene Daten: Lea Muster, Sachbearbeiterin mit Kundenkontakt.",
      },
    })
  ).json();
  assert.match(slow.error, /Zeitlimit/);
  results.realSlowResponse = slow.error;
  await start();
  const abort = new AbortController();
  const inFlight = fetch(base + "/api/local?op=ai", {
    method: "POST",
    headers,
    body: JSON.stringify({
      feature: "interview",
      input: {
        language: "de",
        jobUrl: "https://offline.invalid/job",
        jobText:
          "Fiktive Firma sucht Sachbearbeitung mit Excel, Kundenkontakt, Terminorganisation und zuverlässiger Arbeitsweise.",
      },
    }),
    signal: abort.signal,
  });
  setTimeout(() => abort.abort(), 500);
  await assert.rejects(inFlight, /abort/i);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const next = await post("ai", {
    feature: "email",
    input: {
      language: "de",
      scenario: "thank_you",
      companyName: "Fiktiv AG",
      jobTitle: "Administration",
    },
  });
  const nextBody = await next.json();
  assert(next.ok, JSON.stringify(nextBody));
  assert(nextBody.emailBody);
  results.cancellation =
    "real generation aborted; subsequent generation succeeds";
  await writeFile(
    path.join(evidence, "results.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await stop();
}
