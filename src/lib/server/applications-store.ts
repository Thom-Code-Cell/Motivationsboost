import 'server-only';
import { randomUUID } from 'node:crypto';
import { databasePool } from './postgres';
import { applicationInput, applicationUpdate } from '@/lib/application-input';

export async function listApplications(owner: string) {
  return (await databasePool().query(
    'SELECT id, job_title AS "jobTitle", company, job_url AS "jobUrl", status, notes, created_at AS "applicationDate" FROM applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200', [owner])).rows;
}
export async function createApplication(owner: string, payload: unknown) {
  const data = applicationInput.parse(payload);
  const id = randomUUID();
  await databasePool().query('INSERT INTO applications (id, user_id, job_title, company, job_url, notes) VALUES ($1, $2, $3, $4, $5, $6)', [id, owner, data.jobTitle, data.company, data.jobUrl, data.notes]);
  return id;
}
export async function updateApplication(owner: string, id: string, payload: unknown) {
  const { status } = applicationUpdate.parse(payload);
  const result = await databasePool().query('UPDATE applications SET status = $1, updated_at = now() WHERE id = $2 AND user_id = $3', [status, id, owner]);
  return result.rowCount === 1;
}
export async function deleteApplication(owner: string, id: string) {
  const result = await databasePool().query('DELETE FROM applications WHERE id = $1 AND user_id = $2', [id, owner]);
  return result.rowCount === 1;
}
