import 'server-only';
import { z } from 'zod/v3';
import { weeklySandboxEnabled } from './payrexx-weekly';
import { payrexxConfiguration } from '../payrexx';

export const termsVersion = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/);

export function weeklyCheckoutConfiguration() {
  const webhook = payrexxConfiguration();
  const testProvider = z.string().regex(/^[1-9]\d{0,8}$/).transform(Number).safeParse(process.env.PAYREXX_SANDBOX_PSP_ID);
  const key = process.env.PAYREXX_SANDBOX_API_KEY;
  const signingKey = process.env.PAYREXX_SANDBOX_WEBHOOK_SIGNING_KEY;
  const approvedTerms = termsVersion.safeParse(process.env.PAYREXX_SANDBOX_TERMS_VERSION);
  if (!weeklySandboxEnabled() || !webhook.webhookEnabled || !webhook.origin || !process.env.DATABASE_URL ||
      !webhook.instance || !testProvider.success ||
      !key || key === webhook.key || !signingKey || signingKey === webhook.signingKey || !approvedTerms.success) return null;
  return { instance: webhook.instance, pspId: testProvider.data, key, signingKey, origin: webhook.origin, termsVersion: approvedTerms.data };
}
