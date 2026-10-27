import { NextResponse } from 'next/server';

// Legacy Stripe contract deliberately disabled. Billing is being migrated to Payrexx.
export async function POST() {
  return NextResponse.json(
    { error: 'Stripe ist dauerhaft deaktiviert. Payrexx wird separat freigeschaltet.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
