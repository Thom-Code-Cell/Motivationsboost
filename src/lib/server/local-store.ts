import { DatabaseSync } from "node:sqlite";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { unzipSync, zipSync } from "fflate";
import { ApplicationSchema, SettingsSchema } from "@/lib/local-schema";
import { isLocalMode } from "@/lib/local-mode";

const DocumentSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[^\\/\x00-\x1f]+$/),
  mime: z.enum([
    "text/plain",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
    "image/webp",
  ]),
  text: z.string().max(200000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z
    .number()
    .int()
    .min(1)
    .max(8 * 1024 * 1024),
});
export type LocalDocument = z.infer<typeof DocumentSchema>;
export function dataDirectory() {
  if (!isLocalMode()) throw new Error("Lokaler Datenspeicher ist deaktiviert.");
  const root = path.resolve(
    process.env.LOCAL_DATA_DIR ||
      path.join(
        process.env.LOCALAPPDATA || process.cwd(),
        "Motivationsboost",
        "data",
      ),
  );
  mkdirSync(path.join(root, "documents"), { recursive: true });
  mkdirSync(path.join(root, "exports"), { recursive: true });
  return root;
}
function database() {
  const db = new DatabaseSync(
    path.join(dataDirectory(), "motivationsboost.sqlite"),
  );
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));",
  );
  return db;
}
function withDb<T>(run: (db: DatabaseSync) => T): T {
  const db = database();
  try {
    return run(db);
  } finally {
    db.close();
  }
}
function list(kind: string): unknown[] {
  return withDb((db) =>
    db
      .prepare("SELECT data FROM records WHERE kind=? ORDER BY rowid")
      .all(kind)
      .map((r) => JSON.parse(String(r.data))),
  );
}
function put(kind: string, id: string, value: unknown) {
  withDb((db) =>
    db
      .prepare(
        "INSERT INTO records(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data",
      )
      .run(kind, id, JSON.stringify(value)),
  );
}
export function listApplications() {
  return list("application").map((item) => ApplicationSchema.parse(item));
}
export function listDocuments() {
  return list("document").map((item) => DocumentSchema.parse(item));
}
export function getSettings() {
  return SettingsSchema.parse(list("settings")[0] || {});
}
export function saveSettings(value: unknown) {
  const settings = SettingsSchema.parse(value);
  put("settings", "user", settings);
  return settings;
}
export function saveApplication(value: unknown) {
  const app = ApplicationSchema.parse(value);
  const ids = new Set(listDocuments().map((doc) => doc.id));
  if (app.documentIds.some((id) => !ids.has(id)))
    throw new Error("Dokumentenverweis existiert nicht.");
  put("application", app.id, app);
  return app;
}
export function deleteApplication(id: string) {
  z.string().uuid().parse(id);
  withDb((db) =>
    db
      .prepare("DELETE FROM records WHERE kind=? AND id=?")
      .run("application", id),
  );
}
export function saveDocument(
  name: string,
  mime: string,
  text: string,
  bytes: Buffer,
) {
  if (/[\\/\x00-\x1f]/.test(name)) throw new Error("Ungültiger Dateiname.");
  const doc = DocumentSchema.parse({
    id: randomUUID(),
    name,
    mime,
    text,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  const file = path.join(dataDirectory(), "documents", doc.id);
  writeFileSync(file, bytes, { flag: "wx" });
  try {
    put("document", doc.id, doc);
  } catch (error) {
    rmSync(file);
    throw error;
  }
  return doc;
}
export function readDocument(id: string) {
  const doc = listDocuments().find((item) => item.id === id);
  if (!doc) throw new Error("Dokument nicht gefunden.");
  return {
    doc,
    bytes: readFileSync(path.join(dataDirectory(), "documents", doc.id)),
  };
}
export function saveExport(
  bytes: Uint8Array,
  extension: "pdf" | "docx" | "zip",
) {
  const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.${extension}`;
  writeFileSync(path.join(dataDirectory(), "exports", name), bytes, {
    flag: "wx",
  });
  return name;
}
const ExportSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9.-]+\.(pdf|docx|zip)$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const BackupSchema = z.object({
  version: z.literal(1),
  applications: z.array(ApplicationSchema).max(10000),
  documents: z.array(DocumentSchema).max(1000),
  settings: SettingsSchema,
  exports: z.array(ExportSchema).max(1000).default([]),
});
export function createBackup() {
  const root = dataDirectory();
  // Synchronous snapshot: no asynchronous mutation can interleave between DB and files.
  const manifest = {
    version: 1,
    applications: listApplications(),
    documents: listDocuments(),
    settings: getSettings(),
    exports: [] as z.infer<typeof ExportSchema>[],
  };
  const entries: Record<string, Uint8Array> = {
    "manifest.json": Buffer.from(JSON.stringify(manifest)),
  };
  let size = entries["manifest.json"].length;
  for (const doc of manifest.documents) {
    const bytes = readFileSync(path.join(root, "documents", doc.id));
    size += bytes.length;
    if (size > 100 * 1024 * 1024)
      throw new Error(
        "Sicherung über 100 MB: Datenverzeichnis bei gestoppter App manuell kopieren.",
      );
    entries[`documents/${doc.id}`] = bytes;
  }
  for (const name of readdirSync(path.join(root, "exports"))) {
    if (!/^[a-zA-Z0-9.-]+\.(pdf|docx|zip)$/.test(name)) continue;
    const bytes = readFileSync(path.join(root, "exports", name));
    size += bytes.length;
    if (size > 100 * 1024 * 1024)
      throw new Error(
        "Sicherung über 100 MB: Datenverzeichnis bei gestoppter App manuell kopieren.",
      );
    manifest.exports.push({
      name,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
    entries[`exports/${name}`] = bytes;
  }
  entries["manifest.json"] = Buffer.from(JSON.stringify(manifest));
  const snapshot = path.join(root, `backup-${randomUUID()}.sqlite`);
  try {
    withDb((db) => db.exec(`VACUUM INTO '${snapshot.replace(/'/g, "''")}'`));
    entries["motivationsboost.sqlite"] = readFileSync(snapshot);
    BackupSchema.parse(manifest);
    if (
      Object.values(entries).reduce((sum, bytes) => sum + bytes.length, 0) >
      100 * 1024 * 1024
    )
      throw new Error(
        "Sicherung über 100 MB: Datenverzeichnis bei gestoppter App manuell kopieren.",
      );
    return zipSync(entries, { level: 6 });
  } finally {
    if (existsSync(snapshot)) rmSync(snapshot);
  }
}
export function restoreBackup(bytes: Uint8Array) {
  if (bytes.length > 100 * 1024 * 1024) throw new Error("Archiv ist zu groß.");
  let total = 0;
  let count = 0;
  const names = new Set<string>();
  const entries = unzipSync(bytes, {
    filter: (file) => {
      total += file.originalSize;
      count++;
      if (
        total > 120 * 1024 * 1024 ||
        file.originalSize > 100 * 1024 * 1024 ||
        count > 2002 ||
        names.has(file.name) ||
        !/^(manifest\.json|motivationsboost\.sqlite|documents\/[a-f0-9-]{36}|exports\/[a-zA-Z0-9.-]+\.(pdf|docx|zip))$/.test(
          file.name,
        )
      )
        throw new Error("Unsicherer oder zu großer Archivinhalt.");
      names.add(file.name);
      return true;
    },
  });
  if (!entries["manifest.json"] || !entries["motivationsboost.sqlite"])
    throw new Error("Unvollständige Sicherung.");
  const manifest = BackupSchema.parse(
    JSON.parse(Buffer.from(entries["manifest.json"]).toString("utf8")),
  );
  const docIds = new Set(manifest.documents.map((d) => d.id));
  if (
    docIds.size !== manifest.documents.length ||
    new Set(manifest.applications.map((a) => a.id)).size !==
      manifest.applications.length ||
    manifest.applications.some((a) =>
      a.documentIds.some((id) => !docIds.has(id)),
    )
  )
    throw new Error("Inkonsistente Dokumentenverweise.");
  for (const doc of manifest.documents) {
    const content = entries[`documents/${doc.id}`];
    if (
      !content ||
      content.length !== doc.size ||
      createHash("sha256").update(content).digest("hex") !== doc.sha256
    )
      throw new Error("Beschädigtes Dokument in der Sicherung.");
  }
  for (const item of manifest.exports) {
    const content = entries[`exports/${item.name}`];
    if (
      !content ||
      createHash("sha256").update(content).digest("hex") !== item.sha256
    )
      throw new Error("Beschädigter Export in der Sicherung.");
  }
  const root = dataDirectory();
  const current = new Set([
    ...listApplications().map((a) => a.id),
    ...listDocuments().map((d) => d.id),
  ]);
  const mapping = new Map<string, string>();
  for (const doc of manifest.documents)
    mapping.set(doc.id, current.has(doc.id) ? randomUUID() : doc.id);
  const written: string[] = [];
  try {
    withDb((db) => {
      db.exec("BEGIN IMMEDIATE");
      try {
        const insert = db.prepare(
          "INSERT INTO records(kind,id,data) VALUES(?,?,?)",
        );
        for (const doc of manifest.documents) {
          const id = mapping.get(doc.id)!;
          const file = path.join(root, "documents", id);
          writeFileSync(file, entries[`documents/${doc.id}`], { flag: "wx" });
          written.push(file);
          insert.run("document", id, JSON.stringify({ ...doc, id }));
        }
        for (const app of manifest.applications) {
          const id = current.has(app.id) ? randomUUID() : app.id;
          insert.run(
            "application",
            id,
            JSON.stringify({
              ...app,
              id,
              documentIds: app.documentIds.map((d) => mapping.get(d)!),
            }),
          );
        }
        for (const item of manifest.exports) {
          const file = path.join(
            root,
            "exports",
            existsSync(path.join(root, "exports", item.name))
              ? `${randomUUID()}${path.extname(item.name)}`
              : item.name,
          );
          writeFileSync(file, entries[`exports/${item.name}`], { flag: "wx" });
          written.push(file);
        }
        // Merge, never overwrite existing settings or records. Do not execute uploaded SQLite.
        db.prepare(
          "INSERT OR IGNORE INTO records(kind,id,data) VALUES(?,?,?)",
        ).run("settings", "user", JSON.stringify(manifest.settings));
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    });
  } catch (error) {
    for (const file of written) rmSync(file, { force: true });
    throw error;
  }
  return {
    applications: manifest.applications.length,
    documents: manifest.documents.length,
  };
}
