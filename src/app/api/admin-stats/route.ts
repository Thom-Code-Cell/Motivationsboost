import { NextResponse } from 'next/server';

// The former Firebase-only administrative dashboard is no longer part of this app.
export async function GET() { return NextResponse.json({ error: 'Nicht verfügbar.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } }); }
