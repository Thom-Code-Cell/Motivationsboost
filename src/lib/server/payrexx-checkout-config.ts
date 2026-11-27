import 'server-only';
import { z } from 'zod/v3';
import { weeklySandboxEnabled } from './payrexx-weekly';
import { databaseConnectionConfigured } from './postgres';
import { payrexxConfiguration } from '../payrexx';
import { productOrigin, publicProductApproved } from '../public-product';
import { productionGmailConfiguration } from './gmail-api-mail';
import { commercialAiBudgetLimit } from './ai-spend-store';
import { hasCurrentAiApproval, openAIKeyConfigured } from './openai-client';
import type { OneTimePlan } from '../plans';

export function creditPackTerms(plan: Exclude<OneTimePlan, 'weekly'>) {
  const enabled = plan === 'credits_small' ? process.env.PAYREXX_CREDITS_SMALL_ENABLED : process.env.PAYREXX_CREDITS_LARGE_ENABLED;
  const approved = termsVersion.safeParse(process.env.PAYREXX_CREDIT_PACK_TERMS_VERSION);
  return enabled === 'true' && approved.success ? approved.data : undefined;
}

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

export function livePayrexxReconciliationConfiguration() {
  const live = weeklyLiveWebhookConfiguration();
  const { key } = payrexxConfiguration();
  if (!live || !key || key === process.env.PAYREXX_SANDBOX_API_KEY) return null;
  return { ...live, key };
}

export function weeklyLiveCheckoutConfiguration(verifiedEmail?: string) {
  const billing = payrexxConfiguration();
  const live = livePayrexxReconciliationConfiguration();
  const approvedTerms = termsVersion.safeParse(process.env.PAYREXX_WEEKLY_LIVE_TERMS_VERSION);
  const acceptanceRecipient = process.env.PAYREXX_WEEKLY_LIVE_ACCEPTANCE_EMAIL?.toLowerCase();
  const publicCheckout = billing.enabled && publicProductApproved();
  const acceptance = Boolean(acceptanceRecipient && verifiedEmail?.toLowerCase() === acceptanceRecipient);
  if (!live || !approvedTerms.success || process.env.PAYREXX_WEEKLY_LIVE_CHECKOUT !== 'true' ||
      !(publicCheckout || acceptance) ||
      process.env.EMAIL_TRANSPORT !== 'gmail-api' || !productionGmailConfiguration() ||
      !commercialAiBudgetLimit() || !hasCurrentAiApproval(Date.now() + weeklyAccessWindowMs) ||
      !openAIKeyConfigured()) return null;
  return { ...live, termsVersion: approvedTerms.data, pollingEnabled: true as const, acceptanceOnly: !publicCheckout };
}
