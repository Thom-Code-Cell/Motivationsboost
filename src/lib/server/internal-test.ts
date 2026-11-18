import 'server-only';
import { headers } from 'next/headers';

/** The fake identity is available only to a loopback-bound Next dev server. */
export function isInternalTestMode(): boolean {
  if (process.env.INTERNAL_TEST_MODE !== 'true') return false;
  if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) return true;

  // The remote test harness is restricted to one protected Vercel preview branch.
  // It must never activate in production or on arbitrary preview deployments.
  return process.env.VERCEL === '1'
    && process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === 'codex/internal-test-readiness-20261118';
}

export async function internalTestHostAllowed(): Promise<boolean> {
  const host = (await headers()).get('host');
  if (!host) return false;
  if (process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'preview') {
    const assignedHost = process.env.VERCEL_URL?.toLowerCase();
    return Boolean(assignedHost && assignedHost.endsWith('.vercel.app') && host.toLowerCase() === assignedHost);
  }
  try {
    const hostname = new URL(`http://${host}`).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
  } catch {
    return false;
  }
}
