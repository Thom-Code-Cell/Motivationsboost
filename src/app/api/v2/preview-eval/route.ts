import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { evidenceCaseInput, evidenceCases } from '../../../../../tests/fixtures/letter-evidence-cases';
import { letterEvidence, selectionFormat, selectionInstructions, validateEvidenceSelection } from '@/lib/letter-evidence';
import { providerTokenCounts } from '@/lib/ai-spend';
import { requireAppSession } from '@/lib/server/app-session';
import { reserveAiSpend, settleAiSpend } from '@/lib/server/ai-spend-store';
import { callOpenAI, hasCurrentAiApproval, OpenAIRequestError } from '@/lib/server/openai-client';
import { isRequestOriginAllowed } from '@/lib/security';

const candidates = [
  { model: 'gpt-4.1-mini', input: 0.4, output: 1.6, limit: 128 },
  { model: 'gpt-4.1', input: 2, output: 8, limit: 128 },
  { model: 'gpt-5-mini', input: 0.25, output: 2, limit: 512 },
] as const;

const enabled = () => process.env.VERCEL_ENV === 'preview' && hasCurrentAiApproval();
const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  if (!enabled()) return new NextResponse(null, { status: 404 });
  try { await requireAppSession(); } catch { return new NextResponse(null, { status: 401 }); }
  return new NextResponse('<!doctype html><html lang="de"><title>Motivationsboost – synthetischer Modellvergleich</title><main><h1>Synthetischer Modellvergleich</h1><form method="post"><button>12 synthetische Modelltests starten</button></form></main></html>', {
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(request: NextRequest) {
  if (!enabled()) return new NextResponse(null, { status: 404 });
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), true)) return new NextResponse(null, { status: 403 });
  let userId: string;
  try { userId = (await requireAppSession()).user.id; } catch { return new NextResponse(null, { status: 401 }); }

  const scores = await Promise.all(candidates.flatMap(model => evidenceCases.slice(0, 4).map(async item => {
    const values = evidenceCaseInput(item);
    const bank = letterEvidence(values);
    const body = {
      model: model.model, store: false, service_tier: 'default', max_output_tokens: model.limit,
      ...(model.model === 'gpt-5-mini' ? { reasoning: { effort: 'minimal' } } : {}),
      instructions: selectionInstructions,
      input: JSON.stringify({ job: item.job, language: item.locale, candidates: bank.filter(entry => entry.id === 'e1' || entry.id === 'e3') }),
      text: { format: selectionFormat },
    };

    const candidate = { model: model.model, caseId: item.id, locale: item.locale };
    const estimate = (input: number, output: number) => Math.ceil((input * model.input + output * model.output) * 1.1);
    const hash = createHash('sha256').update('evidence-selection-v1:' + model.model + ':' + item.id).digest('hex');
    const reqId = [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join('-');
    let receipt: string;
    try {
      receipt = await reserveAiSpend(userId, reqId, estimate(Buffer.byteLength(JSON.stringify(body)) + 2048, model.limit));
    } catch {
      return { ...candidate, status: 'reservation-blocked' };
    }
    const start = Date.now();
    try {
      const response = await callOpenAI('/responses', body, receipt);
      const durationMs = Date.now() - start;
      const data = await response.json() as { status?: string; usage?: unknown; output?: { content?: { type?: string; text?: string }[] }[] };
      const tokens = providerTokenCounts(data.usage);
      const costChfMicros = tokens && estimate(tokens.input, tokens.output);
      if (costChfMicros !== undefined) await settleAiSpend(receipt, costChfMicros);
      const text = data.output?.flatMap(part => part.content ?? []).find(part => part.type === 'output_text')?.text;
      const selected = text && validateEvidenceSelection(text, bank);
      return {
        ...candidate, status: data.status, durationMs, tokens, costChfMicros,
        accepted: Boolean(selected),
        bestEvidenceFirst: Boolean(selected && selected[0]?.id === 'e3'),
        selectedOnlyRelevant: Boolean(selected && selected.length === 1 && selected[0]?.id === 'e3'),
      };
    } catch (error) {
      if (error instanceof OpenAIRequestError &&
          ((error.status === 403 && error.code === 'model_not_found') || error.code === 'approval_expired')) {
        await settleAiSpend(receipt, 0).catch(() => {});
      }
      return error instanceof OpenAIRequestError
        ? { ...candidate, status: error.status, code: error.code, providerRequestId: error.providerRequestId }
        : { ...candidate, status: 'unknown-result' };
    }
  })));
  return NextResponse.json({ scores }, { headers });
}
