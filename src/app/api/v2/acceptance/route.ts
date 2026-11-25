import { NextRequest, NextResponse } from 'next/server';
import { acceptanceCases } from './cases';
import { requireAppSession } from '@/lib/server/app-session';
import { acceptanceEnabled, hasCurrentAcceptanceApproval, withAcceptanceCase } from '@/lib/server/ai-acceptance';

import { isRequestOriginAllowed } from '@/lib/security';

export const maxDuration = 180;

async function eligibleUser() {
  if (!hasCurrentAcceptanceApproval()) return undefined;
  const session = await requireAppSession().catch(() => null);
  const id = session?.user.id;
  if (id && acceptanceEnabled(id)) return id;
}

function html(body: string) {
  return new NextResponse('<!doctype html><html lang="de" translate="no"><meta name="google" content="notranslate"><title>Motivationsboost Abnahme</title>' + body + '</html>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET() {
  if (!await eligibleUser()) return new NextResponse(null, { status: 404 });
  return html('<h1>Synthetische Motivationsboost-Abnahme</h1><form method="post"><button name="group" value="evidence">Bewerbungsunterlagen prüfen</button><button name="group" value="analysis">Analysen prüfen</button><button name="group" value="media">Audio und Foto prüfen</button></form>');
}

export async function POST(request: NextRequest) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), true)) return new NextResponse(null, { status: 403 });
  const uid = await eligibleUser();
  if (!uid) return new NextResponse(null, { status: 404 });
  const group = (await request.formData().catch(() => new FormData())).get('group');
  if (group !== 'evidence' && group !== 'analysis' && group !== 'media') return new NextResponse(null, { status: 400 });
  const values = await Promise.all(Object.entries(acceptanceCases[group]).map(async ([key, run]) => ({
    key,
    ...await withAcceptanceCase(uid, key, run),
  })));
  const json = JSON.stringify(values).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return html('<pre translate="no">' + json + '</pre>');
}
