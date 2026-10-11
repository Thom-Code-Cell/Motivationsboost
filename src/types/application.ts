
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

export const ApplicationStatusSchema = z.enum([
  'Entwurf',
  'Gesendet',
  'Antwort erhalten',
  'Interview',
  'Absage',
  'Zusage',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const ApplicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  jobUrl: z.string().regex(/^https?:\/\//, 'Bitte einen HTTP- oder HTTPS-Link eingeben.').url(),
  status: ApplicationStatusSchema,
  // Using any to prevent build errors with Timestamp objects from Firestore
  // Validation is now handled by safeToDate utility
  applicationDate: z.any(),
  notes: z.string().optional(),
  cvId: z.string().optional(),
  letterId: z.string().optional(),
});
export type Application = z.infer<typeof ApplicationSchema>;

export const AddApplicationSchema = z.object({
  jobTitle: z.string().min(1, "Jobtitel ist erforderlich."),
  company: z.string().min(1, "Firma ist erforderlich."),
  jobUrl: z.string().regex(/^https?:\/\//, 'Bitte einen HTTP- oder HTTPS-Link eingeben.').url("Bitte geben Sie eine gültige URL ein."),
  notes: z.string().optional(),
});
export type AddApplicationData = z.infer<typeof AddApplicationSchema>;
