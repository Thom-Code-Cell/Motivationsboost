import { NextResponse } from 'next/server';
import { requireAppSession } from '@/lib/server/app-session';
import { getOpenAIKey } from '@/lib/server/openai-client';

const candidates = ['gpt-6.1-terra', 'gpt-6-luna', 'gpt-6.2-sol', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4.1', 'gpt-5-mini'];

export async function GET() {
  const expires = Date.parse(process.env.MOTIVATIONS_AI_PRICE_APPROVED_UNTIL ?? '');
  if (process.env.VERCEL_ENV !== 'preview' || !Number.isFinite(expires) || Date.now() >= expires) {
    return new NextResponse(null, { status: 404 });
  }
  try { await requireAppSession(); } catch { return new NextResponse(null, { status: 401 }); }
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: 'Bearer ' + getOpenAIKey() },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const headers = { 'Cache-Control': 'no-store' };
    if (!response.ok) return NextResponse.json({ providerStatus: response.status }, { headers });
    const data = await response.json() as { data?: { id: string }[] };
    if (!Array.isArray(data.data)) return NextResponse.json({ providerStatus: 502 }, { headers });
    const modelIds = new Set(data.data.map(model => model.id));
    return NextResponse.json({ providerStatus: response.status, available: Object.fromEntries(candidates.map(id => [id, modelIds.has(id)])) }, { headers });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
