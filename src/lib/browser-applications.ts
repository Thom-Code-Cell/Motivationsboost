import { z } from 'zod/v3';
import { applicationInput, applicationUpdate } from './application-input';
import { readLocalRecord, updateLocalRecord } from './local-workspace';

const application = applicationInput.extend({
  id: z.string().uuid(),
  jobUrl: applicationInput.shape.jobUrl.or(z.literal('')),
  notes: z.string().max(10000).nullish().transform(value => value ?? ''),
  status: applicationUpdate.shape.status,
  applicationDate: z.string().datetime({ offset: true }).optional(),
  dueDate: z.string().date().optional(),
});
const records = z.array(application);
const backup = z.object({
  format: z.literal('Motivationsboost-Bewerbungen'),
  version: z.literal(1),
  applications: records,
}).strict();

export type BrowserApplication = z.infer<typeof application>;

function readLegacyApplications(key: string) {
  const stored = localStorage.getItem(key);
  return stored === null ? [] : records.parse(JSON.parse(stored));
}

export async function readBrowserApplications(key: string) {
  const stored = await readLocalRecord(key);
  if (stored !== undefined) return records.parse(stored);
  return writeBrowserApplications(key, current => current);
}

export async function writeBrowserApplications(
  key: string,
  update: (current: BrowserApplication[]) => BrowserApplication[],
) {
  const next = await updateLocalRecord(key, stored => records.parse(update(
    stored === undefined ? readLegacyApplications(key) : records.parse(stored),
  )));
  try { localStorage.removeItem(key); } catch { /* IndexedDB already holds the verified copy. */ }
  return next;
}

export function mergeBrowserApplications(current: BrowserApplication[], incoming: unknown) {
  const merged = new Map(current.map(item => [item.id, item]));
  for (const item of records.parse(incoming)) {
    if (!merged.has(item.id)) merged.set(item.id, item);
  }
  return [...merged.values()];
}

export function readApplicationBackup(contents: string) {
  return backup.parse(JSON.parse(contents)).applications;
}

export function createApplicationBackup(applications: BrowserApplication[]) {
  return JSON.stringify(backup.parse({ format: 'Motivationsboost-Bewerbungen', version: 1, applications }), null, 2);
}
