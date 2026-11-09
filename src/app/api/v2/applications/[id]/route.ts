import { NextRequest, NextResponse } from 'next/server';
import { requireAppSession } from '@/lib/server/app-session';
import { updateApplication, deleteApplication } from '@/lib/server/applications-store';
import { isRequestOriginAllowed } from '@/lib/security';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string }> };
async function check(request: NextRequest, context: Context) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production')) return null;
  const { id } = await context.params;
  if (!uuid.test(id)) return null;
  try { return { id, owner: (await requireAppSession()).user.id }; } catch { return null; }
}
export async function PATCH(request: NextRequest, context: Context) {
  const info = await check(request, context);
  if (!info) return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > 4096) return NextResponse.json({ error: 'Eingabe zu gross.' }, { status: 413 });
  let payload: unknown; try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 }); }
  try { return await updateApplication(info.owner, info.id, payload) ? NextResponse.json({ updated: true }) : NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 }); }
  catch (error) { return NextResponse.json({ error: 'Änderung nicht möglich.' }, { status: error instanceof Error && error.name === 'ZodError' ? 400 : 503 }); }
}
export async function DELETE(request: NextRequest, context: Context) {
  const info = await check(request, context);
  if (!info) return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 });
  try { return await deleteApplication(info.owner, info.id) ? NextResponse.json({ deleted: true }) : NextResponse.json({ error: 'Nicht gefunden.' }, { status: 404 }); }
  catch { return NextResponse.json({ error: 'Löschen nicht möglich.' }, { status: 503 }); }
}
