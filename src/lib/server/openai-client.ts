// Server-only OpenAI API transport. Never expose OPENAI_API_KEY to client components.
import 'server-only';

const API_ROOT = 'https://api.openai.com/v1';
const DEFAULT_TIMEOUT_MS = 60_000;

export function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error('OpenAI ist noch nicht konfiguriert. OPENAI_API_KEY fehlt auf dem Server.');
  return key;
}

export async function callOpenAI(path: string, body: unknown): Promise<Response> {
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
    throw new Error('OpenAI ist vorübergehend nicht erreichbar. Bitte erneut versuchen.');
  }
  if (!response.ok) {
    if (response.status === 429) throw new Error('OpenAI-Limit erreicht. Bitte später erneut versuchen.');
    if (response.status === 401 || response.status === 403) throw new Error('OpenAI-Zugang ist nicht freigeschaltet. Bitte API-Key prüfen.');
    throw new Error(`OpenAI-Anfrage fehlgeschlagen (HTTP ${response.status}).`);
  }
  return response;
}

export async function callOpenAIForm(path: string, body: FormData): Promise<Response> {
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
