
"use client";

import type { User } from 'firebase/auth';
import type { UserData } from '@/types/user';
import type { ProgressData } from '@/types/progress';
import type { Application } from '@/services/applications';
import type { GenerateCvFromDocumentsOutput } from '@/ai/schemas';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressTracker } from './progress-tracker';
import { ArrowRight, Briefcase, FilePlus2, Lightbulb, Search, UploadCloud } from 'lucide-react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { safeToDate } from '@/lib/safeToDate';

interface StartDashboardProps {
    user: User;
    userData: UserData;
    progress: ProgressData;
    applications: Application[];
    cvJson: GenerateCvFromDocumentsOutput | null;
    onNavigate: (view: string) => void;
}

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'Entwurf': 'secondary',
  'Gesendet': 'default',
  'Antwort erhalten': 'outline',
  'Interview': 'default',
  'Absage': 'destructive',
  'Zusage': 'default',
};
const statusColor: { [key: string]: string } = {
    'Zusage': 'bg-green-500 hover:bg-green-600 border-green-500 text-white',
    'Interview': 'bg-primary hover:bg-primary/90',
};

const NextStepCard = ({ onNavigate, progress, cvJson }: { onNavigate: (view: string) => void, progress: ProgressData, cvJson: GenerateCvFromDocumentsOutput | null }) => {
    let title = "Willkommen!";
    let description = "Laden Sie Ihre Dokumente hoch, um zu beginnen.";
    let buttonText = "Zum Dokumenten-Upload";
    let buttonIcon = <UploadCloud className="mr-2 h-4 w-4" />;
    let targetView = 'uploads';

    if (cvJson) {
        title = "Super! Ihr CV ist bereit.";
        description = "Der nächste Schritt ist, ein überzeugendes Motivationsschreiben zu erstellen.";
        buttonText = "Zum Generator";
        buttonIcon = <FilePlus2 className="mr-2 h-4 w-4" />;
        targetView = 'generator';
    }
    
    if(progress.earnedBadges.includes('firstApplicationSent')) {
        title = "Sie sind auf Kurs!";
        description = "Finden Sie jetzt weitere spannende Job-Möglichkeiten mit unserem KI-Job-Finder.";
        buttonText = "Zum Job-Finder";
        buttonIcon = <Search className="mr-2 h-4 w-4" />;
        targetView = 'job-finder';
    }


    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-3"><Lightbulb className="text-primary"/> {title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button onClick={() => onNavigate(targetView)}>
                    {buttonIcon}
                    {buttonText}
                </Button>
            </CardFooter>
        </Card>
    );
};

export function StartDashboard({ user, userData, progress, applications, cvJson, onNavigate }: StartDashboardProps) {
    const latestApplication = applications.length > 0 ? applications[0] : null;

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Willkommen zurück, {user.displayName?.split(' ')[0]}!</h1>
                <p className="text-muted-foreground">Hier ist Ihre persönliche Übersicht für den heutigen Tag.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <NextStepCard onNavigate={onNavigate} progress={progress} cvJson={cvJson} />
                    <Card>
                        <CardHeader>
                            <CardTitle>Letzte Bewerbung</CardTitle>
                             <CardDescription>
                                {latestApplication ? "Ihre zuletzt getrackte Bewerbung." : "Sobald Sie eine Bewerbung im Job-Tracker hinzufügen, erscheint sie hier."}
                            </CardDescription>
                        </CardHeader>
                       {latestApplication && (
                         <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{latestApplication.jobTitle}</p>
                                    <p className="text-sm text-muted-foreground">{latestApplication.company}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant={statusVariant[latestApplication.status]} className={statusColor[latestApplication.status]}>{latestApplication.status}</Badge>
                                    <p className="text-xs text-muted-foreground mt-1">{safeToDate(latestApplication.applicationDate) ? format(safeToDate(latestApplication.applicationDate)!, 'dd. MMMM yyyy', { locale: de }) : '-'}</p>
                                </div>
                            </div>
                        </CardContent>
                       )}
                       <CardFooter>
                           <Button variant="outline" onClick={() => onNavigate('job-tracker')}>
                                <Briefcase className="mr-2 h-4 w-4" />
                                Zum Job-Tracker
                                <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                       </CardFooter>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    {progress && <ProgressTracker progress={progress} />}
                </div>
            </div>
        </div>
    );
}
