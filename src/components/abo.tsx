"use client";

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserData } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type Plan = { id: 'monthly' | 'yearly'; amount: number; currency: string; interval: string };
type Response = { provider: string; enabled: boolean; plans: Plan[]; message: string };

export function Abo({ user, userData, isAuthLoading }: { user: User | null; userData: UserData | null; isAuthLoading: boolean }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    fetch('/api/payrexx/plans', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Not configured');
      const data = await response.json() as Response;
      if (active) { setReady(data.enabled); setPlans(data.plans); }
    }).catch(() => { if (active) { setReady(false); setPlans([]); } });
    return () => { active = false; };
  }, []);

  const startCheckout = async (plan: Plan['id']) => {
    if (!ready || !user || loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/payrexx/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Payrexx ist noch nicht verfügbar.');
      window.location.assign(payload.url);
    } catch (error) {
      toast({ title: 'Payrexx derzeit nicht verfügbar', description: error instanceof Error ? error.message : 'Bitte später erneut versuchen.', variant: 'destructive' });
      setLoading(false);
    }
  };

  return <Card className="max-w-3xl">
    <CardHeader>
      <CardTitle>Abonnement und Bezahlung</CardTitle>
      <CardDescription>Bevor wir kostenpflichtige Abonnemente anbieten, werden die Preise, Leistungsgrenzen und Kündigungsbedingungen geprüft. Für Zahlungen verwenden wir Payrexx.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm">Aktueller Kontostatus: <strong>{userData?.plan === 'pro_month' ? 'Pro' : 'Basis / Test'}</strong>. Die KI-Freigabe ist davon unabhängig und kann bis zur API-Konfiguration eingeschränkt sein.</p>
      {!ready || !user || isAuthLoading || plans.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm" role="status">
          Zahlungen sind noch nicht aktiviert. Es wird kein Betrag belastet. Die Preise folgen nach der kaufmännischen Freigabe.
        </p>
      ) : <>
        <p className="text-sm">Vor dem Abschluss werden Laufzeit, wiederkehrende Zahlungen und Kündigungsbedingungen bei Payrexx angezeigt. Der Zugang wird erst nach verifizierter Zahlung aktiviert.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map(plan => <div key={plan.id} className="rounded-xl border p-4">
            <p className="font-semibold">{plan.id === 'monthly' ? 'Monatsabo' : 'Jahresabo'}</p>
            <p className="mt-1 text-lg">{(plan.amount / 100).toLocaleString('de-CH', { style: 'currency', currency: plan.currency })}</p>
            <Button disabled={loading} className="mt-3 w-full" onClick={() => void startCheckout(plan.id)}>
              {loading ? 'Öffnet Payrexx…' : 'Zu Payrexx'}
            </Button>
          </div>)}
        </div>
      </>}
      <p className="text-sm">Fragen zu Zahlungen oder einer späteren Kündigung: <a href="mailto:thomas@th-analytica.com" className="break-all underline">thomas@th-analytica.com</a></p>
    </CardContent>
  </Card>;
}
