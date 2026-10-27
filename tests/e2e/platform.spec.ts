import { test, expect, type Page } from '@playwright/test';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

// The established workflow is intentionally tested in German regardless of the runner's locale.
test.use({ locale: 'de-CH' });

async function login(page: Page) {
  const app = initializeApp({ apiKey: 'test-key', projectId: 'demo-motivationsboost', authDomain: 'demo-motivationsboost.firebaseapp.com', appId: 'test-app' });
  try {
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unique = `${Date.now()}-${Math.random()}`;
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: unique, email: `${unique}@example.test`, name: 'Alice Test', email_verified: true, iss: 'https://accounts.google.com', aud: 'test-client' })}.`;
    const result = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
    const serialized = JSON.stringify(result.user.toJSON());
    await page.addInitScript(value => localStorage.setItem('firebase:authUser:test-key:[DEFAULT]', value), serialized);
    await page.goto('/');
    for (const title of ['Unsere Nutzungsbedingungen haben sich geändert', 'Unsere Datenschutzerklärung wurde aktualisiert']) {
      const dialog = page.getByRole('dialog').filter({ has: page.getByText(title, { exact: true }) });
      await expect(dialog).toBeVisible({ timeout: 30000 });
      await dialog.locator('[data-radix-scroll-area-viewport]').evaluate(element => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll', { bubbles: false })); });
      const accept = dialog.getByRole('button').filter({ hasText: /akzeptiere|Akzeptieren|zustimmen/i });
      await expect(accept).toBeEnabled(); await accept.click();
    }
    await expect(page.getByRole('button', { name: 'Drive verbinden', exact: true })).toBeVisible();
  } finally { await deleteApp(app); }
}
async function navigate(page: Page, name: string) {
  await expect(page.getByRole('button', { name: 'Drive verbinden', exact: true })).toBeVisible({ timeout: 30000 });
  const button = page.getByRole('button', { name, exact: true });
  if ((page.viewportSize()?.width || 1280) < 768 && !(await button.first().isVisible())) await page.getByRole('button', { name: /Toggle Sidebar/i }).click();
  await expect(button.first()).toBeVisible();
  await button.first().click();
  const overlay = page.locator('[data-state="open"][data-sidebar="sidebar"]');
  if (await overlay.count()) await page.keyboard.press('Escape');
}
test('session, consent, persisted applications, core views and logout', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await navigate(page, 'Bewerbungsübersicht');
  await page.getByRole('button', { name: /Bewerbung.*hinzufügen|Neue Bewerbung/ }).first().click();
  await page.getByLabel('Jobtitel', { exact: true }).fill('Betriebsleitung');
  await page.getByLabel('Firma', { exact: true }).fill('Test AG');
  await page.getByLabel('Link zur Anzeige', { exact: true }).fill('https://example.org/job');
  await page.getByRole('button', { name: /Speichern|Hinzufügen/, exact: true }).click();
  await expect(page.getByText('Test AG', { exact: true })).toBeVisible();
  await page.reload();
  await navigate(page, 'Bewerbungsübersicht');
  await expect(page.getByText('Test AG', { exact: true })).toBeVisible();
  for (const [nav, heading] of [['CV-Generator', 'CV-Generator aus Zeugnissen'], ['Motivationsschreiben', 'Motivationsschreiben-Generator'], ['Bewerbungsanalyse', 'ATS-Check'], ['Interview-Coach', 'Interview'], ['Dokumente', 'Dokumente und Arbeitszeugnisse'], ['Export', 'Export']]) {
    await navigate(page, nav);
    await expect(page.getByRole('main')).toContainText(heading);
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
  await page.getByRole('button', { name: 'Konto öffnen' }).click();
  await page.getByRole('menuitem', { name: 'Abmelden' }).click();
  await expect(page.getByText('Drive verbinden', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('blocks unauthenticated admin and cross-site session requests', async ({ request }) => {
  expect((await request.get('/api/admin-stats')).status()).toBe(403);
  expect((await request.post('/api/session', { headers: { Origin: 'https://evil.example' }, data: { idToken: 'fake' } })).status()).toBe(403);
  expect((await request.post('/api/stripe/checkout-session', { data: { userId: 'fake', priceId: 'fake' } })).status()).toBe(503);
});

test('app language can be changed independently of document language', async ({ page }) => {
  await login(page);
  const interfacePicker = page.getByRole('combobox', { name: 'App-Sprache' });
  await expect(interfacePicker).toBeVisible();
  await interfacePicker.selectOption('en');
  await expect(page.getByRole('button', { name: 'Job search', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect Drive', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Sprache des generierten Dokuments' }).first()).toBeVisible();
});
