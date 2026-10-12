"use client";
import { useEffect, useRef, useState } from "react";
import { GenerateCvFromDocumentsOutputSchema } from "@/ai/schemas";
import { currentCv, cvToText, type LocalApplication } from "@/lib/local-schema";
import type { LocalDocument } from "@/lib/server/local-store";
import { LocalResultEditor } from "./local-result-editor";
import "./local-workspace.css";

const features = {
  cv: "Lebenslauf erstellen",
  letter: "Motivationsschreiben",
  ats: "ATS-Analyse (Schätzung)",
  refine: "ATS-Überarbeitung",
  interview: "Interviewfragen",
  answer: "Schriftliche Antwort analysieren",
  linkedin: "LinkedIn-Zusammenfassung",
  email: "E-Mail-Vorlage",
  gaps: "Lücken im Lebenslauf prüfen",
  keywords: "Stellenanforderungen",
  required: "Benötigte Unterlagen",
  style: "Schreibstil analysieren",
  salary: "Gehaltsschätzung",
  jobs: "Suchstrategie",
  marketing: "Weiterer Text",
};
type Feature = keyof typeof features;
type State = {
  applications: LocalApplication[];
  documents: LocalDocument[];
  settings: { language: "de" | "en" | "fr" | "it" };
  dataDirectory: string;
  model: string;
  ocr: boolean;
};
async function api(op: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(`/api/local?op=${op}`, {
    ...(body !== undefined
      ? {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Local-Request": "1",
          },
          body: JSON.stringify(body),
        }
      : {}),
    signal,
  });
  if (!response.ok)
    throw new Error(
      (await response.json()).error || "Lokale Anfrage fehlgeschlagen.",
    );
  return response;
}
function blank(): LocalApplication {
  return {
    id: crypto.randomUUID(),
    company: "",
    title: "",
    status: "Entwurf",
    notes: "",
    jobText: "",
    cvText: "",
    letter: "",
    cv: null,
    documentIds: [],
    results: {},
    sourceText: "",
    inputs: {},
  };
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LocalWorkspace() {
  const [state, setState] = useState<State | null>(null);
  const [app, setApp] = useState<LocalApplication | null>(null);
  const [feature, setFeature] = useState<Feature>("cv");
  const [result, setResult] = useState<unknown>(null);
  const source = app?.sourceText || "";
  function setSource(value: string) {
    change({ sourceText: value });
  }
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [location, setLocation] = useState("Schweiz");
  const [scenario, setScenario] = useState("follow_up");
  const [keywords, setKeywords] = useState("");
  const [message, setMessage] = useState("Lokale Daten werden geladen …");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [dirty, setDirty] = useState(false);
  const controller = useRef<AbortController | null>(null);
  async function refresh() {
    const data: State = await (await api("state")).json();
    setState(data);
    return data;
  }
  useEffect(() => {
    let active = true;
    api("state")
      .then((r) => r.json())
      .then((data: State) => {
        if (active) {
          setState(data);
          setApp(data.applications[0] || blank());
          setResult(
            data.applications[0]?.results.cv
              ? JSON.parse(data.applications[0].results.cv)
              : null,
          );
          setMessage("Bereit. Daten bleiben auf diesem Computer.");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  function change(patch: Partial<LocalApplication>) {
    setApp((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  }
  async function task(
    run: (signal: AbortSignal) => Promise<void>,
    cancelable = false,
  ) {
    setCanCancel(cancelable);
    setBusy(true);
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      await run(abort.signal);
    } catch (e) {
      setError(
        abort.signal.aborted
          ? "Vorgang abgebrochen. Bereits gespeicherte Daten bleiben erhalten."
          : e instanceof Error
            ? e.message
            : "Vorgang fehlgeschlagen.",
      );
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  async function persist(value: LocalApplication) {
    await api("save", value);
    setApp(value);
    setDirty(false);
    await refresh();
  }
  function switchApp(next: LocalApplication) {
    if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?"))
      return;
    setApp(next);
    setResult(next.results[feature] ? JSON.parse(next.results[feature]) : null);
    setDirty(false);
  }
  function inputFor() {
    if (!app || !state) throw new Error("Bitte eine Bewerbung öffnen.");
    const base = {
      language: state.settings.language,
      jobUrl: "https://offline.invalid/anzeige",
      jobText: app.jobText,
      cvData: app.cvText,
    };
    if (
      [
        "letter",
        "ats",
        "interview",
        "answer",
        "keywords",
        "required",
        "salary",
      ].includes(feature) &&
      app.jobText.trim().length < 50
    )
      throw new Error(
        "Bitte mindestens 50 Zeichen Stellenanzeigentext einfügen.",
      );
    if (["linkedin", "salary", "jobs"].includes(feature) && !app.cvText.trim())
      throw new Error(
        "Bitte zuerst einen Lebenslauf erstellen und geprüft übernehmen oder einfügen.",
      );
    if (
      ["letter", "ats", "refine", "gaps"].includes(feature) &&
      !app.cvText.trim()
    )
      throw new Error("Bitte zuerst einen Lebenslauf erstellen oder einfügen.");
    switch (feature) {
      case "cv":
        return {
          language: base.language,
          documentTexts: [
            source,
            ...state.documents
              .filter((d) => app.documentIds.includes(d.id))
              .map((d) => d.text),
          ].filter((t) => t.trim()),
        };
      case "letter":
        return {
          ...base,
          cvDaten: app.cvText,
          benutzerprofil: app.cv ? JSON.stringify(app.cv.personalInfo) : "",
          stilwahl: "Sachlich, persönlich und präzise",
        };
      case "ats":
        return { ...base, cv: app.cvText, coverLetter: app.letter };
      case "refine":
        return {
          language: base.language,
          cvText: app.cvText,
          coverLetterText: app.letter,
          missingKeywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        };
      case "answer":
        return { ...base, question, userAnswer: answer };
      case "linkedin":
        return { ...base, cvData: currentCv(app) };
      case "email":
        return {
          language: base.language,
          scenario,
          companyName: app.company,
          jobTitle: app.title,
        };
      case "gaps":
        return { language: base.language, cvText: app.cvText };
      case "style":
        return { language: base.language, textSample: source || app.letter };
      case "salary":
      case "jobs":
        return { ...base, cvData: currentCv(app), location };
      case "marketing":
        return {
          language: base.language,
          topic: source,
          format: "LinkedIn Post",
        };
      default:
        return base;
    }
  }
  async function generate(signal: AbortSignal) {
    if (!app?.company.trim() || !app.title.trim())
      throw new Error("Bitte Unternehmen und Position eintragen.");
    const input = inputFor();
    const pending = {
      ...app,
      inputs: { ...app.inputs, [feature]: JSON.stringify(input) },
    };
    await persist(pending);
    setMessage("Modell prüfen und Entwurf erstellen …");
    const output = await (await api("ai", { feature, input }, signal)).json();
    setResult(output);
    await persist({
      ...pending,
      results: { ...pending.results, [feature]: JSON.stringify(output) },
    });
    setMessage(
      "Entwurf gespeichert. Bitte mit den Quellen vergleichen, bearbeiten und ausdrücklich übernehmen.",
    );
    if (feature === "ats" && Array.isArray(output.missingKeywords))
      setKeywords(output.missingKeywords.join(", "));
  }
  async function accept() {
    if (!app || !result || typeof result !== "object") return;
    const out = result as Record<string, unknown>;
    let next = {
      ...app,
      results: { ...app.results, [feature]: JSON.stringify(result) },
    };
    if (feature === "cv") {
      const cv = GenerateCvFromDocumentsOutputSchema.parse(result);
      next = { ...next, cv, cvText: cvToText(cv) };
    }
    if (feature === "letter" && typeof out.motivationLetter === "string")
      next.letter = out.motivationLetter;
    if (
      feature === "refine" &&
      typeof out.refinedCvText === "string" &&
      typeof out.refinedCoverLetterText === "string"
    ) {
      next.cvText = out.refinedCvText;
      next.letter = out.refinedCoverLetterText;
    }
    if (feature === "gaps" && typeof out.filledCvText === "string")
      next.cvText = out.filledCvText;
    await persist(next);
    setMessage("Geprüfte Überarbeitung lokal gespeichert.");
  }
  async function upload(file: File, signal: AbortSignal, job = false) {
    if (!app) return;
    const response = await fetch("/api/local?op=upload", {
      method: "POST",
      headers: {
        "X-Local-Request": "1",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
      signal,
    });
    const document = await response.json();
    if (!response.ok) throw new Error(document.error);
    await refresh();
    change(
      job
        ? { jobText: document.text }
        : { documentIds: [...app.documentIds, document.id] },
    );
    setMessage(
      document.ocr
        ? "Lokal erkannt. OCR-Text bitte auf Lesefehler prüfen."
        : "Dokument lokal gespeichert. Text bitte prüfen.",
    );
  }
  if (!state || !app)
    return (
      <main className="local-shell">
        <h1>Motivationsboost · Lokal</h1>
        <p role="status">{message}</p>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  return (
    <main className="local-shell">
      <header className="local-header">
        <div>
          <p className="local-kicker">DEIN PRIVATER BEWERBUNGSARBEITSPLATZ</p>
          <h1>
            Motivationsboost <span>Lokal</span>
          </h1>
          <p>Dokumente, Entwürfe und KI-Verarbeitung auf diesem Computer.</p>
        </div>
        <div className="local-badge">Ollama · {state.model}</div>
      </header>
      <div className="local-status" role="status">
        {busy
          ? `Lokaler Vorgang läuft · ${seconds} Sekunden. Größere Dokumente können mehrere Minuten benötigen.`
          : message}{" "}
        {dirty && " • Ungespeicherte Änderungen"}
      </div>
      {error && (
        <p className="local-error" role="alert">
          {error}
        </p>
      )}
      {busy && canCancel && (
        <button
          className="local-cancel"
          onClick={() => controller.current?.abort()}
        >
          Vorgang abbrechen
        </button>
      )}
      <div className="local-grid">
        <aside className="local-panel">
          <h2>Bewerbungen</h2>
          <button disabled={busy} onClick={() => switchApp(blank())}>
            Neue Bewerbung
          </button>
          <nav aria-label="Bewerbungen">
            {state.applications.map((item) => (
              <button
                disabled={busy}
                aria-current={item.id === app.id ? "page" : undefined}
                className="local-application"
                key={item.id}
                onClick={() => switchApp(item)}
              >
                <strong>{item.company}</strong>
                <span>{item.title}</span>
                <small>{item.status}</small>
              </button>
            ))}
          </nav>
          <hr />
          <h2>Lokale Einrichtung</h2>
          <label className="local-field">
            Ausgabesprache
            <select
              aria-label="Ausgabesprache"
              disabled={busy}
              value={state.settings.language}
              onChange={(e) =>
                void task(async () => {
                  await api("settings", { language: e.target.value });
                  await refresh();
                })
              }
            >
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
              <option value="fr">Französisch</option>
              <option value="it">Italienisch</option>
            </select>
          </label>
          <button
            disabled={busy}
            onClick={() =>
              void task(async () => {
                const model = await (await api("model")).json();
                setMessage(
                  `${model.model}: lokal verfügbar (${model.capabilities.join(", ")}).`,
                );
              })
            }
          >
            Modell prüfen
          </button>
          <p className="local-small">
            Datenverzeichnis: <code>{state.dataDirectory}</code>
          </p>
          <p className="local-small">
            OCR:{" "}
            {state.ocr
              ? "Deutsch / Englisch installiert"
              : "Sprachdateien fehlen – setup:local ausführen"}
          </p>
          <button
            disabled={busy}
            onClick={() =>
              void task(async () => {
                download(
                  await (await api("backup")).blob(),
                  "Motivationsboost-Sicherung.zip",
                );
                setMessage("Sicherung mit Datenbank und Dokumenten erstellt.");
              })
            }
          >
            Sicherung herunterladen
          </button>
          <label className="local-field">
            Sicherung wiederherstellen
            <input
              aria-label="Sicherung wiederherstellen"
              type="file"
              accept=".zip"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file)
                  void task(async (signal) => {
                    const r = await fetch("/api/local?op=restore", {
                      method: "POST",
                      headers: { "X-Local-Request": "1" },
                      body: file,
                      signal,
                    });
                    const result = await r.json();
                    if (!r.ok) throw new Error(result.error);
                    await refresh();
                    setMessage(
                      `${result.applications} Bewerbungen wiederhergestellt. Bestehende Einträge wurden nicht überschrieben.`,
                    );
                  });
              }}
            />
          </label>
          <details>
            <summary>Zusatzfunktionen und Grenzen</summary>
            <p>
              Fotoerstellung ist nicht eingerichtet: dafür fehlt ein lokales
              Bildgenerierungsmodell mit geprüfter Fotobearbeitung.
              Spracherkennung ist nicht eingerichtet: dafür fehlen
              Whisper-Laufzeit und Sprachmodell. Sprachausgabe ist nicht
              eingerichtet: dafür fehlen eine lokale TTS-Laufzeit und geprüfte
              Stimme. Es werden keine Browser-Sprachdienste oder
              Cloud-Ersatzdienste aufgerufen.
            </p>
            <p>
              Handyzugriff ist deaktiviert. Die App ist ausschließlich über
              Loopback erreichbar.
            </p>
          </details>
        </aside>
        <section className="local-main">
          <fieldset disabled={busy} className="local-panel">
            <legend>Bewerbung bearbeiten</legend>
            <div className="local-columns">
              <label className="local-field">
                Unternehmen
                <input
                  aria-label="Unternehmen"
                  value={app.company}
                  onChange={(e) => change({ company: e.target.value })}
                />
              </label>
              <label className="local-field">
                Position
                <input
                  aria-label="Position"
                  value={app.title}
                  onChange={(e) => change({ title: e.target.value })}
                />
              </label>
            </div>
            <label className="local-field">
              Status
              <select
                aria-label="Status"
                value={app.status}
                onChange={(e) =>
                  change({
                    status: e.target.value as LocalApplication["status"],
                  })
                }
              >
                {[
                  "Entwurf",
                  "Gesendet",
                  "Interview",
                  "Zusage",
                  "Absage",
                  "Archiv",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="local-field">
              Notizen
              <textarea
                aria-label="Notizen"
                value={app.notes}
                onChange={(e) => change({ notes: e.target.value })}
              />
            </label>
            <div className="local-actions">
              <button
                onClick={() =>
                  void task(async () => {
                    await persist(app);
                    setMessage("Bewerbung gespeichert.");
                  })
                }
              >
                Bewerbung speichern
              </button>
              <button
                className="local-secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      "Diese Bewerbung löschen? Dokumente bleiben in der lokalen Bibliothek.",
                    )
                  )
                    void task(async () => {
                      await api("delete", { id: app.id });
                      const next = await refresh();
                      setApp(next.applications[0] || blank());
                      setResult(null);
                      setDirty(false);
                      setMessage("Bewerbung gelöscht.");
                    });
                }}
              >
                Bewerbung löschen
              </button>
            </div>
          </fieldset>
          <fieldset disabled={busy} className="local-panel">
            <legend>Quellen und Stellenanzeige</legend>
            <p>
              Arbeitszeugnisse, Diplome und Lebensläufe auswählen. Maximal 8 MB
              je Datei; PDF maximal 30 Seiten. Nur belegte Angaben übernehmen.
            </p>
            <label className="local-field">
              Dokument hinzufügen
              <input
                aria-label="Dokument hinzufügen"
                type="file"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void task((signal) => upload(file, signal), true);
                }}
              />
            </label>
            {state.documents.map((doc) => (
              <div className="local-document" key={doc.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={app.documentIds.includes(doc.id)}
                    onChange={(e) =>
                      change({
                        documentIds: e.target.checked
                          ? [...app.documentIds, doc.id]
                          : app.documentIds.filter((id) => id !== doc.id),
                      })
                    }
                  />{" "}
                  {doc.name}
                </label>
                <details>
                  <summary>Quelltext prüfen</summary>
                  <pre>{doc.text}</pre>
                  <a href={`/api/local?op=document&id=${doc.id}`}>
                    Original herunterladen
                  </a>
                </details>
              </div>
            ))}
            <label className="local-field">
              Zusätzlicher Quelltext / Text für Stilprüfung
              <textarea
                aria-label="Zusätzlicher Quelltext / Text für Stilprüfung"
                rows={5}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </label>
            <label className="local-field">
              Stellenanzeigentext
              <textarea
                aria-label="Stellenanzeigentext"
                rows={6}
                value={app.jobText}
                onChange={(e) => change({ jobText: e.target.value })}
              />
            </label>
            <label className="local-field">
              Stellenanzeige aus Datei
              <input
                aria-label="Stellenanzeige aus Datei"
                type="file"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file)
                    void task((signal) => upload(file, signal, true), true);
                }}
              />
            </label>
          </fieldset>
          <fieldset disabled={busy} className="local-panel">
            <legend>Lokale KI-Werkzeuge</legend>
            <label className="local-field">
              Funktion
              <select
                aria-label="Funktion"
                value={feature}
                onChange={(e) => {
                  const next = e.target.value as Feature;
                  setFeature(next);
                  setResult(
                    app.results[next] ? JSON.parse(app.results[next]) : null,
                  );
                }}
              >
                {Object.entries(features).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {feature === "answer" && (
              <>
                <label className="local-field">
                  Interviewfrage
                  <textarea
                    aria-label="Interviewfrage"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                </label>
                <label className="local-field">
                  Deine schriftliche Antwort
                  <textarea
                    aria-label="Deine schriftliche Antwort"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </label>
              </>
            )}
            {feature === "refine" && (
              <label className="local-field">
                Zu prüfende Schlüsselbegriffe (Komma getrennt)
                <input
                  aria-label="Zu prüfende Schlüsselbegriffe (Komma getrennt)"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </label>
            )}
            {(feature === "salary" || feature === "jobs") && (
              <label className="local-field">
                Arbeitsort
                <input
                  aria-label="Arbeitsort"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </label>
            )}
            {feature === "email" && (
              <label className="local-field">
                Anlass
                <select
                  aria-label="Anlass"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  <option value="follow_up">Nachfassen</option>
                  <option value="thank_you">Bedanken</option>
                  <option value="rejection_response">Antwort auf Absage</option>
                  <option value="acceptance">Zusage bestätigen</option>
                </select>
              </label>
            )}
            <p className="local-small">
              ATS- und Gehaltswerte sind unverbindliche Modellschätzungen ohne
              aktuelle Marktdaten oder Garantie. Alle Ergebnisse müssen fachlich
              geprüft werden. Suchstrategien enthalten keine nachgewiesenen
              offenen Stellen.
            </p>
            <button onClick={() => void task(generate, true)}>
              Mit Ollama erstellen
            </button>
            {result !== null && (
              <div className="local-draft">
                <h3>Entwurf prüfen und bearbeiten</h3>
                <p>
                  Die bisher übernommenen Bewerbungstexte bleiben bis zur
                  Übernahme erhalten.
                </p>
                <LocalResultEditor
                  value={result}
                  onChange={(value) => {
                    setResult(value);
                    change({
                      results: {
                        ...app.results,
                        [feature]: JSON.stringify(value),
                      },
                    });
                  }}
                />
                <div className="local-actions">
                  <button onClick={() => void task(async () => accept())}>
                    Geprüft übernehmen und speichern
                  </button>
                  <button
                    className="local-secondary"
                    onClick={() =>
                      void task(async () => {
                        await persist({
                          ...app,
                          results: {
                            ...app.results,
                            [feature]: JSON.stringify(result),
                          },
                        });
                        setMessage("Bearbeiteter Entwurf gespeichert.");
                      })
                    }
                  >
                    Nur Entwurf speichern
                  </button>
                </div>
              </div>
            )}
          </fieldset>
          <fieldset disabled={busy} className="local-panel">
            <legend>Geprüfte Texte und Export</legend>
            <label className="local-field">
              Lebenslauf – bearbeitbarer Exporttext
              <textarea
                aria-label="Lebenslauf – bearbeitbarer Exporttext"
                rows={12}
                value={app.cvText}
                onChange={(e) => change({ cvText: e.target.value })}
              />
            </label>
            <label className="local-field">
              Motivationsschreiben – bearbeitbarer Exporttext
              <textarea
                aria-label="Motivationsschreiben – bearbeitbarer Exporttext"
                rows={12}
                value={app.letter}
                onChange={(e) => change({ letter: e.target.value })}
              />
            </label>
            <p className="local-small">
              Diese geprüften Texte werden exportiert und für weitere
              KI-Funktionen verwendet. Änderungen vor dem Wechsel der Bewerbung
              speichern.
            </p>
            <div className="local-actions">
              {(["pdf", "docx", "zip"] as const).map((format) => (
                <button
                  key={format}
                  onClick={() =>
                    void task(async () => {
                      await persist(app);
                      download(
                        await (
                          await api("export", { application: app, format })
                        ).blob(),
                        `Bewerbung.${format}`,
                      );
                      setMessage(
                        "Export erstellt und im lokalen Exportverzeichnis gespeichert.",
                      );
                    })
                  }
                >
                  {format === "pdf"
                    ? "PDF exportieren"
                    : format === "docx"
                      ? "Word exportieren"
                      : "Vollständige Mappe (ZIP)"}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      </div>
    </main>
  );
}
