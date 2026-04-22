"use client";

import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const AuthErrorCard = () => {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "[Your-Project-ID]";
    const authUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-2xl border-destructive">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                        <CardTitle className="text-2xl text-destructive">Fehler: Nicht autorisierte Domain</CardTitle>
                    </div>
                    <CardDescription>
                        Die Anmeldung wurde von Firebase blockiert, weil sie von einer nicht autorisierten Domain (`localhost`) stammt. Dies ist eine Sicherheitseinstellung. Um das Problem zu beheben, müssen Sie `localhost` manuell zu den autorisierten Domains in Ihrem Firebase-Projekt hinzufügen.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <p className="font-bold">1. Öffnen Sie die Authentifizierungseinstellungen</p>
                        <p className="text-muted-foreground">
                            Klicken Sie auf den folgenden Link, um direkt zur Einstellungsseite in Ihrer Firebase Console zu gelangen.
                        </p>
                        <Button asChild variant="link" className="p-0 h-auto break-all">
                            <a href={authUrl} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                                Firebase-Authentifizierungseinstellungen <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                        </Button>
                    </div>
                    <div>
                        <p className="font-bold">2. Fügen Sie `localhost` hinzu</p>
                        <p className="text-muted-foreground">
                            Klicken Sie unter dem Tab "Autorisierte Domains" auf die Schaltfläche "Domain hinzufügen", geben Sie `localhost` ein und bestätigen Sie.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2">
                    <p className="text-xs text-muted-foreground">Nachdem Sie die Domain hinzugefügt haben, ist kein Neustart erforderlich. Laden Sie einfach diese Seite neu und versuchen Sie erneut, sich anzumelden.</p>
                    <Button onClick={() => window.location.reload()}>Seite neu laden</Button>
                </CardFooter>
            </Card>
        </div>
    );
};
