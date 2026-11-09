import { NextRequest, NextResponse } from 'next/server';
import { requireAppSession } from '@/lib/server/app-session';
import { listApplications, createApplication } from '@/lib/server/applications-store';
import { isRequestOriginAllowed } from '@/lib/security';

export async function GET() {
  let owner: string;
  try { owner = (await requireAppSession()).user.id; } catch { return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 }); }
  try { return NextResponse.json({ applications: await listApplications(owner) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Bewerbungen konnten nicht geladen werden.' }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production')) return NextResponse.json({ error: 'Ungültiger Ursprung.' }, { status: 403 });
  let owner: string;
  try { owner = (await requireAppSession()).user.id; } catch { return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 }); }
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > 20000) return NextResponse.json({ error: 'Eingabe zu gross.' }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 }); }
  try { return NextResponse.json({ id: await createApplication(owner, payload) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: 'Bewerbung konnte nicht gespeichert werden.' }, { status: error instanceof Error && error.name === 'ZodError' ? 400 : 503 }); }
}
