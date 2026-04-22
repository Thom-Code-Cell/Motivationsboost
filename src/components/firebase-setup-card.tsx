"use client";

import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const FirebaseSetupCard = () => {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "[Your-Project-ID]";
    const projectUrl = `https://console.firebase.google.com/project/${projectId}/overview`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <CardTitle className="text-2xl">Fast geschafft! App mit Firebase verbinden</CardTitle>
            </div>
            <CardDescription>
              Die Information "Kein Web-API-Schlüssel" ist der entscheidende Hinweis. Es bedeutet, Ihr Projekt existiert, aber es wurde noch keine Web-Anwendung darin registriert. Das holen wir jetzt nach.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <div>
              <p className="font-bold">Schritt 1: Ihr persönliches Firebase-Projekt öffnen</p>
              <p className="text-muted-foreground">
                Ihre Projekt-ID lautet: <code className="font-mono bg-muted p-1 rounded-md">{projectId}</code>.
                Klicken Sie auf den folgenden Link, um es direkt in der Firebase Console zu öffnen.
              </p>
              <Button asChild variant="link" className="p-0 h-auto break-all">
                <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                  {projectUrl} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </Button>
               <p className="text-xs text-muted-foreground mt-1">
                Wichtig: Stellen Sie sich sicher, dass Sie im Browser mit demselben Google-Konto angemeldet sind, das Sie auch für diese Studio-Sitzung verwenden.
              </p>
            </div>
            <div>
                <p className="font-bold">Schritt 2: Web-App erstellen, um API-Schlüssel zu erhalten</p>
                <p className="text-muted-foreground">
                    Klicken Sie in Ihrem Projekt auf das Zahnrad-Symbol oben links (**Projekteinstellungen**), dann auf den Tab **Allgemein**. Scrollen Sie nach unten zu **Ihre Apps**. Klicken Sie dort auf das **Web-Symbol (<code className="font-mono bg-muted p-1 rounded-md">&lt;/&gt;</code>)**, um eine neue Web-App zu erstellen. Geben Sie ihr einen beliebigen Namen (z.B. "Web App") und klicken Sie auf "App registrieren".
                </p>
            </div>
            <div>
                <p className="font-bold">Schritt 3: Konfiguration in Ihre `.env`-Datei einfügen</p>
                <p className="text-muted-foreground">
                    Nach der Registrierung zeigt Ihnen Firebase die Konfigurationsdaten. Wählen Sie die Option **"Config"** und kopieren Sie die Werte aus dem angezeigten Code-Block. Fügen Sie sie in die `.env`-Datei im Hauptverzeichnis Ihres Projekts ein.
                </p>
                <div className="mt-2 rounded-md bg-muted p-4 font-mono text-xs overflow-x-auto">
                <pre>
                    <code>
                    NEXT_PUBLIC_FIREBASE_API_KEY=...<br />
                    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...<br />
                    NEXT_PUBLIC_FIREBASE_PROJECT_ID={projectId}<br />
                    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...<br />
                    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...<br />
                    NEXT_PUBLIC_FIREBASE_APP_ID=...
                    </code>
                </pre>
                </div>
            </div>
          </CardContent>
           <CardFooter>
              <p className="text-xs text-muted-foreground">Nachdem Sie die `.env`-Datei gespeichert und alle Werte eingetragen haben, laden Sie diese Seite bitte neu.</p>
           </CardFooter>
        </Card>
      </div>
    );
};
