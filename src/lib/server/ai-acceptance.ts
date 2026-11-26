import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { providerTokenCounts, textCostChfMicros, previewTextModel } from '@/lib/ai-spend';
import { reserveAiSpend, settleAiSpend } from './ai-spend-store';

type AcceptanceContext = {
  userId: string;
  caseKey: string;
  metrics: { model?: string; durationMs?: number; tokens?: ReturnType<typeof providerTokenCounts>; costChfMicros?: number; reservedChfMicros?: number };
  requested: boolean;
};

const acceptance = new AsyncLocalStorage<AcceptanceContext>();

export function acceptanceContext() {
  return acceptance.getStore();
}

export function hasCurrentAcceptanceApproval(now = Date.now()) {
  const deadline = Date.parse(process.env.MOTIVATIONS_ACCEPTANCE_APPROVED_UNTIL ?? '');
  return process.env.VERCEL_ENV === 'preview' && Number.isFinite(deadline) && now < deadline;
}

export function acceptanceEnabled(userId: string) {
  return hasCurrentAcceptanceApproval() && Boolean(userId) && userId === process.env.MOTIVATIONS_ACCEPTANCE_USER_ID;
}

export async function withAcceptanceCase<T>(userId: string, caseKey: string, run: () => Promise<T>) {
  if (!acceptanceEnabled(userId)) throw new Error('Abnahmezugriff verweigert.');
  const context: AcceptanceContext = { userId, caseKey, metrics: {}, requested: false };
  return acceptance.run(context, async () => {
    try {
      const value = await run();
      return { ok: true as const, value, metrics: context.metrics };
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      return { ok: false as const, status, code, metrics: context.metrics };
    }
  });
}

export async function reserveAcceptance(path: string, body: unknown) {
  const context = acceptanceContext();
  if (!context) return undefined;
  if (context.requested) throw new Error('Pro Abnahmefall ist genau ein Anbieteraufruf erlaubt.');
  let amount: number;
  let model: string;
  if (path === '/responses' && body && typeof body === 'object' && 'model' in body &&
      body.model === previewTextModel && 'max_output_tokens' in body &&
      typeof body.max_output_tokens === 'number' && body.max_output_tokens > 0 && body.max_output_tokens <= 2048) {
    model = body.model;
    amount = textCostChfMicros(Buffer.byteLength(JSON.stringify(body)) + 2048, body.max_output_tokens, previewTextModel);
  } else if (path === '/audio/speech' && body && typeof body === 'object' && 'model' in body &&
      body.model === 'gpt-4o-mini-tts' && 'input' in body && typeof body.input === 'string' && Buffer.byteLength(body.input) <= 256) {
    model = body.model;
    amount = 100_000;
  } else {
    throw new Error('Abnahmeaufruf ohne freigegebene Preisobergrenze.');
  }

  context.requested = true;
  const hash = createHash('sha256').update('acceptance-v1:' + context.caseKey).digest('hex');
  const token = [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join('-');
  const receipt = await reserveAiSpend(context.userId, token, amount);
  Object.assign(context.metrics, { model, reservedChfMicros: amount });
  return receipt;
}

export async function recordAcceptance(receipt: string, started: number, response?: Response, wasRejected = false) {
  const context = acceptanceContext();
  if (!context) return;
  context.metrics.durationMs = Date.now() - started;
  if (wasRejected) {
    await settleAiSpend(receipt, 0);
    context.metrics.costChfMicros = 0;
    return;
  }
  if (!response || context.metrics.model === 'gpt-4o-mini-tts') return;
  const data = await response.clone().json().catch(() => null) as { usage?: unknown } | null;
  const tokens = providerTokenCounts(data?.usage);
  if (!tokens) return;
  context.metrics.tokens = tokens;
  const actual = textCostChfMicros(tokens.input, tokens.output, previewTextModel);
  await settleAiSpend(receipt, actual);
  context.metrics.costChfMicros = actual;
}
