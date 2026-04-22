
"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Anna M.",
    role: "Marketing Manager",
    image: "https://placehold.co/100x100.png",
    dataAiHint: "woman person",
    quote: "Innerhalb von zwei Tagen hatte ich einen perfekt auf die Stelle zugeschnittenen Lebenslauf und eine Einladung zum Gespräch. Unglaublich, wie viel Zeit ich gespart habe!",
  },
  {
    name: "David K.",
    role: "Software-Entwickler",
    image: "https://placehold.co/100x100.png",
    dataAiHint: "man person",
    quote: "Der Interview-Coach war Gold wert. Ich konnte meine Antworten üben und ging viel selbstbewusster ins Gespräch. Ich habe den Job bekommen!",
  },
  {
    name: "Sophie L.",
    role: "Quereinsteigerin",
    image: "https://placehold.co/100x100.png",
    dataAiHint: "person woman",
    quote: "Als Quereinsteigerin war ich unsicher, wie ich meine Fähigkeiten präsentieren soll. Die KI hat mir geholfen, meine Stärken hervorzuheben. Ein absoluter Game-Changer.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Von Nutzern wie Ihnen geliebt</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Hören Sie, was unsere Nutzer über ihre erfolgreichen Bewerbungen mit unserer App sagen.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:gap-12 mt-12">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="shadow-lg text-left">
              <CardContent className="p-6">
                <blockquote className="text-lg font-semibold leading-snug">
                  “{testimonial.quote}”
                </blockquote>
              </CardContent>
              <CardHeader className="pt-0">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={testimonial.image} alt={testimonial.name} data-ai-hint={testimonial.dataAiHint} />
                    <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
