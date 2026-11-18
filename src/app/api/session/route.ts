import { NextResponse } from 'next/server';

// Deprecated Firebase session bridge. Authentication is handled by Better Auth.
function unavailable() { return NextResponse.json({ error: 'Diese Anmeldeschnittstelle wurde entfernt.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } }); }
export async function GET() { return unavailable(); }
export async function POST() { return unavailable(); }
export async function DELETE() { return unavailable(); }
