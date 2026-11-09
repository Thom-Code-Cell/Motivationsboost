import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/lib/server/postgres', () => ({ databasePool: () => ({ query: mocks.query }) }));
import { createApplication, deleteApplication, listApplications, updateApplication } from '@/lib/server/applications-store';
import { reserveAiAction } from '@/lib/server/ai-quota-store';

const db = new PGlite();
beforeAll(async () => {
  await db.exec('CREATE TABLE "user" (id text PRIMARY KEY); INSERT INTO "user" (id) VALUES (\'alice\'), (\'bob\');');
  await db.exec(readFileSync('migrations/001_app_data.sql', 'utf8'));
  mocks.query.mockImplementation(async (sql: string, args: unknown[]) => {
    const result = await db.query(sql, args);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  });
});
afterAll(async () => { await db.close(); });

describe('PostgreSQL applicant ownership', () => {
  it('prevents another user from viewing, updating or deleting an application', async () => {
    const id = await createApplication('alice', { jobTitle: 'Koch', company: 'Beispiel', jobUrl: 'https://example.com/jobs/1' });
    expect(await listApplications('bob')).toHaveLength(0);
    expect(await updateApplication('bob', id, { status: 'Gesendet' })).toBe(false);
    expect(await deleteApplication('bob', id)).toBe(false);
    expect(await updateApplication('alice', id, { status: 'Gesendet' })).toBe(true);
    expect((await listApplications('alice'))[0]).toMatchObject({ status: 'Gesendet', jobTitle: 'Koch' });
    expect(await deleteApplication('alice', id)).toBe(true);
  });
  it('rejects input with a forged owner', async () => {
    await expect(createApplication('bob', { jobTitle: 'Koch', company: 'Beispiel', jobUrl: 'https://example.com', userId: 'alice' })).rejects.toThrow();
  });
});

describe('atomic PostgreSQL AI quota', () => {
  it('rejects concurrent requests above the free account limit', async () => {
    const now = new Date('2026-11-09T12:00:00Z');
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => reserveAiAction('bob', now)));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(3);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(7);
  });
});
