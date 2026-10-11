import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/session';
import { adminDb } from '@/lib/server/firebase-admin';
export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Zugriff verweigert.' }, { status: 403 }); }
  try {
    const users = await adminDb().collection('users').get();
    let proUsers = 0, mrr = 0;
    users.forEach(doc => {
      const data = doc.data();
      if (data.plan === 'pro_month' && data.subscriptionStatus === 'active') { proUsers++; mrr += Number(data.price) || 0; }
    });
    return NextResponse.json({ totalUsers: users.size, proUsers, freeUsers: users.size - proUsers, mrr }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Statistiken derzeit nicht verfügbar.' }, { status: 503 }); }
}
