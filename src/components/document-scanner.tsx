
"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Camera, Upload, RefreshCw, AlertTriangle, LogIn, HardDriveUpload, FolderSearch, HelpCircle, FileText, GraduationCap, Award, ClipboardCheck, FileBadge, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from 'next/image';
import { Separator } from './ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// By explicitly casting `window as any`, we tell TypeScript to trust that these objects will exist at runtime in the browser.
const gapi = (window as any).gapi;
const google = (window as any).google;

interface DocumentUploadsProps {
  user: User | null;
  accessToken: string | null;
  handleSignIn: () => void;
}

export function DocumentUploads({ user, accessToken, handleSignIn }: DocumentUploadsProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(false);
  const [importedFiles, setImportedFiles] = useState<{ id: string, name: string, link: string }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initGapiClient = async () => {
      const checkGapi = () => {
        if ((window as any).gapi) {
          (window as any).gapi.load('client:picker', () => {
            (window as any).gapi.client.load('drive', 'v3', () => {
                setIsPickerApiLoaded(true);
            });
          });
        } else {
          setTimeout(checkGapi, 100);
        }
      };
      checkGapi();
    };
    initGapiClient();
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        toast({ variant: "destructive", title: "Kamera nicht unterstützt" });
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setHasCameraPermission(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (error) {
        setHasCameraPermission(false);
        toast({ variant: "destructive", title: "Kamerazugriff verweigert" });
      }
    };

    if (user) {
        getCameraPermission();
    } else {
        setHasCameraPermission(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user, toast]);
  
  const pickerCallback = (data: any) => {
    if (data.action === (window as any).google.picker.Action.PICKED) {
      const newFiles = data.docs.map((doc: any) => ({ id: doc.id, name: doc.name, link: doc.url }));
      setImportedFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Import erfolgreich",
        description: `${newFiles.length} Datei(en) wurden ausgewählt. Sie erscheinen im 'CV-Generator' Tab.`,
      });
    }
  };

  const handleImportFromDrive = () => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!accessToken || !isPickerApiLoaded || !apiKey || !(window as any).google) {
        toast({ title: "Fehler", description: "Google Drive ist nicht bereit. Bitte erneut anmelden.", variant: "destructive" });
        return;
    }
    
    const view = new (window as any).google.picker.View((window as any).google.picker.ViewId.DOCS);
    view.setMimeTypes("image/png,image/jpeg,image/jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    const picker = new (window as any).google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
      }
    }
  };

  const resetCapture = () => setCapturedImage(null);
  
  const getFolderId = async (): Promise<string> => {
    if (!(window as any).gapi || !(window as any).gapi.client) throw new Error("GAPI client not loaded");
    const FOLDER_NAME = "Bewerbungsunterlagen AI";
    const response = await (window as any).gapi.client.drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.result.files && response.result.files.length > 0) {
      return response.result.files[0].id!;
    } else {
      const folderMetadata = {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      };
      const file = await (window as any).gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });
      return file.result.id!;
    }
  };

  const uploadToDrive = async () => {
    if (!capturedImage || !user || !accessToken) return;
    setIsUploading(true);

    try {
        const folderId = await getFolderId();

        const fetchRes = await fetch(capturedImage);
        const blob = await fetchRes.blob();

        const metadata = {
            name: `Bewerbungs-Scan-${new Date().toISOString()}.jpg`,
            mimeType: 'image/jpeg',
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
        });
      
        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(`Google Drive API Fehler: ${errorBody.error.message}`);
        }
      
        const file = await res.json();
        toast({
            title: "Upload erfolgreich",
            description: `Datei "${file.name}" wurde in Ihr Google Drive hochgeladen. Sie erscheint im 'CV-Generator' Tab.`,
        });
        setCapturedImage(null);

    } catch (error) {
       console.error("Error uploading to drive", error);
       const errorMessage = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.";
       toast({ title: "Upload fehlgeschlagen", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    return (
       <Card className="w-full">
        <CardHeader>
          <CardTitle>Dokumente scannen & hochladen</CardTitle>
          <CardDescription>Melden Sie sich an, um Dokumente zu scannen, zu importieren und direkt in Ihr Google Drive hochzuladen.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-10 gap-4">
          <HardDriveUpload className="w-16 h-16 text-muted-foreground" />
          <p className="text-muted-foreground">Bitte melden Sie sich an, um diese Funktion zu nutzen.</p>
          <Button onClick={handleSignIn}>
            <LogIn className="mr-2 h-4 w-4" />
            Mit Google anmelden
          </Button>
        </CardContent>
       </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Dokumente scannen & importieren</CardTitle>
                    <CardDescription>Scannen Sie Dokumente mit Ihrer Kamera oder importieren Sie sie direkt aus Ihrem Google Drive.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {hasCameraPermission === false && user && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Kamerazugriff erforderlich</AlertTitle>
                        <AlertDescription>
                        Bitte erlauben Sie den Zugriff auf die Kamera in den Einstellungen Ihres Browsers, um diese Funktion zu nutzen.
                        </AlertDescription>
                    </Alert>
                    )}

                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                    <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline style={{ transform: 'scaleX(-1)' }} />
                    <canvas ref={canvasRef} className="hidden" />
                    {hasCameraPermission === null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                            <p>Kamerazugriff wird angefordert...</p>
                        </div>
                    )}
                    </div>

                    {capturedImage && (
                    <div>
                        <h3 className="mb-2 text-lg font-medium">Vorschau</h3>
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                        <Image src={capturedImage} alt="Captured Document" fill style={{ objectFit: 'contain' }} />
                        </div>
                    </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-start gap-4">
                    {!capturedImage ? (
                    <Button onClick={capturePhoto} disabled={hasCameraPermission !== true}>
                        <Camera className="mr-2" />
                        Foto aufnehmen
                    </Button>
                    ) : (
                    <div className="flex w-full flex-col sm:flex-row gap-4">
                        <Button onClick={uploadToDrive} disabled={isUploading || !accessToken}>
                        {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <HardDriveUpload className="mr-2" />}
                        <span>In Google Drive speichern</span>
                        </Button>
                        <Button variant="outline" onClick={resetCapture} disabled={isUploading}>
                        <RefreshCw className="mr-2" />
                        Erneut aufnehmen
                        </Button>
                    </div>
                    )}
                </CardFooter>

                <Separator className="my-6" />

                <CardContent>
                    <h3 className="text-lg font-medium mb-4">Oder aus Google Drive importieren</h3>
                    <Button onClick={handleImportFromDrive} disabled={!isPickerApiLoaded || !accessToken}>
                        <FolderSearch className="mr-2" />
                        Dateien aus Drive auswählen
                    </Button>
                    {importedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <h4 className="font-medium">Importierte Dateien:</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {importedFiles.map(file => <li key={file.id}>{file.name}</li>)}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 lg:sticky lg:top-8 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        <span>Anleitung</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="text-base">Wozu das alles?</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                Damit dein Lebenslauf nicht bei null beginnt, analysiert die KI deine Arbeitszeugnisse, Diplome und Nachweise. Daraus erstellt sie automatisch ein strukturiertes CV-Grundgerüst im "CV-Generator"-Tab.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger className="text-base">Empfohlene Dokumente</AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-3 pt-2 text-muted-foreground">
                                    <li className="flex items-start gap-3"><FileText className="h-4 w-4 mt-1 flex-shrink-0" /><span>Arbeitszeugnisse</span></li>
                                    <li className="flex items-start gap-3"><GraduationCap className="h-4 w-4 mt-1 flex-shrink-0" /><span>Diplome / Schulabschlüsse</span></li>
                                    <li className="flex items-start gap-3"><Award className="h-4 w-4 mt-1 flex-shrink-0" /><span>Weiterbildungsnachweise</span></li>
                                    <li className="flex items-start gap-3"><ClipboardCheck className="h-4 w-4 mt-1 flex-shrink-0" /><span>Zwischenzeugnisse</span></li>
                                    <li className="flex items-start gap-3"><FileBadge className="h-4 w-4 mt-1 flex-shrink-0" /><span>Ggf. aktueller Lebenslauf</span></li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger className="text-base">Datenschutz & Google Drive</AccordionTrigger>
                            <AccordionContent>
                                <Alert className="mt-2">
                                    <AlertDescription>
                                        Deine Dateien werden **ausschließlich** in deinem eigenen Google Drive gespeichert – in einem privaten Ordner namens `Bewerbungsunterlagen AI`. Wir haben **keinen Zugriff** auf andere Inhalte.
                                    </AlertDescription>
                                </Alert>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
