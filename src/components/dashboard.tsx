
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { db } from "@/lib/firebase";
import { type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import Link from 'next/link';
import React from 'react';

import { LayoutDashboard, CreditCard, FileText, MessageSquareQuote, Sparkles, UploadCloud, Bot, LogOut, FilePlus2, PenSquare, MessageCircleQuestion, Briefcase, Linkedin, Loader2, HelpCircle, Mail, FileArchive, Shield, Search, DollarSign, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getProgress } from '@/services/progress';
import { ProgressDataSchema, type ProgressData } from '@/types/progress';
import type { UserData } from '@/types/user';
import type { GenerateCvFromDocumentsOutput, Language } from '@/ai/schemas';
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { getFileContentFromDrive } from "@/services/drive";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelect } from '@/components/language-select';
import { UI_LOCALES, isUiLocale, uiText } from '@/lib/interface-translations';
import { updateUser } from '@/services/user';
import { getApplications, type Application } from "@/services/applications";
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarGroup, SidebarGroupLabel } from '@/components/ui/app-sidebar';

const CURRENT_AGB_VERSION = "2026-10-27";
const CURRENT_PRIVACY_VERSION = "2026-10-27";

const loadingSpinner = () => (
    <div className="flex items-center justify-center rounded-lg border border-dashed h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
);

// Dynamic imports for all tab components with explicit typing
const StartDashboard: React.ComponentType<any> = dynamic(() => import('@/components/start-dashboard').then((mod) => mod.StartDashboard), { ssr: false, loading: loadingSpinner });
const MotivationsGenerator: React.ComponentType<any> = dynamic(() => import('@/components/motivations-generator').then((mod) => mod.MotivationsGenerator), { ssr: false, loading: loadingSpinner });
const JobTracker: React.ComponentType<any> = dynamic(() => import('@/components/job-tracker').then((mod) => mod.JobTracker), { ssr: false, loading: loadingSpinner });
const JobFinder: React.ComponentType<any> = dynamic(() => import('@/components/job-finder').then((mod) => mod.JobFinder), { ssr: false, loading: loadingSpinner });
const StyleProfile: React.ComponentType<any> = dynamic(() => import('@/components/style-profile').then((mod) => mod.StyleProfile), { ssr: false, loading: loadingSpinner });
const LinkedinBooster: React.ComponentType<any> = dynamic(() => import('@/components/linkedin-booster').then((mod) => mod.LinkedinBooster), { ssr: false, loading: loadingSpinner });
const ApplicantDataControl: React.ComponentType<any> = dynamic(() => import('@/components/applicant-data-control').then(mod => mod.ApplicantDataControl), { ssr: false, loading: loadingSpinner });
const CareerPortfolio: React.ComponentType<any> = dynamic(() => import('@/components/career-portfolio').then(mod => mod.CareerPortfolio), { ssr: false, loading: loadingSpinner });
const CvGenerator: React.ComponentType<any> = dynamic(() => import('@/components/cv-generator').then((mod) => mod.CvGenerator), { ssr: false, loading: loadingSpinner });
const CvGapsFiller: React.ComponentType<any> = dynamic(() => import('@/components/cv-gaps-filler').then((mod) => mod.CvGapsFiller), { ssr: false, loading: loadingSpinner });
const ApplicationFeedback: React.ComponentType<any> = dynamic(() => import('@/components/application-feedback').then((mod) => mod.ApplicationFeedback), { ssr: false, loading: loadingSpinner });
const InterviewCoach: React.ComponentType<any> = dynamic(() => import('@/components/interview-coach').then((mod) => mod.InterviewCoach), { ssr: false, loading: loadingSpinner });
const EmailGenerator: React.ComponentType<any> = dynamic(() => import('@/components/email-generator').then((mod) => mod.EmailGenerator), { ssr: false, loading: loadingSpinner });
const DocumentUploads: React.ComponentType<any> = dynamic(() => import('@/components/document-scanner').then((mod) => mod.DocumentUploads), { ssr: false, loading: loadingSpinner });
const ExportCenter: React.ComponentType<any> = dynamic(() => import('@/components/export-center').then((mod) => mod.ExportCenter), { ssr: false, loading: loadingSpinner });
const Abo: React.ComponentType<any> = dynamic(() => import('@/components/abo').then((mod) => mod.Abo), { ssr: false, loading: loadingSpinner });
const TrustCenter: React.ComponentType<any> = dynamic(() => import('@/components/trust-center').then((mod) => mod.TrustCenter), { ssr: false, loading: loadingSpinner });
const OwnerDashboard: React.ComponentType<any> = dynamic(() => import('@/components/owner-dashboard').then((mod) => mod.OwnerDashboard), { ssr: false, loading: loadingSpinner });
const SalaryChecker: React.ComponentType<any> = dynamic(() => import('@/components/salary-checker').then((mod) => mod.SalaryChecker), { ssr: false, loading: loadingSpinner });
const PhotoStudio: React.ComponentType<any> = dynamic(() => import('@/components/photo-studio').then((mod) => mod.PhotoStudio), { ssr: false, loading: loadingSpinner });
const AgbDialog: React.ComponentType<any> = dynamic(() => import('./agb-dialog').then(mod => mod.AgbDialog), { ssr: false });
const PrivacyDialog: React.ComponentType<any> = dynamic(() => import('./privacy-dialog').then(mod => mod.PrivacyDialog), { ssr: false });
const UpsellPrompt: React.ComponentType<any> = dynamic(() => import('./upsell-prompt').then(mod => mod.UpsellPrompt), { ssr: false });


type ActiveView =
  | 'start' | 'generator' | 'job-tracker' | 'job-finder'
  | 'style-profile' | 'linkedin-booster' | 'cv-generator'
  | 'cv-gaps' | 'feedback' | 'interview' | 'email'
  | 'uploads' | 'export' | 'abo' | 'trust'
  | 'owner-dashboard' | 'salary-checker' | 'photo-studio' | 'career-profile' | 'data-privacy';

interface DashboardProps {
  isAdmin: boolean;
  user: User | null;
  accessToken: string | null;
  isAuthLoading: boolean;
  handleSignIn: () => void;
  handleSignOut: () => void;
}

export function Dashboard({ isAdmin, user, accessToken, isAuthLoading, handleSignIn, handleSignOut }: DashboardProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('start');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [cvTextOverride, setCvTextOverride] = useState<string | null>(null);
  const [cvJson, setCvJson] = useState<GenerateCvFromDocumentsOutput | null>(null);
  const [linkedinSummary, setLinkedinSummary] = useState<string | null>(null);
  const [motivationLetter, setMotivationLetter] = useState<string | null>(null);
  const [isDriveDataLoading, setIsDriveDataLoading] = useState(true);
  const [showUpsell, setShowUpsell] = useState(false);
  const [isAgbDialogOpen, setIsAgbDialogOpen] = useState(false);
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isSavingInterfaceLanguage, setIsSavingInterfaceLanguage] = useState(false);

  const userProfile = [user?.displayName, cvJson?.summary].filter(Boolean).join(': ');

  useEffect(() => {
    if (user && db) {
      setLoadError(null);
      const userDocRef = doc(db, 'users', user.uid);
      const userUnsubscribe = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
              const data = doc.data() as UserData;
              setUserData(data);

              if(data.upsellSuggested && !data.upsellAccepted) {
                  setShowUpsell(true);
              }

              if (!data.agbAccepted || data.agbVersion !== CURRENT_AGB_VERSION) {
                  setIsAgbDialogOpen(true);
              }

              if (!data.acceptedPrivacyVersion || data.acceptedPrivacyVersion !== CURRENT_PRIVACY_VERSION) {
                  setIsPrivacyDialogOpen(true);
              }
          } else {
              setUserData(null);
          }
      }, (error) => {
        console.error("Error listening to user document:", error);
        setUserData(null);
        setLoadError('Ihre Kontodaten konnten nicht geladen werden. Bitte erneut versuchen.');
      });

      const progressDocRef = doc(db, 'progress', user.uid);
      const progressUnsubscribe = onSnapshot(progressDocRef, (snap) => {
          if (snap.exists()) {
              const parsedData = ProgressDataSchema.safeParse(snap.data()?.progress || {});
              if (parsedData.success) {
                setProgress(parsedData.data);
              } else {
                 getProgress(user.uid).then(setProgress).catch(() => setLoadError('Ihr Fortschritt konnte nicht geladen werden. Bitte erneut versuchen.'));
              }
          } else {
              getProgress(user.uid).then(setProgress).catch(() => setLoadError('Ihr Fortschritt konnte nicht geladen werden. Bitte erneut versuchen.'));
          }
      }, (error) => {
        console.error("Error listening to progress document:", error);
        getProgress(user.uid).then(setProgress).catch(() => setLoadError('Ihr Fortschritt konnte nicht geladen werden. Bitte erneut versuchen.'));
      });

      getApplications(user.uid).then(setApplications).catch(() => toast({ title: 'Bewerbungen konnten nicht geladen werden', variant: 'destructive' }));

      return () => {
          userUnsubscribe();
          progressUnsubscribe();
      };
    } else {
      setUserData(null);
      setProgress(null);
      setApplications([]);
    }
  }, [user]);

  useEffect(() => {
    // This effect fetches the main user data from Drive
    if (user && accessToken) {
      const loadDriveData = async () => {
        setIsDriveDataLoading(true);
        try {
          const cvJsonString = await getFileContentFromDrive(accessToken, 'cv_data.json');
          if (cvJsonString) {
            setCvJson(JSON.parse(cvJsonString));
          } else {
            setCvJson(null);
          }

          setCvTextOverride(await getFileContentFromDrive(accessToken, 'cv_refined.txt'));
          const summaryString = await getFileContentFromDrive(accessToken, 'linkedin_summary.txt');
          setLinkedinSummary(summaryString);

          const letterString = await getFileContentFromDrive(accessToken, 'motivation_letter.txt');
          setMotivationLetter(letterString);

        } catch (error) {
          console.error("Failed to load data from Google Drive", error);
          toast({ title: "Fehler beim Laden von Drive-Daten", description: "Einige Ihrer generierten Dokumente konnten nicht geladen werden.", variant: "destructive" });
        } finally {
          setIsDriveDataLoading(false);
        }
      };
      loadDriveData();
    } else {
      // User signed out, clear data
      setIsDriveDataLoading(false);
      setCvJson(null);
      setCvTextOverride(null);
      setLinkedinSummary(null);
      setMotivationLetter(null);
    }
  }, [user, accessToken, toast]);

  const features = userData?.features;

  const language: Language = userData?.language || 'de';
  const interfaceLanguage = userData?.interfaceLanguage && isUiLocale(userData.interfaceLanguage) ? userData.interfaceLanguage : 'de';

  const isBlocked = isAgbDialogOpen || isPrivacyDialogOpen;

  const isLoadingContent = isAuthLoading || (user && (isDriveDataLoading || !userData || !progress));

  const cvDataAsText = cvTextOverride || (cvJson
    ? `Zusammenfassung: ${cvJson.summary}\n\n${cvJson.sections.map(s => `${s.title}:\n${s.items.map(i => `${i.title} bei ${i.subtitle} (${i.date}): ${i.description}`).join('\n')}`).join('\n\n')}`
    : "");

  const renderActiveView = () => {
    if (!user || !userData || !progress) return loadingSpinner();

    switch(activeView) {
        case 'start':
            if (!progress) return loadingSpinner();
            return <StartDashboard user={user} userData={userData} progress={progress} applications={applications} cvJson={cvJson} onNavigate={setActiveView} />;
        case 'generator':
            return <MotivationsGenerator onExport={() => setActiveView('export')} user={user} accessToken={accessToken} language={language} cvData={cvDataAsText} userProfile={userProfile} userStyleSample={userData.userStyleSample} useStyleSample={userData.useStyleSample} onLetterUpdated={setMotivationLetter} initialLetter={motivationLetter} />;
        case 'job-tracker':
            return <JobTracker user={user} />;
        case 'job-finder':
            if (!cvJson) return <div className="space-y-4"><p>Erstellen Sie zuerst einen Lebenslauf aus Ihren Dokumenten.</p><Button onClick={() => setActiveView('cv-generator')}>Zum CV-Generator</Button></div>;
            return <JobFinder user={user} cvJson={cvJson} language={language} />;
        case 'style-profile':
            return <StyleProfile user={user} initialUserData={userData} language={language} />;
        case 'linkedin-booster':
             if (!cvJson) return <div className="space-y-4"><p>Erstellen Sie zuerst einen Lebenslauf aus Ihren Dokumenten.</p><Button onClick={() => setActiveView('cv-generator')}>Zum CV-Generator</Button></div>;
            return <LinkedinBooster user={user} accessToken={accessToken} linkedinSummary={linkedinSummary} cvJson={cvJson} userStyleSample={userData.userStyleSample || ''} language={language} onSummaryUpdated={setLinkedinSummary} />;
        case 'data-privacy':
            return <ApplicantDataControl data={{ uid: user.uid, email: user.email, displayName: user.displayName, profile: userData, applications, progress, cv: cvJson, approvedLetter: motivationLetter, linkedinSummary }} />;
        case 'career-profile':
            return <CareerPortfolio user={user} cvData={cvJson} accessToken={accessToken} language={language} targetCountry={userData.targetCountry} onNavigate={setActiveView} />;
        case 'cv-generator':
            return <CvGenerator user={user} accessToken={accessToken} useAutoLinkedInBooster={userData.useAutoLinkedInBooster} userStyleSample={userData.userStyleSample || ''} language={language} onCvGenerated={(cv: GenerateCvFromDocumentsOutput | null) => { setCvJson(cv); setCvTextOverride(null); }} onSummaryGenerated={setLinkedinSummary} />;
        case 'cv-gaps':
            return <CvGapsFiller initialCvText={cvDataAsText} onCvTextUpdated={setCvTextOverride} accessToken={accessToken} language={language} />;
        case 'feedback':
            return <ApplicationFeedback accessToken={accessToken} onDocumentsUpdated={(cv: string, letter: string) => { setCvTextOverride(cv); setMotivationLetter(letter); }} user={user} language={language} cvText={cvDataAsText} coverLetterText={motivationLetter} />;
        case 'interview':
            return <InterviewCoach user={user} language={language} cvData={cvDataAsText} userStyleSample={userData.userStyleSample} />;
        case 'email':
            return <EmailGenerator />;
        case 'uploads':
            return <DocumentUploads user={user} accessToken={accessToken} handleSignIn={handleSignIn} />;
        case 'export':
            return <ExportCenter cvTextOverride={cvTextOverride} userData={userData} accessToken={accessToken} cvJson={cvJson} linkedinSummary={linkedinSummary} motivationLetter={motivationLetter} />;
        case 'abo':
            return <Abo user={user} userData={userData} isAuthLoading={isAuthLoading} />;
        case 'trust':
            return <TrustCenter />;
        case 'owner-dashboard':
            return <OwnerDashboard user={user}/>;
        case 'salary-checker':
            if (!cvJson) return <div className="space-y-4"><p>Erstellen Sie zuerst einen Lebenslauf aus Ihren Dokumenten.</p><Button onClick={() => setActiveView('cv-generator')}>Zum CV-Generator</Button></div>;
            return <SalaryChecker user={user} cvJson={cvJson} language={language} />;
        case 'photo-studio':
            return <PhotoStudio user={user} />;
        default:
            return <div>Komponente nicht gefunden.</div>;
    }
  };

  const navItems = [
    { id: 'start', label: 'Dashboard', icon: LayoutDashboard, group: 'Übersicht' },
    { id: 'uploads', label: 'Dokumente', icon: UploadCloud, group: 'Erstellung' },
    { id: 'career-profile', label: 'Kompetenzpass & Zielland', icon: Briefcase, group: 'Erstellung' },
    { id: 'cv-generator', label: 'CV-Generator', icon: FilePlus2, group: 'Erstellung' },
    { id: 'generator', label: 'Generator', icon: Sparkles, group: 'Erstellung' },

    { id: 'feedback', label: 'ATS-Feedback', icon: MessageSquareQuote, group: 'Optimierung' },
    { id: 'linkedin-booster', label: 'LinkedIn-Booster', icon: Linkedin, group: 'Optimierung', feature: !!features?.linkedinBooster },
    { id: 'interview', label: 'Interview-Coach', icon: MessageCircleQuestion, group: 'Optimierung', feature: !!features?.showInterviewCoach },
    { id: 'photo-studio', label: 'KI-Foto-Studio', icon: Camera, group: 'Optimierung' },
    { id: 'cv-gaps', label: 'CV-Editor', icon: FileText, group: 'Optimierung' },
    { id: 'salary-checker', label: 'Gehalts-Check', icon: DollarSign, group: 'Optimierung' },

    { id: 'job-tracker', label: 'Job-Tracker', icon: Briefcase, group: 'Verwaltung', feature: !!features?.showJobTracker },
    { id: 'job-finder', label: 'Job-Finder', icon: Search, group: 'Verwaltung', feature: !!features?.showJobFinder },
    { id: 'email', label: 'E-Mail-Vorlagen', icon: Mail, group: 'Verwaltung', feature: !!features?.emailLetter },
    { id: 'export', label: 'Export', icon: FileArchive, group: 'Verwaltung', feature: !!features?.exportEnabled },

    { id: 'data-privacy', label: 'Datenexport & Datenschutz', icon: Shield, group: 'Konto' },
    { id: 'style-profile', label: 'Mein Stil', icon: PenSquare, group: 'Konto' },
    { id: 'abo', label: 'Abonnement', icon: CreditCard, group: 'Konto' },
    { id: 'trust', label: 'Hilfe & Datenschutz', icon: HelpCircle, group: 'Konto', feature: !!features?.showTrustTab },
  ];

  const groupedNavItems: Record<string, typeof navItems> = navItems.reduce((acc, item) => {
    if (item.feature === false) return acc;
    const group = item.group || 'Sonstiges';
    if (!acc[group]) {
        acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);


  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-muted/40" lang={interfaceLanguage} dir={interfaceLanguage === 'ar' ? 'rtl' : 'ltr'}>
        {user && userData && (
            <UpsellPrompt
                open={showUpsell}
                onOpenChange={setShowUpsell}
                user={user}
                userData={userData}
            />
        )}
        {user && userData && (
            <AgbDialog
                open={isAgbDialogOpen}
                user={user}
                currentVersion={CURRENT_AGB_VERSION}
                onAccept={() => setIsAgbDialogOpen(false)}
            />
        )}
        {user && userData && (
            <PrivacyDialog
                open={isPrivacyDialogOpen && !isAgbDialogOpen}
                user={user}
                currentVersion={CURRENT_PRIVACY_VERSION}
                onAccept={() => setIsPrivacyDialogOpen(false)}
            />
        )}

        <Sidebar>
            <SidebarContent className="p-0">
                <SidebarHeader className="p-2">
                    <div className="flex items-center gap-2 p-2">
                      <Bot className="h-7 w-7 text-primary" />
                      <span className="font-headline text-lg font-bold tracking-tight text-foreground">Bewerbungs-AI</span>
                    </div>
                </SidebarHeader>
                <SidebarMenu>
                    {Object.entries(groupedNavItems).map(([groupName, items]) => (
                        <SidebarGroup key={groupName}>
                            <SidebarGroupLabel>{uiText(interfaceLanguage, groupName)}</SidebarGroupLabel>
                            {items.map(item => (
                                <SidebarMenuItem key={item.id}>
                                    <SidebarMenuButton
                                        onClick={() => {
                                            if (isBlocked) return;
                                            setActiveView(item.id as ActiveView)
                                        }}
                                        isActive={activeView === item.id}
                                        tooltip={uiText(interfaceLanguage, item.id, item.label)}
                                        aria-disabled={isBlocked}
                                    >
                                        <item.icon />
                                        <span>{uiText(interfaceLanguage, item.id, item.label)}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarGroup>
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-2">
                {isAdmin && (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setActiveView('owner-dashboard')} isActive={activeView === 'owner-dashboard'} tooltip="Admin Dashboard">
                                <Shield className="text-destructive"/>
                                <span className="text-destructive">Admin Dashboard</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarFooter>
        </Sidebar>

        <div className="flex min-w-0 flex-col flex-1 md:pl-[var(--sidebar-width-icon)] peer-data-[state=expanded]:md:pl-[var(--sidebar-width)] transition-[padding-left] ease-in-out duration-200">
             <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
                 <div className="md:hidden">
                    <SidebarTrigger />
                 </div>
                 <div className="ml-auto flex flex-wrap items-center gap-3 sm:gap-4">
                     {user && userData && !isBlocked && (
                       <label className="flex max-w-[44vw] flex-col text-xs">
                         <span>{uiText(interfaceLanguage, 'chooseInterface')}</span>
                         <select aria-label={uiText(interfaceLanguage, 'chooseInterface')} className="max-w-full rounded-md border bg-background p-2 text-sm" value={interfaceLanguage} disabled={isSavingInterfaceLanguage}
                           onChange={async event => {
                             const next = event.target.value;
                             if (!isUiLocale(next)) return;
                             setIsSavingInterfaceLanguage(true);
                             try { await updateUser(user.uid, { interfaceLanguage: next }); }
                             catch { toast({ title: 'Oberflächensprache konnte nicht gespeichert werden.', variant: 'destructive' }); }
                             finally { setIsSavingInterfaceLanguage(false); }
                           }}>
                           {UI_LOCALES.map(([code, name]) => <option value={code} key={code}>{name}</option>)}
                         </select>
                       </label>
                     )}
                     {user && userData && !isBlocked && <div className="w-48 max-w-[45vw]" aria-label="Dokumentensprache ändern"><LanguageSelect defaultValue={language} disabled={isSavingLanguage} onValueChange={async next => { setIsSavingLanguage(true); try { await updateUser(user.uid, { language: next }); } catch { toast({ title: 'Sprache konnte nicht gespeichert werden', variant: 'destructive' }); } finally { setIsSavingLanguage(false); } }} /></div>}
                     {user && !accessToken && <Button variant="outline" onClick={handleSignIn}>{uiText(interfaceLanguage, "reconnect")}</Button>}
                     {isAuthLoading ? (
                        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                     ) : user ? (
                        <>
                           {isAdmin && (
                                <Badge variant="destructive" className="hidden sm:flex items-center gap-1.5">
                                    <Shield className="h-3.5 w-3.5" />
                                    Admin
                                </Badge>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Konto öffnen"><Avatar className="cursor-pointer h-9 w-9 border-2 border-background/50">
                                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} data-ai-hint="person" />
                                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleSignOut}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>{uiText(interfaceLanguage, "signout")}</span>
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                     ) : (
                       <Button onClick={handleSignIn}>{uiText(interfaceLanguage, "signin")}</Button>
                     )}
                 </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 bg-background">
              <div className={isBlocked ? 'blur-sm pointer-events-none' : ''}>
                 {loadError ? <div role="alert" className="space-y-4"><p>{loadError}</p><Button onClick={() => window.location.reload()}>Erneut versuchen</Button></div> : isLoadingContent ? loadingSpinner() : renderActiveView()}
              </div>
            </main>
             <footer className="border-t py-4 px-4 sm:px-6 md:px-8 mt-auto bg-background">
                <div className="container mx-auto flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                    <Link href="/impressum" className="hover:text-primary transition-colors">Impressum</Link>
                    <Separator orientation="vertical" className="h-4 hidden sm:block" />
                    <Link href="/datenschutz" className="hover:text-primary transition-colors">Datenschutz</Link>
                    <Separator orientation="vertical" className="h-4 hidden sm:block" />
                    <Link href="/agb" className="hover:text-primary transition-colors">Nutzungsbedingungen</Link>
                    <Separator orientation="vertical" className="h-4 hidden sm:block" />
                    <a href="https://th-analytica.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">TH Analytica</a>
                </div>
                <p className="text-center text-xs text-muted-foreground/80 mt-2">
                    Bitte beachte die <Link href="/agb" className="underline">Nutzungsbedingungen</Link> und <Link href="/datenschutz" className="underline">Datenschutzhinweise</Link>. Kontakt: <a className="break-all underline" href="mailto:thomas@th-analytica.com">thomas@th-analytica.com</a>.
                </p>
            </footer>
        </div>
      </div>
    </SidebarProvider>
  )
}
