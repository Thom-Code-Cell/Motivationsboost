import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function CancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
           <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
             <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-2xl">Zahlung abgebrochen</CardTitle>
          <CardDescription>Ihr Bezahlvorgang wurde abgebrochen. Sie können es jederzeit erneut versuchen.</CardDescription>
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
