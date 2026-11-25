import { z } from 'zod/v3';

export const documentCategories = ['Lebenslauf', 'Arbeitszeugnis', 'Diplom oder Zertifikat', 'Bewerbungsfoto', 'Sonstige Bewerbungsunterlage'] as const;
export const maximumLocalFileBytes = 20 * 1024 * 1024;
export const maximumVaultBytes = 100 * 1024 * 1024;
export const localFileName = z.string().min(1).max(255).regex(/\.(pdf|docx|txt|jpe?g|png|webp|hei[cf])$/i);
const documentInfo = z.object({ id: z.string().uuid(), name: localFileName, category: z.enum(documentCategories) });
const localDocument = documentInfo.extend({ file: z.instanceof(Blob) });
export type LocalDocument = z.infer<typeof localDocument>;
export type LocalDocumentCategory = LocalDocument['category'];

export function isLocalDocumentName(name: string) {
  return localFileName.safeParse(name).success;
}

export function readLocalDocuments(value: unknown) {
  return value === undefined ? [] : z.array(localDocument).parse(value);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

function bytesFromBase64(value: string) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

const backupSchema = z.object({
  format: z.literal('Motivationsboost-Arbeitsplatz'),
  version: z.literal(1),
  applications: z.string(),
  draft: z.object({
    values: z.object({
      cv: z.string().max(12000), job: z.string().max(12000), motivation: z.string().max(1500),
      example: z.string().max(2000), contribution: z.string().max(1500),
    }).strict(),
    letter: z.string().max(30000),
  }).strict(),
  documents: z.array(documentInfo.extend({ content: z.string().min(1).max(Math.ceil(maximumLocalFileBytes / 3) * 4) })),
}).strict();
export type LocalWorkspaceDraft = z.infer<typeof backupSchema>['draft'];
export const emptyWorkspaceDraft: LocalWorkspaceDraft = {
  values: { cv: '', job: '', motivation: '', example: '', contribution: '' },
  letter: '',
};

export function parseWorkspaceDraft(value: unknown) {
  return value === undefined ? emptyWorkspaceDraft : backupSchema.shape.draft.parse(value);
}

export async function createWorkspaceBackup(applications: string, draft: LocalWorkspaceDraft, documents: LocalDocument[]) {
  const encoded = await Promise.all(documents.map(async ({ file, ...details }) => ({
    ...details,
    content: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
  })));
  return JSON.stringify(backupSchema.parse({
    format: 'Motivationsboost-Arbeitsplatz', version: 1, applications, draft, documents: encoded,
  }));
}

export function restoreWorkspaceBackup(contents: string) {
  const data = backupSchema.parse(JSON.parse(contents));
  let total = 0;
  const documents = data.documents.map(({ content, ...details }) => {
    const bytes = bytesFromBase64(content);
    total += bytes.byteLength;
    if (!bytes.byteLength || bytes.byteLength > maximumLocalFileBytes || total > maximumVaultBytes) {
      throw new Error('Oversized workspace backup');
    }
    return { ...details, file: new Blob([bytes], { type: 'application/octet-stream' }) };
  });
  return { ...data, documents };
}

const encryptionMarker = new TextEncoder().encode('MB-WORKSPACE-1\n');

async function backupKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, usage: 'encrypt' | 'decrypt') {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, [usage],
  );
}

export async function encryptWorkspaceBackup(contents: string, passphrase: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await backupKey(passphrase, salt, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encryptionMarker }, key, new TextEncoder().encode(contents),
  );
  return new Blob([encryptionMarker, salt, iv, ciphertext], { type: 'application/octet-stream' });
}

export async function readWorkspaceBackup(file: File, passphrase: string) {
  if (file.size > 144 * 1024 * 1024) throw new Error('Workspace backup file is too large');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!encryptionMarker.every((byte, index) => bytes[index] === byte)) {
    return restoreWorkspaceBackup(decoder.decode(bytes));
  }
  if (!passphrase) throw new Error('Passphrase required');
  const start = encryptionMarker.length;
  const salt = bytes.slice(start, start + 16);
  const iv = bytes.slice(start + 16, start + 28);
  const key = await backupKey(passphrase, salt, 'decrypt');
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: encryptionMarker }, key, bytes.subarray(start + 28),
  );
  return restoreWorkspaceBackup(decoder.decode(plaintext));
}
