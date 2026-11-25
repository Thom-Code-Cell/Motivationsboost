import { NextRequest, NextResponse } from 'next/server';
import { requireAppSession } from '@/lib/server/app-session';
import { listApplications } from '@/lib/server/applications-store';
import { isRequestOriginAllowed } from '@/lib/security';

export async function GET() {
  let owner: string;
  try { owner = (await requireAppSession()).user.id; } catch { return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 }); }
  try { return NextResponse.json({ applications: await listApplications(owner) }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch { return NextResponse.json({ error: 'Bewerbungen konnten nicht geladen werden.' }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production')) return NextResponse.json({ error: 'Ungültiger Ursprung.' }, { status: 403 });
  return NextResponse.json({ error: 'Bewerbungen werden im Browser gespeichert.' }, { status: 410 });
}
