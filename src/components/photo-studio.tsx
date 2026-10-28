
"use client";

import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod/v3';
import { generateProfessionalPhoto } from '@/ai/flows/generate-professional-photo';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/core-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Camera, Wand2, Download, Info } from 'lucide-react';
import Image from 'next/image';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const formSchema = z.object({
  userPhoto: z.any().refine((files) => files?.length === 1, 'Bitte laden Sie ein Foto hoch.').refine(files => files?.[0]?.size <= 8 * 1024 * 1024, 'Bitte ein Foto bis 8 MB wählen.').refine(files => ['image/jpeg', 'image/png', 'image/webp'].includes(files?.[0]?.type), 'Bitte JPG, PNG oder WebP wählen.'),
  style: z.enum(['business', 'modern', 'creative']),
  mode: z.enum(['portrait','background','lighting','color','outfit','accessory','expression','studio','upscale']),
  prompt: z.string().max(180).optional(),
});

interface PhotoStudioProps {
  user: User | null;
}

export function PhotoStudio({ user }: PhotoStudioProps) {
  const [generatedPhotos, setGeneratedPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { style: 'business', mode: 'portrait', prompt: '' },
  });

  const fileRef = form.register("userPhoto");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      void fileRef.onChange(event);
    const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setSourceImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setSourceImage(null);
      }
  };


  // Re-encode on the device to limit uploads and remove embedded EXIF/location metadata.
  const readFileAsDataURL = async (file: File): Promise<string> => {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Bildverarbeitung ist auf diesem Gerät nicht verfügbar.');
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.88);
    } finally { bitmap.close(); }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ title: "Fehler", description: "Sie müssen angemeldet sein.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    setGeneratedPhotos([]);
    try {
      const file = values.userPhoto?.[0];
      if (!file) {
        toast({ title: "Kein Foto ausgewählt", description: "Bitte wählen Sie eine Datei aus.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      if (!window.confirm('Ich bin berechtigt, dieses Foto zu verwenden, und stimme zu, dass es für genau diese Bildbearbeitung an OpenAI übermittelt wird. Das Ergebnis kann vom Original abweichen und muss vor Verwendung geprüft werden. Fortfahren?')) return;
      const userPhotoDataUrl = await readFileAsDataURL(file);
      
      const result = await generateProfessionalPhoto({
        userPhoto: userPhotoDataUrl,
        style: values.style,
        mode: values.mode,
        prompt: values.prompt,
        consent: true,
      });

      setGeneratedPhotos([result.generatedPhoto]);
      toast({
          title: "Foto generiert!",
          description: "Bildentwurf erstellt. Bitte das Gesicht und alle Details vor der Verwendung prüfen.",
      });

    } catch (error) {
      console.error("Error generating photo:", error);
      toast({
        title: "Fehler bei der Foto-Generierung",
        description: "Die Bildbearbeitung ist möglicherweise noch gesperrt oder das Kontingent ist erreicht. Es erfolgt keine automatische Wiederholung.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const downloadImage = (dataUrl: string, index: number) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `bewerbungsfoto-${form.getValues('style')}-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>KI-Foto-Studio</CardTitle>
          <CardDescription>Laden Sie Ihr eigenes Foto hoch und wählen Sie gezielt eine Bearbeitung. Die Bild-KI bleibt bis zur Freigabe durch den Betreiber deaktiviert.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
               <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Tipps für gute Ergebnisse</AlertTitle>
                  <AlertDescription>
                    Verwenden Sie ein klares Foto mit gut sichtbarem Gesicht. Die Aufnahme wird vor der Übermittlung lokal verkleinert und ohne EXIF-Metadaten neu gespeichert. Das KI-Ergebnis ist ein Entwurf, keine Identitätsgarantie.
                  </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="userPhoto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ihr Foto</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/png, image/jpeg, image/webp" {...fileRef} onChange={handleFileChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {sourceImage && (
                  <div className="w-full">
                     <Label>Vorschau</Label>
                     <div className="mt-2 relative aspect-square w-full max-w-sm mx-auto rounded-lg overflow-hidden border">
                        <Image src={sourceImage} alt="Vorschau" layout="fill" objectFit="cover" />
                    </div>
                  </div>
              )}

              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Wählen Sie einen Stil</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                      >
                        <FormItem>
                            <FormControl>
                                <RadioGroupItem value="business" id="business" className="sr-only peer" />
                            </FormControl>
                             <Label htmlFor="business" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Business</Label>
                        </FormItem>
                        <FormItem>
                           <FormControl>
                            <RadioGroupItem value="modern" id="modern" className="sr-only peer" />
                           </FormControl>
                            <Label htmlFor="modern" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Modern</Label>
                        </FormItem>
                        <FormItem>
                           <FormControl>
                            <RadioGroupItem value="creative" id="creative" className="sr-only peer" />
                           </FormControl>
                             <Label htmlFor="creative" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">Kreativ</Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Was soll verändert werden?</FormLabel>
                    <FormControl>
                      <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="portrait">Neues professionelles Bewerbungsfoto</option>
                        <option value="background">Nur Hintergrund ändern</option>
                        <option value="lighting">Nur Licht verbessern</option>
                        <option value="color">Nur Farben korrigieren</option>
                        <option value="outfit">Nur professionelle Kleidung ändern</option>
                        <option value="accessory">Nur Accessoire ändern</option>
                        <option value="expression">Nur Gesichtsausdruck ändern</option>
                        <option value="studio">Studioqualität optimieren</option>
                        <option value="upscale">Bildschärfe verbessern</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-sm text-muted-foreground">Jeder Auftrag bearbeitet nur einen ausgewählten Bereich. Gesicht und Identität sollen möglichst erhalten bleiben, können aber trotzdem abweichen.</p>

              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Zusätzliche Anweisungen (optional)</FormLabel>
                        <FormControl>
                           <Input placeholder="z.B. 'mit Brille', 'lächelnd'" {...field} />
                        </FormControl>
                    </FormItem>
                )}
               />

            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {isLoading ? 'Generiere...' : 'Foto jetzt erstellen'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generierte Fotos</CardTitle>
          <CardDescription>Hier erscheinen Ihre professionellen Bewerbungsfotos. Wählen Sie Ihr Lieblingsbild aus und laden Sie es herunter.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center h-full min-h-64 rounded-lg border-2 border-dashed bg-muted/50 p-12 text-center">
              <div>
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">KI-Magie im Gange...</p>
                <p className="mt-2 text-sm text-muted-foreground">Dies kann einen Moment dauern.</p>
              </div>
            </div>
          )}
          {!isLoading && generatedPhotos.length === 0 && (
             <div className="flex items-center justify-center h-full min-h-64 rounded-lg border-2 border-dashed bg-muted/50 p-12 text-center">
                <div>
                    <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-muted-foreground">Ihr perfektes Foto wartet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Füllen Sie links das Formular aus, um zu beginnen.</p>
                </div>
            </div>
          )}
           {!isLoading && generatedPhotos.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {generatedPhotos.map((photo, index) => (
                <div key={index} className="space-y-3">
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden border">
                    <Image src={photo} alt={`Generated Photo ${index + 1}`} layout="fill" objectFit="cover" />
                  </div>
                  <Button onClick={() => downloadImage(photo, index)} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Herunterladen
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
