import { performance } from 'node:perf_hooks';

const app = new URL('https://motivationsboost.th-analytica.com/');
const previewOnly = process.argv[2] !== 'production';
const preview = new URL(previewOnly
  ? 'https://motivationsboost-preview-git-cod-454c05-thomas-hullins-projects.vercel.app/'
  : 'https://motivationsboost-preview-bsabqwj00-thomas-hullins-projects.vercel.app/');

async function probe(target, path, shouldBeProtected) {
  const url = new URL(path, target);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(8000),
      headers: { 'Cache-Control': 'no-cache' },
    });
    const location = response.headers.get('location');
    const redirect = location ? new URL(location, url) : null;
    const protectedRedirect = response.status === 302
      && redirect?.protocol === 'https:'
      && redirect.hostname === 'vercel.com'
      && /(?:\/login|\/sso|\/oauth)/.test(redirect.pathname);
    const protectedGate = protectedRedirect || (response.status === 401 && response.headers.has('x-vercel-id'));
    let healthy = shouldBeProtected ? protectedGate : response.ok;
    if (healthy && !shouldBeProtected && path === '/api/health') {
      const payload = await response.json();
      healthy = payload.status === 'configured' && payload.checks?.database === true && payload.checks?.databaseSchema === true &&
        payload.checks?.emailPasswordAuth === true && payload.checks?.transactionalEmail === true && payload.checks?.emailVerification === true;
    }
    if (healthy && !shouldBeProtected && path === '/api/payrexx/plans') {
      const payload = await response.json();
      healthy = payload.enabled === false && payload.sandboxOnly === false &&
        payload.free?.amount === 0 && payload.free?.limit === 0 &&
        Array.isArray(payload.plans) && payload.plans.every(plan => plan.available === false);
    }
    await response.body?.cancel().catch(() => {});
    return { target: url.hostname + url.pathname, expected: shouldBeProtected ? 'protected' : 'healthy', status: response.status, healthy, latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { target: url.hostname + url.pathname, expected: shouldBeProtected ? 'protected' : 'healthy', status: null, healthy: false, latencyMs: Math.round(performance.now() - started) };
  }
}

const requirements = [[app, '/', previewOnly], [app, '/api/health', previewOnly], [preview, '/app', true]];
if (!previewOnly) requirements.push([app, '/api/payrexx/plans', false]);
let checks = await Promise.all(requirements.map(([url, path, protectedGate]) => probe(url, path, protectedGate)));
if (checks.some(check => !check.healthy)) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const retry = checks.map((check, index) => check.healthy ? check : probe(...requirements[index]));
  checks = await Promise.all(retry);
}
const healthy = checks.every(check => check.healthy);
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), mode: previewOnly ? 'protected-preview' : 'production', healthy, checks }));
if (!healthy) process.exitCode = 1;
