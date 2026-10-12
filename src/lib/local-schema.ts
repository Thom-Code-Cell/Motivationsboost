import { z } from "zod";
import { GenerateCvFromDocumentsOutputSchema } from "@/ai/schemas";
export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  company: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  status: z.enum([
    "Entwurf",
    "Gesendet",
    "Interview",
    "Zusage",
    "Absage",
    "Archiv",
  ]),
  notes: z.string().max(50000),
  jobText: z.string().max(50000),
  cvText: z.string().max(100000),
  letter: z.string().max(100000),
  cv: GenerateCvFromDocumentsOutputSchema.nullable(),
  documentIds: z.array(z.string().uuid()).max(100),
  results: z.record(z.string().max(100), z.string().max(200000)),
  sourceText: z.string().max(100000).default(""),
  inputs: z.record(z.string().max(100), z.string().max(200000)).default({}),
});
export type LocalApplication = z.infer<typeof ApplicationSchema>;
export const SettingsSchema = z.object({
  language: z.enum(["de", "en", "fr", "it"]).default("de"),
});
export function cvToText(
  cv: z.infer<typeof GenerateCvFromDocumentsOutputSchema>,
) {
  return [
    cv.personalInfo.name,
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.address,
    cv.personalInfo.linkedin || "",
    cv.summary,
    ...cv.sections.flatMap((s) => [
      s.title,
      ...s.items.map(
        (i) => `${i.title} | ${i.subtitle} | ${i.date}\n${i.description}`,
      ),
    ]),
    "Fähigkeiten",
    cv.skills.join(", "),
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function currentCv(
  app: LocalApplication,
): z.infer<typeof GenerateCvFromDocumentsOutputSchema> {
  if (app.cv && cvToText(app.cv) === app.cvText) return app.cv;
  // The reviewed editor text is authoritative after manual or ATS changes.
  return {
    personalInfo: { name: "", email: "", phone: "", address: "" },
    summary: app.cvText,
    sections: [],
    skills: [],
  };
}
