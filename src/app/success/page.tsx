import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
             <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">Zahlung erfolgreich!</CardTitle>
          <CardDescription>Vielen Dank für Ihr Upgrade. Sie haben jetzt vollen Zugriff auf alle Pro-Funktionen.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Zurück zum Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
