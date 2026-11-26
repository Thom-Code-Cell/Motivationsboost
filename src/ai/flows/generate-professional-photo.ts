'use server';

import type { GenerateProfessionalPhotoInput, GenerateProfessionalPhotoOutput } from '@/ai/schemas';

export async function generateProfessionalPhoto(_input: GenerateProfessionalPhotoInput): Promise<GenerateProfessionalPhotoOutput> {
  throw new Error('Der KI-Fotoeditor ist in dieser Version nicht freigeschaltet.');
}