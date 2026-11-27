import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAppSession } from '@/lib/server/app-session';
import { reserveProductionAiSmoke, settleAiSpend, DuplicateAiRequest } from '@/lib/server/ai-spend-store';
import { commercialTextModel, maximumLetterCostChfMicros, providerUsageCost } from '@/lib/ai-spend';
import { callOpenAI, getOpenAIKey, hasCurrentAiApproval, OpenAIRequestError } from '@/lib/server/openai-client';
import { isRequestOriginAllowed } from '@/lib/security';

const noStore = { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } };
const instructions = 'Return only the selected synthetic evidence identifier.';
const input = 'The example applicant coordinates invoices. Select the matching identifier: invoice-1 or travel-2.';
const maxOutput = 64;

function currentTest() {
  const email = process.env.MOTIVATIONS_PRODUCTION_SMOKE_EMAIL?.toLowerCase();
  const deadline = Date.parse(process.env.MOTIVATIONS_PRODUCTION_SMOKE_UNTIL ?? '');
  if (process.env.VERCEL_ENV !== 'production' || !email || !Number.isFinite(deadline) ||
      deadline <= Date.now() || !hasCurrentAiApproval()) return null;
  return { email, deadline };
}

async function verifiedTestUser(email: string) {
  const session = await requireAppSession().catch(() => null);
  const user = session?.user;
  if (user && 'emailVerified' in user && user.emailVerified === true && user.email.toLowerCase() === email) return user;
}

export async function GET() {
  const test = currentTest();
  if (!test || !await verifiedTestUser(test.email)) return new NextResponse(null, { ...noStore, status: 404 });
  return new NextResponse('<!doctype html><html lang="de"><meta charset="utf-8"><title>Motivationsboost · KI-Abnahme</title>' +
    '<h1>Einmalige KI-Abnahme</h1><p>Dieser Test sendet eine synthetische Eingabe. Es wird keine Zahlung ausgelöst.</p>' +
    '<form method="post"><button type="submit">Synthetischen KI-Test ausführen</button></form></html>', {
    headers: { ...noStore.headers, 'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'" },
  });
}

export async function POST(request: NextRequest) {
  const test = currentTest();
  if (!test) return new NextResponse(null, { ...noStore, status: 404 });
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), true))
    return new NextResponse(null, { ...noStore, status: 403 });
  const user = await verifiedTestUser(test.email);
  if (!user) return new NextResponse(null, { ...noStore, status: 404 });
  const { deadline } = test;
  try { getOpenAIKey(); } catch { return NextResponse.json({ ok: false, code: 'provider-unconfigured' }, { ...noStore, status: 503 }); }

  const hash = createHash('sha256').update('motivationsboost-production-smoke-v1:' + deadline).digest('hex');
  const requestId = [hash.slice(0, 8), hash.slice(8, 12), '4' + hash.slice(13, 16),
    '8' + hash.slice(17, 20), hash.slice(20, 32)].join('-');
  const reserved = Math.ceil(maximumLetterCostChfMicros(input, instructions + 'chosen, invoice-1, travel-2', commercialTextModel, maxOutput) * 1.25);
  let reservation: string;
  try { reservation = await reserveProductionAiSmoke(user.id, requestId, reserved); }
  catch (error) {
    return NextResponse.json({ ok: false, code: error instanceof DuplicateAiRequest ? 'already-run' : 'budget-unavailable' },
      { ...noStore, status: error instanceof DuplicateAiRequest ? 409 : 503 });
  }
  try {
    const response = await callOpenAI('/responses', {
      model: commercialTextModel, store: false, service_tier: 'default', reasoning: { effort: 'none' },
      max_output_tokens: maxOutput, instructions, input,
      text: { format: { type: 'json_schema', name: 'synthetic_evidence', strict: true,
        schema: { type: 'object', properties: { chosen: { type: 'string', enum: ['invoice-1', 'travel-2'] } },
          required: ['chosen'], additionalProperties: false } } },
    }, reservation);
    const payload = await response.json() as { usage?: unknown; status?: string;
      output?: { type: string; content?: { type: string; text?: string }[] }[] };
    const actual = providerUsageCost(payload.usage, commercialTextModel);
    if (actual !== undefined) await settleAiSpend(reservation, actual);
    const result = payload.output?.find(item => item.type === 'message')?.content?.find(part => part.type === 'output_text')?.text;
    const chosen = result ? (JSON.parse(result) as { chosen?: string }).chosen : undefined;
    const ok = payload.status === 'completed' && chosen === 'invoice-1' && actual !== undefined && actual <= reserved;
    return NextResponse.json({ ok, model: commercialTextModel, reservedChfMicros: reserved, costChfMicros: actual ?? null },
      { ...noStore, status: ok ? 200 : 502 });
  } catch (error) {
    if (error instanceof OpenAIRequestError && (error.status === 401 || error.status === 403 || error.code === 'approval_expired')) {
      await settleAiSpend(reservation, 0).catch(() => {});
    }
    return NextResponse.json({ ok: false, providerStatus: error instanceof OpenAIRequestError ? error.status : null },
      { ...noStore, status: 502 });
  }
}
