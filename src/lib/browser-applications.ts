import { z } from 'zod/v3';
import { applicationInput, applicationUpdate } from './application-input';

const application = applicationInput.extend({
  id: z.string().uuid(),
  jobUrl: applicationInput.shape.jobUrl.or(z.literal('')),
  notes: z.string().max(10000).nullish().transform(value => value ?? ''),
  status: applicationUpdate.shape.status,
  applicationDate: z.string().datetime({ offset: true }).optional(),
});
const records = z.array(application);
const backup = z.object({
  format: z.literal('Motivationsboost-Bewerbungen'),
  version: z.literal(1),
  applications: records,
}).strict();

export type BrowserApplication = z.infer<typeof application>;

export function readBrowserApplications(key: string) {
  const stored = localStorage.getItem(key);
  return stored === null ? [] : records.parse(JSON.parse(stored));
}

export function writeBrowserApplications(
  key: string,
  update: (current: BrowserApplication[]) => BrowserApplication[],
) {
  const next = records.parse(update(readBrowserApplications(key)));
  localStorage.setItem(key, JSON.stringify(next));
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
