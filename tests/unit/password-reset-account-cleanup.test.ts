import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('clears orphaned resets and cascades only the deleted user’s reset records', async () => {
  const database = new PGlite();
  try {
    await database.exec(readFileSync('migrations/000_better_auth.sql', 'utf8'));
    await database.exec(`
      INSERT INTO "user" (id, name, email) VALUES
        ('leaving', 'Leaving', 'leaving@example.test'),
        ('staying', 'Staying', 'staying@example.test');
      INSERT INTO verification (id, identifier, value, "expiresAt") VALUES
        ('expired-orphan', 'reset-password:old', 'gone', now() - interval '1 hour'),
        ('leaving-reset', 'reset-password:first', 'leaving', now() + interval '1 hour'),
        ('staying-reset', 'reset-password:second', 'staying', now() + interval '1 hour'),
        ('other-verification', 'email-verification:other', 'leaving', now() + interval '1 hour');
    `);

    await database.exec(readFileSync('migrations/015_password_reset_account_cleanup.sql', 'utf8'));
    const afterMigration = await database.query<{ id: string }>('SELECT id FROM verification ORDER BY id');
    expect(afterMigration.rows.map(row => row.id)).toEqual(['leaving-reset', 'other-verification', 'staying-reset']);

    await database.query('DELETE FROM "user" WHERE id = $1', ['leaving']);
    const afterDeletion = await database.query<{ id: string }>('SELECT id FROM verification ORDER BY id');
    expect(afterDeletion.rows.map(row => row.id)).toEqual(['other-verification', 'staying-reset']);

    await expect(database.query(
      `INSERT INTO verification (id, identifier, value, "expiresAt")
        VALUES ('late-reset', 'reset-password:late', $1, now() + interval '1 hour')`,
      ['leaving'],
    )).rejects.toMatchObject({ code: '23503' });
  } finally {
    await database.close();
  }
});
