import { NextResponse } from 'next/server';
import { requireAppSession } from '@/lib/server/app-session';
import { databasePool } from '@/lib/server/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  let session;
  try { session = await requireAppSession(); }
  catch { return NextResponse.json({ error: 'Bitte anmelden.' }, { status: 401 }); }

  try {
    const database = databasePool();
    const [user, applications, profile, usage, entitlement] = await Promise.all([
      database.query('SELECT id, name, email, "emailVerified", "createdAt" FROM "user" WHERE id = $1', [session.user.id]),
      database.query('SELECT id, job_title AS "jobTitle", company, job_url AS "jobUrl", status, notes, created_at AS "createdAt", updated_at AS "updatedAt" FROM applications WHERE user_id = $1 ORDER BY created_at DESC', [session.user.id]),
      database.query('SELECT profile, updated_at AS "updatedAt" FROM applicant_profiles WHERE user_id = $1', [session.user.id]),
      database.query('SELECT period_key AS "period", actions FROM ai_usage WHERE user_id = $1 ORDER BY period_key DESC', [session.user.id]),
      database.query('SELECT plan, starts_at AS "startsAt", ends_at AS "endsAt", status FROM ai_entitlements WHERE user_id = $1', [session.user.id]),
    ]);
    if (!user.rows[0]) return NextResponse.json({ error: 'Konto nicht gefunden.' }, { status: 404 });
    const payload = {
      format: 'Motivationsboost-Datenexport',
      version: 1,
      exportedAt: new Date().toISOString(),
      account: user.rows[0],
      applications: applications.rows,
      profile: profile.rows[0] ?? null,
      aiUsage: usage.rows,
      entitlement: entitlement.rows[0] ?? null,
      note: 'Passwort-Hashes, Sitzungskennungen, Mail-Token und geheime Anbieterinformationen sind aus Sicherheitsgründen nicht enthalten.',
    };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="motivationsboost-datenexport.json"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Datenexport momentan nicht verfügbar.' }, { status: 503 });
  }
}
