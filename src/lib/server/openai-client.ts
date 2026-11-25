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
  constructor(message: string, readonly status: number, readonly code: string | null = null) {
    super(message);
  }
}

export function getTextModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-6.1-terra';
}

export function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OpenAI ist noch nicht konfiguriert. OPENAI_API_KEY fehlt auf dem Server.');
  return key;
}

export async function callOpenAI(path: string, body: unknown, spendReservation?: string): Promise<Response> {
  if (!spendReservation) throw new Error('Dieser KI-Aufruf besitzt keine Kostenreservierung.');
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
    throw new OpenAIRequestError(message, response.status, code);
  }
  return response;
}

export async function callOpenAIForm(path: string, body: FormData, spendReservation?: string): Promise<Response> {
  if (!spendReservation) throw new Error('Dieser KI-Aufruf besitzt keine Kostenreservierung.');
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
    if (response.status === 429) throw new Error('OpenAI-Bildlimit erreicht.');
    if (response.status === 401 || response.status === 403) throw new Error('OpenAI-Bildzugang nicht freigeschaltet.');
    throw new Error(`OpenAI-Bildbearbeitung fehlgeschlagen (HTTP ${response.status}).`);
  }
  return response;
}
