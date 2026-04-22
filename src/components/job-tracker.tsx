
"use client";

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import {
  addApplication,
  getApplications,
  updateApplicationStatus,
  deleteApplication,
} from '@/services/applications';
import {
  type Application,
  type AddApplicationData,
  AddApplicationSchema,
  ApplicationStatusSchema,
  type ApplicationStatus,
} from '@/types/application';
import { updateProgress } from '@/services/progress';
import { BadgeConfig } from '@/types/progress';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/core-input';
import { Textarea } from '@/components/ui/core-textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Trash2, Briefcase, ExternalLink } from 'lucide-react';
import { safeToDate } from '@/lib/safeToDate';

interface JobTrackerProps {
  user: User | null;
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


export function JobTracker({ user }: JobTrackerProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddApplicationData>({
    resolver: zodResolver(AddApplicationSchema),
    defaultValues: {
      jobTitle: '',
      company: '',
      jobUrl: '',
      notes: '',
    },
  });

  const fetchApplications = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userApplications = await getApplications(user.uid);
      setApplications(userApplications);
    } catch (error) {
      toast({ title: 'Fehler', description: 'Bewerbungen konnten nicht geladen werden.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAddApplication = async (data: AddApplicationData) => {
    if (!user) return;
    try {
      await addApplication(user.uid, data);
      toast({ title: 'Erfolg', description: 'Bewerbung wurde hinzugefügt.' });
      form.reset();
      setIsDialogOpen(false);
      await fetchApplications();
    } catch (error) {
      toast({ title: 'Fehler', description: 'Bewerbung konnte nicht hinzugefügt werden.', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (docId: string, status: ApplicationStatus) => {
    if (!user) return;
    try {
      await updateApplicationStatus(docId, status);

      if (status === 'Gesendet') {
        const newBadge = await updateProgress(user.uid, { type: 'APPLICATION_SENT' });
         if (newBadge) {
              const config = BadgeConfig[newBadge];
              toast({
                  title: "🎉 Abzeichen freigeschaltet!",
                  description: `Du hast das Abzeichen "${config.name}" erhalten.`,
              });
          }
      }

      toast({ title: 'Erfolg', description: 'Status wurde aktualisiert.' });
      await fetchApplications();
    } catch (error) {
      toast({ title: 'Fehler', description: 'Status konnte nicht aktualisiert werden.', variant: 'destructive' });
    }
  };

  const handleDeleteApplication = async (docId: string) => {
    try {
        await deleteApplication(docId);
        toast({ title: "Gelöscht", description: "Die Bewerbung wurde entfernt." });
        await fetchApplications();
    } catch (error) {
        toast({ title: "Fehler", description: "Die Bewerbung konnte nicht gelöscht werden.", variant: "destructive" });
    }
  };


  if (!user) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Job-Tracker</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Bitte melden Sie sich an, um Ihre Bewerbungen zu verwalten.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-4 justify-between items-start">
            <div>
                <CardTitle>Job-Tracker</CardTitle>
                <CardDescription>Behalten Sie den Überblick über alle Ihre Bewerbungen an einem Ort.</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Neue Bewerbung</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddApplication)}>
                        <DialogHeader>
                            <DialogTitle>Neue Bewerbung hinzufügen</DialogTitle>
                            <DialogDescription>Geben Sie die Details der Stelle ein, auf die Sie sich bewerben.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <FormField control={form.control} name="jobTitle" render={({ field }) => (
                                <FormItem><FormLabel>Jobtitel</FormLabel><FormControl><Input {...field} placeholder="z.B. Softwareentwickler" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="company" render={({ field }) => (
                                <FormItem><FormLabel>Firma</FormLabel><FormControl><Input {...field} placeholder="z.B. Beispiel AG" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="jobUrl" render={({ field }) => (
                                <FormItem><FormLabel>Link zur Anzeige</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel>Notizen (optional)</FormLabel><FormControl><Textarea {...field} placeholder="z.B. Link zum CV in Google Drive, Kontaktperson, etc." /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Abbrechen</Button></DialogClose>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Speichern
                            </Button>
                        </DialogFooter>
                    </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : applications.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/20">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-sm font-semibold text-foreground">Keine Bewerbungen</h3>
                <p className="mt-1 text-sm text-muted-foreground">Fügen Sie Ihre erste Bewerbung hinzu, um loszulegen.</p>
                 <Button className="mt-4" onClick={() => setIsDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Neue Bewerbung</Button>
            </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stelle</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="w-[180px]">Status</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => {
                const applicationDate = safeToDate(app.applicationDate);
                return (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="font-medium">
                           {app.jobUrl ? (
                              <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                                  {app.jobTitle}
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </a>
                          ) : (
                              app.jobTitle
                          )}
                      </div>
                      <div className="text-sm text-muted-foreground">{app.company}</div>
                    </TableCell>
                    <TableCell>
                      {applicationDate ? format(applicationDate, 'dd. MMM yyyy', { locale: de }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Select value={app.status} onValueChange={(value) => handleStatusChange(app.id, value as ApplicationStatus)}>
                        <SelectTrigger>
                          <SelectValue asChild>
                             <Badge variant={statusVariant[app.status] || 'default'} className={`${statusColor[app.status] || ''} text-nowrap`}>{app.status}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ApplicationStatusSchema.options.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                  <span className="sr-only">Löschen</span>
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Diese Aktion kann nicht rückgängig gemacht werden. Dadurch wird die Bewerbung für "{app.jobTitle}" bei {app.company} endgültig gelöscht.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteApplication(app.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Löschen</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
