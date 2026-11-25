import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
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
  await page.goto('/app');
  await page.getByRole('button', { name: 'Neues Konto erstellen' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Synthetisches Konto');
  const email = `e2e-${randomUUID()}@example.test`;
  await page.getByLabel('E-Mail', { exact: true }).fill(email);
  await page.getByLabel(/^Passwort/).fill('Synthetic-only-passphrase-25');
  await page.getByRole('button', { name: 'Konto erstellen', exact: true }).click();
  await expect(page.getByText('Angemeldet als Synthetisches Konto')).toBeVisible();
  return email;
}

test('account session persists and exposes only its own application data', async ({ page, browser, baseURL }, testInfo) => {
  const email = await createAccount(page);
  await page.getByLabel('Stelle', { exact: true }).fill('Betriebsleitung');
  await page.getByLabel('Unternehmen', { exact: true }).fill('Test AG');
  await page.getByLabel('Link zum Inserat').fill('https://example.test/job');
  await page.getByLabel('Bewerbungsfrist (optional)').fill('2026-12-15');
  await page.getByRole('button', { name: 'Bewerbung hinzufügen' }).click();
  await expect(page.getByText('Betriebsleitung · Test AG')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Betriebsleitung · Test AG')).toBeVisible();
  await expect(page.getByLabel('Frist für Betriebsleitung')).toHaveValue('2026-12-15');
  await page.getByLabel('Datei lokal hinzufügen').setInputFiles({
    name: 'synthetischer-lebenslauf.txt', mimeType: 'text/plain',
    buffer: Buffer.from('Reiner Testinhalt für die lokale Ablage.'),
  });
  await expect(page.getByText('synthetischer-lebenslauf.txt · Lebenslauf')).toBeVisible();
  await page.reload();
  await expect(page.getByText('synthetischer-lebenslauf.txt · Lebenslauf')).toBeVisible();
  const camera = page.getByLabel('Unterlage fotografieren');
  await expect(camera).toHaveAttribute('capture', 'environment');
  await page.getByRole('combobox', { name: 'Kategorie', exact: true }).selectOption('Arbeitszeugnis');
  await camera.setInputFiles({ name: 'kamera-test.heic', mimeType: 'image/heic', buffer: Buffer.from('synthetic local file') });
  const evidence = page.getByLabel('Datei lokal hinzufügen');
  await evidence.setInputFiles(['seite-1.txt', 'seite-2.txt'].map(name => ({ name, mimeType: 'text/plain', buffer: Buffer.from('synthetic') })));
  await expect(page.getByText('seite-2.txt · Arbeitszeugnis')).toBeVisible();
  await page.reload();
  for (const name of ['kamera-test.heic', 'seite-1.txt', 'seite-2.txt']) {
    await expect(page.getByText(name + ' · Arbeitszeugnis')).toBeVisible();
  }
  const legacyBefore = await page.request.get('/api/v2/applications');
  expect((await legacyBefore.json()).applications).toEqual([]);
  expect((await page.request.post('/api/v2/applications', {
    headers: { Origin: baseURL! }, data: { jobTitle: 'No central write' },
  })).status()).toBe(410);
  const database = openTestDatabase();
  try {
    await database.query(
      `INSERT INTO applications (id, user_id, job_title, company, notes)
       SELECT $1, id, 'Ältere Bewerbung', 'Synthetik AG', 'Erhaltene Notiz' FROM "user" WHERE email = $2`,
      [randomUUID(), email],
    );
  } finally {
    await database.end();
  }
  await expect(page.getByText('Ältere Bewerbung · Synthetik AG')).toHaveCount(0);
  await page.getByRole('button', { name: 'Bisherige Serverdaten übernehmen' }).click();
  await expect(page.getByText('Ältere Bewerbung · Synthetik AG')).toBeVisible();
  await expect(page.getByText('Erhaltene Notiz')).toBeVisible();
  await page.getByRole('button', { name: 'Bisherige Serverdaten übernehmen' }).click();
  await expect(page.getByText('Ältere Bewerbung · Synthetik AG')).toHaveCount(1);
  const passphrase = randomUUID();
  await page.getByLabel('Sicherungs-Passphrase, optional').fill(passphrase);
  const exportedWorkspace = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Arbeitsplatz sichern', exact: true }).click();
  const backup = await exportedWorkspace;
  expect(backup.suggestedFilename()).toBe('motivationsboost-arbeitsplatz.mbbackup');
  if (testInfo.project.name === 'desktop' && process.env.MOTIVATIONS_LANDING_SCREENSHOT) {
    await page.getByRole('heading', { name: 'Meine Bewerbungen' }).locator('..').screenshot({
      path: process.env.MOTIVATIONS_LANDING_SCREENSHOT,
      animations: 'disabled',
    });
  }
  const other = await browser.newContext({ baseURL });
  try {
    const otherPage = await other.newPage();
    await createAccount(otherPage);
    await expect(otherPage.getByText('Noch keine Bewerbungen erfasst.')).toBeVisible();
    await expect(otherPage.getByText('synthetischer-lebenslauf.txt · Lebenslauf')).toHaveCount(0);
    const exported = await otherPage.request.get('/api/v2/account/export');
    expect(exported.ok()).toBe(true);
    expect((await exported.json()).applications).toEqual([]);
    await otherPage.getByRole('button', { name: 'Bisherige Serverdaten übernehmen' }).click();
    await expect(otherPage.getByRole('status')).toContainText('Vorhandene Serverdaten wurden');
    await expect(otherPage.getByText('Noch keine Bewerbungen erfasst.')).toBeVisible();
    await otherPage.getByLabel('Sicherungs-Passphrase, optional').fill(randomUUID());
    await otherPage.getByLabel('Arbeitsplatz wiederherstellen').setInputFiles((await backup.path())!);
    await expect(otherPage.getByText('Sicherung konnte nicht gelesen werden. Prüfe Datei und Passphrase.')).toBeVisible();
    await expect(otherPage.getByText('Noch keine Bewerbungen erfasst.')).toBeVisible();
    await otherPage.getByLabel('Sicherungs-Passphrase, optional').fill(passphrase);
    otherPage.once('dialog', dialog => void dialog.accept());
    await otherPage.getByLabel('Arbeitsplatz wiederherstellen').setInputFiles((await backup.path())!);
    await expect(otherPage.getByText('Betriebsleitung · Test AG')).toBeVisible();
    await expect(otherPage.getByText('synthetischer-lebenslauf.txt · Lebenslauf')).toBeVisible();
  } finally {
    await other.close();
  }
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible();
  expect((await page.request.get('/api/v2/account/export')).status()).toBe(401);
  await createAccount(page);
  await expect(page.getByText('Noch keine Bewerbungen erfasst.')).toBeVisible();
  await expect(page.getByText('synthetischer-lebenslauf.txt · Lebenslauf')).toHaveCount(0);
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
  const externalRequests: string[] = [];
  page.on('request', request => {
    if (request.url().endsWith('/api/v2/letter')) externalRequests.push(request.url());
  });
  await page.getByLabel('Lebenslauf und nachgewiesene Erfahrungen').fill('Ich habe mehrere Jahre ein kleines Team koordiniert und Arbeitsabläufe dokumentiert.');
  await page.getByLabel('Text der Stellenanzeige').fill('Gesucht wird eine verantwortungsvolle Person für die Koordination des Betriebs.');
  await page.getByLabel('Warum interessiert dich diese Stelle?').fill('ich die praktische Teamarbeit unterstütze');
  await page.getByLabel('Ein konkretes Beispiel aus deiner Erfahrung').fill('Ich habe eine Schichtplanung eingeführt');
  await page.getByLabel('Was möchtest du zum Unternehmen beitragen?').fill('Die Abläufe gemeinsam mit dem Team verbessern');
  await page.getByRole('button', { name: 'Motivationsschreiben erstellen' }).click();
  await expect(page.getByText(/Vorlagenentwurf erstellt/)).toBeVisible();
  expect(externalRequests).toEqual([]);
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
  for (const [format, label] of [['txt', 'Als Textdatei herunterladen'], ['pdf', 'Als PDF herunterladen'], ['docx', 'Als Word-Datei herunterladen']]) {
    const pendingDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: label }).click();
    const download = await pendingDownload;
    expect(download.suggestedFilename()).toBe('motivationsschreiben.' + format);
    const data = await readFile(await download.path());
    if (format === 'txt') expect(data.toString()).toContain(originalDraft);
    if (format === 'pdf') expect(data.subarray(0, 5).toString()).toBe('%PDF-');
    if (format === 'docx') {
      const zip = await JSZip.loadAsync(data);
      const xml = await zip.file('word/document.xml')?.async('string');
      expect(xml).toContain('Schichtplanung');
      expect(xml).toContain('human');
    }
  }
  expect(externalRequests).toEqual([]);
  await page.reload();
  await expect(page.getByLabel('Motivationsschreiben bearbeiten')).toHaveValue(originalDraft);
  await expect(page.getByRole('checkbox', { name: /Datenschutzhinweis beim Herunterladen/ })).not.toBeChecked();
});

test('legal pages render without horizontal overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dein nächster Schritt.');
  const menu = page.getByRole('button', { name: 'Menü' });
  if (await menu.isVisible()) await menu.click();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Kostenlos ausprobieren' })).toHaveAttribute('href', '/app');
  await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const productImages = page.getByRole('main').getByRole('img');
  for (const productImage of await productImages.all()) {
    await productImage.scrollIntoViewIfNeeded();
    await expect.poll(() => productImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  for (const [slug, heading] of [['impressum', 'Impressum'], ['datenschutz', 'Datenschutzhinweise'], ['agb', 'Nutzungsbedingungen']]) {
    await page.goto('/' + slug);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('thomas@th-analytica.com');
    await expect(page.getByRole('link', { name: 'TH Analytica' }).first()).toHaveAttribute('href', 'https://th-analytica.com');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'Über Motivationsboost' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'TH Analytica' })).toHaveAttribute('href', 'https://th-analytica.com');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain('SoftwareApplication');
  expect((await page.request.get('/llms.txt')).status()).toBe(404);
  expect(await (await page.request.get('/robots.txt')).text()).toContain('Disallow: /');
});

test('landing page fits a landscape tablet and its application link opens the auth route', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Separate tablet viewport in the desktop browser.');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Menü' }).click();
  await page.getByRole('banner').getByRole('link', { name: 'Kostenlos ausprobieren' }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible();
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
