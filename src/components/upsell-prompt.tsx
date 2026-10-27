"use client";
import type { User } from 'firebase/auth';
import type { UserData } from '@/types/user';
// Pricing/annual-upsell withheld until Payrexx is configured and terms verified.
export function UpsellPrompt(_props: { open: boolean; onOpenChange: (open: boolean) => void; user: User; userData: UserData }) {
  return null;
}
