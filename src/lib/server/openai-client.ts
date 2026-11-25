import { acceptanceContext, hasCurrentAcceptanceApproval, recordAcceptance, reserveAcceptance } from './ai-acceptance';

// Server-only OpenAI API transport. Never expose OPENAI_API_KEY to client components.

const API_ROOT = 'https://api.openai.com/v1';
const DEFAULT_TIMEOUT_MS = 60_000;

const knownFailureCodes = new Set([
  'invalid_api_key', 'insufficient_quota', 'billing_hard_limit_reached', 'model_not_found',
  'rate_limit_exceeded', 'insufficient_permissions', 'missing_scope', 'unsupported_value',
  'invalid_value', 'invalid_request_error', 'organization_not_verified', 'unsupported_parameter',
  'missing_required_parameter', 'invalid_type', 'model_not_available', 'model_not_supported',
]);

export class OpenAIRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code: string | null = null, readonly providerRequestId: string | null = null) {
    super(message);
  }
}

export function getTextModel(purpose?: 'letter'): string {
  if (purpose === 'letter' && process.env.OPENAI_LETTER_MODEL?.trim()) return process.env.OPENAI_LETTER_MODEL.trim();
  return process.env.OPENAI_MODEL?.trim() || 'gpt-6.1-terra';
}

export function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OpenAI ist noch nicht konfiguriert. OPENAI_API_KEY fehlt auf dem Server.');
  return key;
}

export function hasCurrentAiApproval(now = Date.now()): boolean {
  if (acceptanceContext()) return hasCurrentAcceptanceApproval(now);
  const expires = Date.parse(process.env.MOTIVATIONS_AI_PRICE_APPROVED_UNTIL ?? '');
  return process.env.MOTIVATIONS_PAID_AI_ENABLED === 'true' && Number.isFinite(expires) && now < expires;
}

function requireReservedAiCall(reservation?: string) {
  if (!reservation) throw new Error('Dieser KI-Aufruf besitzt keine Kostenreservierung.');
  if (!hasCurrentAiApproval()) throw new OpenAIRequestError('Die befristete KI-Freigabe ist abgelaufen.', 0, 'approval_expired');
}

export async function callOpenAI(path: string, body: unknown, spendReservation?: string): Promise<Response> {
  if (!hasCurrentAiApproval() && spendReservation) requireReservedAiCall(spendReservation);
  const receipt = spendReservation ?? (hasCurrentAiApproval() ? await reserveAcceptance(path, body) : undefined);
  try { requireReservedAiCall(receipt); } catch (error) {
    if (receipt && !spendReservation) await recordAcceptance(receipt, Date.now(), undefined, true);
    throw error;
  }
  const started = Date.now();
  const key = getOpenAIKey();
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch {
    throw new OpenAIRequestError('OpenAI ist vorübergehend nicht erreichbar. Bitte erneut versuchen.', 0);
  }
  if (!response.ok) {
    let code: string | null = null;
    try {
      const body = await response.json() as { error?: { code?: unknown; type?: unknown } };
      for (const value of [body.error?.code, body.error?.type]) {
        if (typeof value === 'string' && knownFailureCodes.has(value)) { code = value; break; }
      }
    } catch { /* Use only the HTTP status if the response is not a provider error object. */ }
    let message = 'OpenAI-Anfrage fehlgeschlagen (HTTP ' + response.status + ').';
    if (response.status === 429) message = 'OpenAI-Limit erreicht. Bitte später erneut versuchen.';
    if (response.status === 401 || response.status === 403) message = 'OpenAI-Zugang ist nicht freigeschaltet. Bitte API-Key prüfen.';
    const id = response.headers.get('x-request-id');
    const providerRequestId = id && /^req_[A-Za-z0-9_-]{1,100}$/.test(id) ? id : null;
    if (receipt && !spendReservation && response.status === 403 && code === 'model_not_found') {
      await recordAcceptance(receipt, started, undefined, true);
    }
    throw new OpenAIRequestError(message, response.status, code, providerRequestId);
  }
  if (receipt && !spendReservation) await recordAcceptance(receipt, started, response);
  return response;
}

export async function callOpenAIForm(path: string, body: FormData, spendReservation?: string): Promise<Response> {
  if (!hasCurrentAiApproval() && spendReservation) requireReservedAiCall(spendReservation);
  const receipt = spendReservation ?? (hasCurrentAiApproval() ? await reserveAcceptance(path, body) : undefined);
  try { requireReservedAiCall(receipt); } catch (error) {
    if (receipt && !spendReservation) await recordAcceptance(receipt, Date.now(), undefined, true);
    throw error;
  }
  const started = Date.now();
  const key = getOpenAIKey();
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    });
  } catch { throw new Error('OpenAI-Bilddienst antwortet nicht.'); }
  if (!response.ok) {
    let code: string | null = null;
    try {
      const payload = await response.json() as { error?: { code?: unknown } };
      const value = payload.error?.code;
      if (typeof value === 'string' && knownFailureCodes.has(value)) code = value;
    } catch { /* keep HTTP status */ }
    if (receipt && !spendReservation && response.status === 403 && code === 'model_not_found') {
      await recordAcceptance(receipt, started, undefined, true);
    }
    if (response.status === 429) throw new OpenAIRequestError('OpenAI-Bildlimit erreicht.', response.status, code);
    if (response.status === 401 || response.status === 403) throw new OpenAIRequestError('OpenAI-Bildzugang nicht freigeschaltet.', response.status, code);
    throw new Error(`OpenAI-Bildbearbeitung fehlgeschlagen (HTTP ${response.status}).`);
  }
  if (receipt && !spendReservation) await recordAcceptance(receipt, started, response);
  return response;
}
