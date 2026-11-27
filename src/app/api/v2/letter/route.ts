import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { requireAppSession } from '@/lib/server/app-session';
import { reserveAiAction } from '@/lib/server/ai-quota-store';
import { AiSpendBlocked, commercialAiBudgetLimit, DuplicateAiRequest, reserveAiSpend, settleAiSpend } from '@/lib/server/ai-spend-store';
import { commercialTextModel, maximumLetterCostChfMicros, previewTextModel, providerTokenCounts, providerUsageCost } from '@/lib/ai-spend';
import { callOpenAI, getOpenAIKey, hasCurrentAiApproval, OpenAIRequestError } from '@/lib/server/openai-client';
import { creditBalance, InsufficientCredits } from '@/lib/server/ai-credits';
import { isInternalTestMode } from '@/lib/server/internal-test';
import { letterCredits } from '@/lib/plans';
import { publicProductApproved } from '@/lib/public-product';
import { isRequestOriginAllowed } from '@/lib/security';
import { guidedLetter, letterDraftInput, prepareExternalDraftInput } from '@/lib/letter-draft';
import { letterEvidence, renderEvidenceLetter, selectionFormat, selectionInstructions, validateEvidenceSelection } from '@/lib/letter-evidence';

const inputSchema = letterDraftInput.extend({
  allowExternalProcessing: z.boolean().optional(),
  confirmedCreditCost: z.number().int().optional(),
});
const selectionOutputTokens = 128;
const requestIdSchema = z.string().uuid();

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };
const sandbox = () => process.env.VERCEL_ENV === 'preview';

function paidAiModel() {
  if (!sandbox() && !commercialAiBudgetLimit()) return null;
  if (!hasCurrentAiApproval() || (!sandbox() && process.env.NODE_ENV === 'production' && !publicProductApproved())) return null;
  try { getOpenAIKey(); } catch { return null; }
  return sandbox() ? previewTextModel : commercialTextModel;
}

export async function GET() {
  let uid: string;
  try { uid = (await requireAppSession()).user.id; }
  catch { return NextResponse.json({ available: false }, { ...noStore, status: 401 }); }
  try {
    return NextResponse.json({ available: Boolean(paidAiModel()), cost: letterCredits, balance: await creditBalance(uid, sandbox()) }, noStore);
  } catch {
    return NextResponse.json({ available: false, cost: letterCredits, balance: null }, { ...noStore, status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production')) return NextResponse.json({ error: 'Ungültiger Ursprung.' }, { status: 403 });
  let uid: string;
  try { uid = (await requireAppSession()).user.id; } catch { return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 }); }
  let raw: string;
  try { raw = await request.text(); } catch { return NextResponse.json({ error: 'Eingabe nicht lesbar.' }, { status: 400 }); }
  if (Buffer.byteLength(raw, 'utf8') > 40000) return NextResponse.json({ error: 'Eingabe zu gross.' }, { status: 413 });
  let parsed: z.SafeParseReturnType<unknown, z.infer<typeof inputSchema>>;
  try { parsed = inputSchema.safeParse(JSON.parse(raw)); } catch { return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: 'Bitte Lebenslauf, Stellenanzeige und persönliche Angaben vollständig ausfüllen.' }, { status: 400 });
  if (isInternalTestMode()) {
    let quota: Awaited<ReturnType<typeof reserveAiAction>>;
    try { quota = await reserveAiAction(uid); }
    catch { return NextResponse.json({ error: 'Testkontingent derzeit nicht verfügbar.' }, { status: 503 }); }
    const { motivation, example, contribution } = parsed.data;
    const letter = [
      'Sehr geehrte Damen und Herren,',
      '',
      `Ihre ausgeschriebene Stelle interessiert mich, weil ${motivation.replace(/[.!?]+$/, '')}.`,
      '',
      `Ein passendes Beispiel aus meiner Erfahrung: ${example.replace(/[.!?]+$/, '')}.`,
      '',
      `In Ihrem Unternehmen möchte ich insbesondere Folgendes beitragen: ${contribution.replace(/[.!?]+$/, '')}.`,
      '',
      'Die Angaben in diesem Entwurf stammen ausschliesslich aus meinen Eingaben. Bitte prüfe und ergänze den Text, bevor du ihn verwendest.',
      '',
      'Freundliche Grüsse',
      '[Name ergänzen]',
    ].join('\n');
    return NextResponse.json({ letter, quota, mode: 'internal-test' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const model = parsed.data.allowExternalProcessing === true ? paidAiModel() : null;
  if (!model) {
    return NextResponse.json({ letter: guidedLetter(parsed.data), mode: 'guided-template' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (parsed.data.confirmedCreditCost !== letterCredits) {
    return NextResponse.json({ error: 'Bitte bestätige den aktuellen Credit-Preis.', code: 'credit_confirmation_required' }, { ...noStore, status: 409 });
  }
  const requestId = requestIdSchema.safeParse(request.headers.get('idempotency-key'));
  if (!requestId.success) return NextResponse.json({ error: 'Die Anfragenummer fehlt oder ist ungültig.' }, { status: 400 });
  const values = prepareExternalDraftInput(parsed.data);
  const bank = letterEvidence(values);
  const candidates = bank.filter(item => item.kind !== 'unverified' && item.kind !== 'developmentGoal' && item.kind !== 'futureWork');
  const input = JSON.stringify({ job: values.job, language: values.language ?? 'de', candidates });
  if (Buffer.byteLength(input, 'utf8') > 40000) return NextResponse.json({ error: 'Die aufbereiteten Eingaben sind zu lang.' }, { status: 413 });
  let spendId: string;
  try {
    const cost = maximumLetterCostChfMicros(input, selectionInstructions + JSON.stringify(selectionFormat), model, selectionOutputTokens);
    spendId = await reserveAiSpend(uid, requestId.data, Math.ceil(cost * 1.25), { credits: letterCredits, sandbox: sandbox() });
  }
  catch (error) {
    if (error instanceof InsufficientCredits) return NextResponse.json({ error: 'Das Guthaben reicht für diese KI-Aktion nicht aus.', code: 'insufficient_credits' }, { ...noStore, status: 429 });
    if (error instanceof DuplicateAiRequest) return NextResponse.json({ error: 'Diese Anfrage wurde bereits verarbeitet oder läuft noch.' }, { status: 409 });
    if (error instanceof AiSpendBlocked) return NextResponse.json({ error: 'Das KI-Kostenlimit ist erreicht oder die Freigabe pausiert.' }, { status: 429 });
    return NextResponse.json({ error: 'Das KI-Kostenlimit kann gerade nicht überprüft werden.' }, { status: 503 });
  }
  try {
    const started = Date.now();
    const response = await callOpenAI('/responses', {
      model, store: false, service_tier: 'default',
      ...(model === commercialTextModel && { reasoning: { effort: 'none' } }),
      max_output_tokens: selectionOutputTokens, instructions: selectionInstructions, input, text: { format: selectionFormat },
    }, spendId);
    const result = await response.json() as { status?: string; usage?: unknown; output_text?: string; output?: Array<{type?: string; content?: Array<{type?: string; text?: string}>}> };
    const actual = providerUsageCost(result.usage, model);
    if (actual !== undefined) await settleAiSpend(spendId, actual);
    if (result.status && result.status !== 'completed') throw new Error('incomplete');
    const letter = result.output_text ?? result.output?.flatMap(item => item.type === 'message' ? (item.content ?? []).filter(part => part.type === 'output_text').map(part => part.text ?? '') : []).join('');
    const selected = letter && validateEvidenceSelection(letter, bank);
    if (!selected) {
      return NextResponse.json({ letter: guidedLetter(values), mode: 'evidence-template' }, noStore);
    }
    if (process.env.VERCEL_ENV === 'preview') {
      console.info('OpenAI preview letter request completed', { model, costChfMicros: actual ?? null, usage: result.usage ? providerTokenCounts(result.usage) : null, durationMs: Date.now() - started });
    }
    return NextResponse.json({ letter: renderEvidenceLetter(values.language ?? 'de', values.motivation, selected, bank), mode: 'evidence-selection' }, noStore);
  } catch (error) {
    if (error instanceof OpenAIRequestError &&
        ((error.status === 403 && error.code === 'model_not_found') || (error.status === 0 && error.code === 'approval_expired'))) {
      await settleAiSpend(spendId, 0).catch(() => {});
    }
    if (process.env.VERCEL_ENV === 'preview') {
      console.warn('OpenAI preview letter request failed', error instanceof OpenAIRequestError
        ? { status: error.status, code: error.code, providerRequestId: error.providerRequestId }
        : { status: null, code: 'invalid_provider_result' });
    }
    return NextResponse.json({ error: 'Der Entwurf konnte nicht erstellt werden. Bitte später erneut versuchen.' }, { status: 502 });
  }
}
