import { z } from 'zod';

export const BadgeConfig = {
  cvReady: { name: "CV-Meister", description: "Ersten Lebenslauf mit KI generiert.", iconName: 'FileText' as const },
  atsWin: { name: "ATS-Champion", description: "Einen ATS-Score von über 85% erreicht.", iconName: 'Target' as const },
  interviewMaster: { name: "Interview-Profi", description: "Interviewfragen generiert und dich vorbereitet.", iconName: 'MessageCircleQuestion' as const },
  motivationsHeld: { name: "Wort-Virtuose", description: "Drei Motivationsschreiben erstellt.", iconName: 'PenSquare' as const },
  proUser: { name: "Power-Nutzer", description: "Auf den Pro-Plan aufgerüstet.", iconName: 'Star' as const },
  firstApplicationSent: { name: "Schnellstarter", description: "Die erste Bewerbung im Tracker als 'Gesendet' markiert.", iconName: 'Send' as const }
};

export type BadgeId = keyof typeof BadgeConfig;
const BadgeIds = Object.keys(BadgeConfig) as [BadgeId, ...BadgeId[]];

export const ProgressDataSchema = z.object({
  letterGenerationCount: z.number().default(0),
  earnedBadges: z.array(z.enum(BadgeIds)).default([]),
  progressScore: z.number().min(0).max(100).default(0),
});

export type ProgressData = z.infer<typeof ProgressDataSchema>;
