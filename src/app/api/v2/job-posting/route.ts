import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { isRequestOriginAllowed } from '@/lib/security';
import { requireAppSession } from '@/lib/server/app-session';
import { databasePool } from '@/lib/server/postgres';
import { getJobPosting } from '@/lib/server/job-posting';

const input = z.object({ url: z.string().trim().max(2048).url() }).strict();
function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (!isRequestOriginAllowed(request.headers.get('origin'), request.headers.get('host'), process.env.NODE_ENV === 'production'))
    return reply({ error: 'Ungültiger Ursprung.' }, 403);
  let userId: string;
  try { userId = (await requireAppSession()).user.id; }
  catch { return reply({ error: 'Bitte anmelden.' }, 401); }

  const raw = await request.text().catch(() => '');
  if (Buffer.byteLength(raw, 'utf8') > 4096) return reply({ error: 'Der Stellenlink ist zu lang.' }, 413);
  const value = input.safeParse(await new Response(raw).json().catch(() => undefined));
  if (!value.success || !value.data.url.toLowerCase().startsWith('https://'))
    return reply({ error: 'Gib die vollständige HTTPS-Adresse der Stellenanzeige ein.' }, 400);

  const now = Date.now();
  try {
    const counter = await databasePool().query(
      `INSERT INTO "rateLimit" (id, key, count, "lastRequest") VALUES ($1, $1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN "rateLimit"."lastRequest" <= $2::bigint - 60000 THEN 1 ELSE "rateLimit".count + 1 END,
         "lastRequest" = CASE WHEN "rateLimit"."lastRequest" <= $2::bigint - 60000 THEN $2 ELSE "rateLimit"."lastRequest" END
       WHERE "rateLimit"."lastRequest" <= $2::bigint - 60000 OR "rateLimit".count < 5
       RETURNING count`,
      [`motivationsboost:job-import:${userId}`, now],
    );
    if (counter.rowCount !== 1) return reply({ error: 'Bitte warte kurz, bevor du einen weiteren Stellenlink importierst.' }, 429);
  } catch {
    return reply({ error: 'Der Import ist derzeit nicht verfügbar. Du kannst den Anzeigentext direkt einfügen.' }, 503);
  }

  try {
    const text = await getJobPosting(value.data.url);
    return reply({ text: text.slice(0, 12000) });
  } catch {
    return reply({ error: 'Die Anzeige konnte nicht übernommen werden. Füge den Text direkt ein, falls die Seite gesperrt ist oder ein Login verlangt.' }, 422);
  }
}
