import { lookup } from 'node:dns/promises';
import https from 'node:https';
import http from 'node:http';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { load } from 'cheerio';
import { safeWebUrl } from '@/lib/security';

export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
  } catch { return false; }
}
async function download(value: string, redirects = 0): Promise<string> {
  const url = new URL(safeWebUrl(value));
  if (!['', '443', '80'].includes(url.port)) throw new Error('Diese Webadresse wird nicht unterstützt.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new Error('Interne Webadressen sind nicht erlaubt.');
  const address = addresses[0];
  // Pin the validated address to the connection, preventing DNS rebinding.
  const response = await new Promise<{ status: number; location?: string; body: string }>((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(url, {
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      headers: { 'User-Agent': 'Motivationsboost/1.0', Accept: 'text/html,text/plain' },
      timeout: 10000,
    }, res => {
      const chunks: Buffer[] = []; let size = 0;
      res.on('data', chunk => { size += chunk.length; if (size > 1_000_000) request.destroy(new Error('Die Stellenanzeige ist zu groß.')); else chunks.push(chunk); });
      res.on('end', () => resolve({ status: res.statusCode || 0, location: res.headers.location, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('Stellenanzeige konnte nicht rechtzeitig geladen werden.')));
    request.on('error', reject);
  });
  if ([301, 302, 303, 307, 308].includes(response.status) && response.location && redirects < 3) return download(new URL(response.location, url).href, redirects + 1);
  if (response.status < 200 || response.status >= 300) throw new Error('Stellenanzeige nicht zugänglich. Bitte den Anzeigentext direkt einfügen.');
  return response.body;
}
export async function getJobPosting(value: string, suppliedText?: string): Promise<string> {
  if (suppliedText?.trim()) {
    if (suppliedText.length < 50 || suppliedText.length > 50000) throw new Error('Bitte einen Anzeigentext mit 50 bis 50.000 Zeichen eingeben.');
    return suppliedText.trim();
  }
  const html = await download(value);
  const $ = load(html); $('script,style,nav,footer,header,noscript').remove();
  const text = ($('main').length ? $('main').text() : $('body').text()).replace(/\s+/g, ' ').trim().slice(0, 50000);
  if (text.length < 50) throw new Error('Kein lesbarer Anzeigentext gefunden. Bitte den Text direkt einfügen.');
  return text;
}
