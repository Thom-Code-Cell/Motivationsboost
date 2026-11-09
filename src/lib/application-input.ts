import { z } from 'zod/v3';
export const applicationInput = z.object({
  jobTitle: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200),
  jobUrl: z.string().url().max(2048).refine(value => /^https?:\/\//i.test(value)),
  notes: z.string().max(10000).optional().default(''),
}).strict();
export const applicationUpdate = z.object({
  status: z.enum(['Entwurf', 'Gesendet', 'Antwort erhalten', 'Interview', 'Absage', 'Zusage']),
}).strict();
