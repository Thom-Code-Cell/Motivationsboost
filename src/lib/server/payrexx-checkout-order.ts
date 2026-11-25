import 'server-only';
import { databasePool } from './postgres';

export type SandboxOrder = {
  reference_id: string;
  status: 'pending' | 'gateway-created' | 'gateway-error' | 'paid' | 'cancelled' | 'refunded';
  gateway_url: string | null;
  gateway_expires_at: Date | null;
  sandbox_psp_id: number | null;
};

export async function latestSandboxOrder(userId: string): Promise<SandboxOrder | undefined> {
  const result = await databasePool().query<SandboxOrder>(
    `SELECT reference_id, status, gateway_url, gateway_expires_at, sandbox_psp_id FROM payment_orders
     WHERE user_id = $1 AND sandbox AND plan = 'weekly'
     ORDER BY (status IN ('pending', 'gateway-created')) DESC, created_at DESC LIMIT 1`,
    [userId],
  );
  return result.rows[0];
}

export function trustedSandboxGateway(url: string, instance: string): URL {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== `${instance.toLowerCase()}.payrexx.com` ||
      parsed.username || parsed.password || parsed.port) throw new Error('Unexpected sandbox gateway URL');
  return parsed;
}

export function resumableSandboxGateway(order: SandboxOrder | undefined, config: { instance: string; pspId: number }, now = Date.now()): string | undefined {
  if (order?.status !== 'gateway-created' || order.sandbox_psp_id !== config.pspId || !order.gateway_url || !order.gateway_expires_at ||
      order.gateway_expires_at.getTime() <= now) return undefined;
  try { return trustedSandboxGateway(order.gateway_url, config.instance).toString(); } catch { return undefined; }
}
