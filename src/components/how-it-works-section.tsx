
"use client";

import { UploadCloud, Sparkles, Send } from "lucide-react";
import Image from "next/image";

export function HowItWorksSection() {
    return (
        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
                <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">In 3 Schritten zum Traumjob</h2>
                    <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        Unser Prozess ist einfach, intuitiv und darauf ausgelegt, Ihnen schnellstmöglich zum Erfolg zu verhelfen.
                    </p>
                </div>
                <div className="mx-auto w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <UploadCloud className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-2 text-center">
                            <h3 className="text-xl font-bold">1. Hochladen</h3>
                            <p className="text-muted-foreground">
                                Laden Sie Ihre bestehenden Zeugnisse, Diplome oder einen alten Lebenslauf hoch.
                            </p>
                        </div>
                    </div>
                     <div className="flex flex-col items-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-2 text-center">
                            <h3 className="text-xl font-bold">2. Generieren & Optimieren</h3>
                            <p className="text-muted-foreground">
                                Lassen Sie die KI Ihre Dokumente erstellen, analysieren und perfekt auf jede Stelle zuschneiden.
                            </p>
                        </div>
                    </div>
                     <div className="flex flex-col items-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <Send className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-2 text-center">
                            <h3 className="text-xl font-bold">3. Bewerben</h3>
                            <p className="text-muted-foreground">
                                Exportieren Sie Ihre professionelle Bewerbungsmappe und überzeugen Sie Ihren zukünftigen Arbeitgeber.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
