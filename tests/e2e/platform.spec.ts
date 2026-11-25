import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { openTestDatabase } from './setup';

test.use({ locale: 'de-CH' });
test.beforeEach(async () => {
  // Separate tests share one loopback IP. Each scenario starts with a fresh test rate window.
  const database = openTestDatabase();
  try {
    await database.query('DELETE FROM "rateLimit"');
  } finally {
    await database.end();
  }
});

async function createAccount(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Neues Konto erstellen' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Synthetisches Konto');
  await page.getByLabel('E-Mail', { exact: true }).fill(`e2e-${randomUUID()}@example.test`);
  await page.getByLabel(/^Passwort/).fill('Synthetic-only-passphrase-25');
  await page.getByRole('button', { name: 'Konto erstellen', exact: true }).click();
  await expect(page.getByText('Angemeldet als Synthetisches Konto')).toBeVisible();
}

test('account session persists and exposes only its own application data', async ({ page, browser, baseURL }) => {
  await createAccount(page);
  await page.getByLabel('Stelle', { exact: true }).fill('Betriebsleitung');
  await page.getByLabel('Unternehmen', { exact: true }).fill('Test AG');
  await page.getByLabel('Link zum Inserat').fill('https://example.test/job');
  await page.getByRole('button', { name: 'Bewerbung hinzufügen' }).click();
  await expect(page.getByText('Betriebsleitung · Test AG')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Betriebsleitung · Test AG')).toBeVisible();
  const other = await browser.newContext({ baseURL });
  try {
    const otherPage = await other.newPage();
    await createAccount(otherPage);
    await expect(otherPage.getByText('Noch keine Bewerbungen erfasst.')).toBeVisible();
    const exported = await otherPage.request.get('/api/v2/account/export');
    expect(exported.ok()).toBe(true);
    expect((await exported.json()).applications).toEqual([]);
  } finally {
    await other.close();
  }
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible();
  expect((await page.request.get('/api/v2/account/export')).status()).toBe(401);
});

test('blocks anonymous access and cross-site application writes', async ({ request }) => {
  expect((await request.get('/api/admin-stats')).status()).toBe(404);
  expect((await request.post('/api/session', { data: {} })).status()).toBe(410);
  expect((await request.get('/api/v2/applications')).status()).toBe(401);
  expect((await request.post('/api/v2/applications', {
    headers: { Origin: 'https://untrusted.example' }, data: {},
  })).status()).toBe(403);
});

test('guided draft and optional translated notice are separate', async ({ page }) => {
  await createAccount(page);
  await page.getByLabel('Lebenslauf und nachgewiesene Erfahrungen').fill('Ich habe mehrere Jahre ein kleines Team koordiniert und Arbeitsabläufe dokumentiert.');
  await page.getByLabel('Text der Stellenanzeige').fill('Gesucht wird eine verantwortungsvolle Person für die Koordination des Betriebs.');
  await page.getByLabel('Warum interessiert dich diese Stelle?').fill('ich die praktische Teamarbeit unterstütze');
  await page.getByLabel('Ein konkretes Beispiel aus deiner Erfahrung').fill('Ich habe eine Schichtplanung eingeführt');
  await page.getByLabel('Was möchtest du zum Unternehmen beitragen?').fill('Die Abläufe gemeinsam mit dem Team verbessern');
  await page.getByRole('button', { name: 'Motivationsschreiben erstellen' }).click();
  await expect(page.getByText(/Vorlagenentwurf erstellt/)).toBeVisible();
  const draft = page.getByLabel('Motivationsschreiben bearbeiten');
  await expect(draft).toHaveValue(/Schichtplanung/);
  const originalDraft = await draft.inputValue();
  const notice = page.getByLabel('Datenschutzhinweis zum Kopieren');
  const germanNotice = await notice.inputValue();
  await page.getByLabel('Sprache des Datenschutzhinweises').selectOption('en');
  await expect(notice).not.toHaveValue(germanNotice);
  await expect(page.getByText('Vorschau des angehängten Hinweises')).toHaveCount(0);
  await page.getByRole('checkbox', { name: /Datenschutzhinweis beim Herunterladen/ }).check();
  await expect(page.getByText('Vorschau des angehängten Hinweises')).toBeVisible();
  await expect(draft).toHaveValue(originalDraft);
});

test('legal pages render without horizontal overflow', async ({ page }) => {
  for (const [slug, heading] of [['impressum', 'Impressum'], ['datenschutz', 'Datenschutzhinweise'], ['agb', 'Nutzungsbedingungen']]) {
    await page.goto('/' + slug);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('thomas@th-analytica.com');
    await expect(page.getByRole('link', { name: 'TH Analytica' }).first()).toHaveAttribute('href', 'https://th-analytica.com');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});

test('checkout is disabled even when all three proposed plans are visible', async ({ request }) => {
  for (const path of ['/api/stripe/checkout-session', '/api/stripe/create-portal-session', '/api/stripe/webhook', '/api/payrexx/checkout']) {
    expect((await request.post(path, { data: { plan: 'monthly' } })).status()).toBe(503);
  }
  const result = await request.get('/api/payrexx/plans');
  expect(result.ok()).toBe(true);
  const data = await result.json();
  expect(data.enabled).toBe(false);
  expect(data.plans.map(({ id }: { id: string }) => id)).toEqual(['weekly', 'monthly', 'yearly']);
});
