import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { requireAppSession } from '@/lib/server/app-session';
import { reserveAiAction } from '@/lib/server/ai-quota-store';
import { AiSpendBlocked, DuplicateAiRequest, reserveAiSpend, settleAiSpend } from '@/lib/server/ai-spend-store';
import { approvedTextModel, maximumLetterCostChfMicros, previewTextModel, providerTokenCounts, providerUsageCost, type ApprovedTextModel } from '@/lib/ai-spend';
import { callOpenAI, getOpenAIKey, getTextModel, hasCurrentAiApproval, OpenAIRequestError } from '@/lib/server/openai-client';
import { isInternalTestMode } from '@/lib/server/internal-test';
import { isRequestOriginAllowed } from '@/lib/security';
import { guidedLetter, letterDraftInput, prepareExternalDraftInput } from '@/lib/letter-draft';
import { letterEvidence, renderEvidenceLetter, selectionFormat, selectionInstructions, validateEvidenceSelection } from '@/lib/letter-evidence';

const inputSchema = letterDraftInput.extend({
  allowExternalProcessing: z.boolean().optional(),
});
const selectionOutputTokens = 128;
const requestIdSchema = z.string().uuid();

function paidAiModel(): ApprovedTextModel | null {
  if (!hasCurrentAiApproval()) return null;
  const model = getTextModel('letter');
  if (model === approvedTextModel || (process.env.VERCEL_ENV === 'preview' && model === previewTextModel)) return model;
  return null;
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
  let model = parsed.data.allowExternalProcessing === true ? paidAiModel() : null;
  if (model) {
    try { getOpenAIKey(); } catch { model = null; }
  }
  if (!model) {
    return NextResponse.json({ letter: guidedLetter(parsed.data), mode: 'guided-template' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const requestId = requestIdSchema.safeParse(request.headers.get('idempotency-key'));
  if (!requestId.success) return NextResponse.json({ error: 'Die Anfragenummer fehlt oder ist ungültig.' }, { status: 400 });
  const values = prepareExternalDraftInput(parsed.data);
  const bank = letterEvidence(values);
  const candidates = bank.filter(item => item.kind !== 'unverified' && item.kind !== 'developmentGoal' && item.kind !== 'futureWork');
  const input = JSON.stringify({ job: values.job, language: values.language ?? 'de', candidates });
  if (Buffer.byteLength(input, 'utf8') > 40000) return NextResponse.json({ error: 'Die aufbereiteten Eingaben sind zu lang.' }, { status: 413 });
  let spendId: string;
  try { spendId = await reserveAiSpend(uid, requestId.data, maximumLetterCostChfMicros(input, selectionInstructions + JSON.stringify(selectionFormat), model, selectionOutputTokens)); }
  catch (error) {
    if (error instanceof DuplicateAiRequest) return NextResponse.json({ error: 'Diese Anfrage wurde bereits verarbeitet oder läuft noch.' }, { status: 409 });
    if (error instanceof AiSpendBlocked) return NextResponse.json({ error: 'Das KI-Kostenlimit ist erreicht oder die Freigabe pausiert.' }, { status: 429 });
    return NextResponse.json({ error: 'Das KI-Kostenlimit kann gerade nicht überprüft werden.' }, { status: 503 });
  }
  let quota: Awaited<ReturnType<typeof reserveAiAction>>;
  try { quota = await reserveAiAction(uid); }
  catch (error) {
    await settleAiSpend(spendId, 0).catch(() => {});
    const limited = error instanceof Error && error.message.includes('KI-Limit');
    return NextResponse.json({ error: limited ? 'Das KI-Limit für diesen Zeitraum ist erreicht.' : 'KI-Kontingent derzeit nicht verfügbar.' }, { status: limited ? 429 : 503 });
  }
  try {
    const started = Date.now();
    const response = await callOpenAI('/responses', {
      model, store: false, service_tier: 'default',
      max_output_tokens: selectionOutputTokens, instructions: selectionInstructions, input, text: { format: selectionFormat },
    }, spendId);
    const result = await response.json() as { status?: string; usage?: unknown; output_text?: string; output?: Array<{type?: string; content?: Array<{type?: string; text?: string}>}> };
    const actual = providerUsageCost(result.usage, model);
    if (actual !== undefined) await settleAiSpend(spendId, actual);
    if (result.status && result.status !== 'completed') throw new Error('incomplete');
    const letter = result.output_text ?? result.output?.flatMap(item => item.type === 'message' ? (item.content ?? []).filter(part => part.type === 'output_text').map(part => part.text ?? '') : []).join('');
    const selected = letter && validateEvidenceSelection(letter, bank);
    if (!selected) {
      return NextResponse.json({ letter: guidedLetter(values), quota, mode: 'evidence-template' }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (process.env.VERCEL_ENV === 'preview') {
      console.info('OpenAI preview letter request completed', { model, costChfMicros: actual ?? null, usage: result.usage ? providerTokenCounts(result.usage) : null, durationMs: Date.now() - started });
    }
    return NextResponse.json({ letter: renderEvidenceLetter(values.language ?? 'de', values.motivation, selected, bank), quota, mode: 'evidence-selection' }, { headers: { 'Cache-Control': 'no-store' } });
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
