import { NextRequest, NextResponse } from 'next/server';
import { requireAppSession } from '@/lib/server/app-session';
import { reserveAiSpend, settleAiSpend } from '@/lib/server/ai-spend-store';
import { getOpenAIKey } from '@/lib/server/openai-client';
import { isRequestOriginAllowed } from '@/lib/security';

export const maxDuration = 240;
const deadline = Date.parse('2026-11-25T16:00:00Z');
const reservedMicros = 500_000;
const flare25 = 'gpt-image-2.5-flare';
const flare26 = 'gpt-image-2.6-flare';

async function reviewer() {
  if (process.env.VERCEL_ENV !== 'preview' || Date.now() >= deadline) return;
  const session = await requireAppSession().catch(() => null);
  const id = session?.user.id;
  if (id && id === process.env.MOTIVATIONS_ACCEPTANCE_USER_ID) return id;
}

function page(body: string) {
  return new NextResponse('<!doctype html><html lang="de"><meta charset="utf-8"><title>Synthetischer Porträttest</title>' + body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; img-src data:; form-action 'self'; frame-ancestors 'none'",
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function GET() {
  if (!await reviewer()) return new NextResponse(null, { status: 404 });
  return page('<h1>Synthetischer Porträttest</h1><form method="post"><button>Einmaligen Vergleich starten</button></form>');
}

async function testImage(user: string, id: string, model: string, source?: string) {
  const key = getOpenAIKey();
  if (Date.now() >= deadline) throw new Error('Acceptance expired');
  const receipt = await reserveAiSpend(user, id, reservedMicros);
  if (Date.now() >= deadline) {
    await settleAiSpend(receipt, 0);
    throw new Error('Acceptance expired');
  }

  const prompt = source
    ? 'Edit this purely synthetic fictional adult for an understated Swiss job application. Preserve age, skin tone, face shape, expression, glasses and hairstyle, without retouching. Change only the background to plain light grey and the top to a navy blazer. Head and shoulders, natural lighting, no text.'
    : 'Create a wholly invented, fictional adult, age about 52, with warm medium-brown skin, short dark wavy hair with grey temples, round green glasses, a neutral kind expression, a rust-red top and a muted green wall. Natural documentary head-and-shoulders photograph. Do not depict a public figure. No text.';
  const options = { model, prompt, n: 1, size: '1024x1024', quality: source ? 'medium' : 'low', output_format: 'webp' };
  const headers = new Headers({ Authorization: 'Bearer ' + key });
  let body: string | FormData;
  if (source) {
    body = new FormData();
    for (const [key, value] of Object.entries(options)) body.append(key, String(value));
    body.append('image', new Blob([Uint8Array.from(Buffer.from(source, 'base64'))], { type: 'image/webp' }), 'synthetic.webp');
  } else {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options);
  }

  const started = Date.now();
  const response = await fetch('https://api.openai.com/v1/images/' + (source ? 'edits' : 'generations'), {
    method: 'POST', headers, body, cache: 'no-store', signal: AbortSignal.timeout(100_000),
  });
  const elapsed = Date.now() - started;
  if (!response.ok) {
    if ([400, 401, 403, 404, 422].includes(response.status)) await settleAiSpend(receipt, 0);
    return { model, elapsed, status: response.status, image: '', cost: null, tokens: null };
  }

  const result = await response.json() as {
    data?: { b64_json?: string }[];
    usage?: { input_tokens?: number; input_tokens_details?: { text_tokens?: number; image_tokens?: number }; output_tokens?: number };
  };
  const raw = result.data?.[0]?.b64_json ?? '';
  const image = raw.length <= 1_100_000 && /^[A-Za-z0-9+/]+=*$/.test(raw) ? raw : '';
  const input = result.usage?.input_tokens;
  const imageInput = result.usage?.input_tokens_details?.image_tokens;
  const textInput = result.usage?.input_tokens_details?.text_tokens;
  const output = result.usage?.output_tokens;
  let cost: number | null = null;
  if (typeof input === 'number' && typeof imageInput === 'number' && typeof textInput === 'number' && typeof output === 'number' &&
      [input, imageInput, textInput, output].every(value => Number.isSafeInteger(value) && value >= 0) && input >= imageInput + textInput) {
    cost = Math.ceil((8 * (input - textInput) + 5 * textInput + 30 * output) * 1.10);
    await settleAiSpend(receipt, cost);
  }
  return { model, elapsed, status: response.status, image, cost, tokens: { input, imageInput, textInput, output } };
}

export async function POST(request: NextRequest) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), true)) return new NextResponse(null, { status: 403 });
  const user = await reviewer();
  if (!user) return new NextResponse(null, { status: 404 });
  try {
    const source = await testImage(user, '1ec00004-c825-42dd-b5a2-91ae25e7c7f5', flare25);
    const edits = source.image ? await Promise.all([
      testImage(user, 'd02cc0cb-9182-4a0e-ae7a-1b1cd490ed23', flare25, source.image),
      testImage(user, 'f4dea39a-c6fc-4a20-a45a-1f248e702050', flare26, source.image),
    ]) : [];
    const figures = [source, ...edits].map(({ image, ...info }, index) => '<figure><figcaption>' +
      (index === 0 ? 'Synthetische Vorlage' : 'Bearbeitung ' + index) + '</figcaption><pre>' + JSON.stringify(info) + '</pre>' +
      (image ? '<img alt="Synthetisches Porträt" width="480" height="480" src="data:image/webp;base64,' + image + '">' : '') + '</figure>');
    return page('<h1>Synthetischer Porträttest</h1>' + figures.join(''));
  } catch {
    return page('<h1>Porträttest abgebrochen</h1><p>Falls bereits ein Aufruf erfolgt ist, bleibt seine offene Reserve gebunden. Ein erneuter Start ist gesperrt.</p>');
  }
}
