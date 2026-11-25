import 'server-only';
import { z } from 'zod/v3';
import { weeklySandboxEnabled } from './payrexx-weekly';
import { databaseConnectionConfigured } from './postgres';
import { payrexxConfiguration } from '../payrexx';
import { productOrigin, publicProductApproved } from '../public-product';
import { productionGmailConfiguration } from './gmail-api-mail';
import { commercialAiBudgetLimit } from './ai-spend-store';
import { hasCurrentAiApproval } from './openai-client';

export const termsVersion = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/);
const providerId = z.string().regex(/^[1-9]\d{0,8}$/).transform(Number);
export const weeklyGatewayValidityMinutes = 25;
const weeklyAccessWindowMs = (7 * 24 * 60 + weeklyGatewayValidityMinutes) * 60_000;

export function weeklyCheckoutConfiguration() {
  const webhook = payrexxConfiguration();
  const testProvider = providerId.safeParse(process.env.PAYREXX_SANDBOX_PSP_ID);
  const key = process.env.PAYREXX_SANDBOX_API_KEY;
  const configuredSigningKey = process.env.PAYREXX_SANDBOX_WEBHOOK_SIGNING_KEY;
  const signingKey = webhook.webhookEnabled && configuredSigningKey !== webhook.signingKey ? configuredSigningKey : undefined;
  const pollingEnabled = process.env.PAYREXX_SANDBOX_STATUS_POLLING === 'true';
  const approvedTerms = termsVersion.safeParse(process.env.PAYREXX_SANDBOX_TERMS_VERSION);
  if (!weeklySandboxEnabled() || (!pollingEnabled && !signingKey) || !webhook.origin || !databaseConnectionConfigured() ||
      !webhook.instance || !testProvider.success ||
      !key || key === webhook.key || !approvedTerms.success) return null;
  return { sandbox: true as const, instance: webhook.instance, pspId: testProvider.data, key, signingKey, pollingEnabled, origin: webhook.origin, termsVersion: approvedTerms.data };
}

export function weeklyLiveWebhookConfiguration() {
  const config = payrexxConfiguration();
  const provider = providerId.safeParse(process.env.PAYREXX_WEEKLY_LIVE_PSP_ID);
  if (process.env.VERCEL_ENV !== 'production' || !config.webhookEnabled ||
      !config.instance || config.origin !== productOrigin || !config.signingKey || !provider.success ||
      String(provider.data) === process.env.PAYREXX_SANDBOX_PSP_ID ||
      config.signingKey === process.env.PAYREXX_SANDBOX_WEBHOOK_SIGNING_KEY || !databaseConnectionConfigured()) return null;
  return { sandbox: false as const, instance: config.instance, pspId: provider.data, signingKey: config.signingKey, origin: config.origin };
}

export function weeklyLiveCheckoutConfiguration(verifiedEmail?: string) {
  const billing = payrexxConfiguration();
  const live = weeklyLiveWebhookConfiguration();
  const approvedTerms = termsVersion.safeParse(process.env.PAYREXX_WEEKLY_LIVE_TERMS_VERSION);
  const acceptanceRecipient = process.env.PAYREXX_WEEKLY_LIVE_ACCEPTANCE_EMAIL?.toLowerCase();
  const acceptance = Boolean(acceptanceRecipient && verifiedEmail?.toLowerCase() === acceptanceRecipient);
  if (!live || !billing.key || billing.key === process.env.PAYREXX_SANDBOX_API_KEY ||
      !approvedTerms.success || process.env.PAYREXX_WEEKLY_LIVE_CHECKOUT !== 'true' ||
      !(billing.enabled && publicProductApproved() || acceptance) ||
      process.env.EMAIL_TRANSPORT !== 'gmail-api' || !productionGmailConfiguration() ||
      !commercialAiBudgetLimit() || !hasCurrentAiApproval(Date.now() + weeklyAccessWindowMs) ||
      !process.env.OPENAI_API_KEY?.trim()) return null;
  return { ...live, key: billing.key, termsVersion: approvedTerms.data, pollingEnabled: true as const };
}
