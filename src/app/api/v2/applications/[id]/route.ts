import { NextRequest, NextResponse } from 'next/server';
import { isRequestOriginAllowed } from '@/lib/security';

function rejectServerWrite(request: NextRequest) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production')) {
    return NextResponse.json({ error: 'Ungültiger Ursprung.' }, { status: 403 });
  }
  return NextResponse.json({ error: 'Bewerbungen werden im Browser gespeichert.' }, { status: 410 });
}

export async function PATCH(request: NextRequest) {
  return rejectServerWrite(request);
}

export async function DELETE(request: NextRequest) {
  return rejectServerWrite(request);
}
