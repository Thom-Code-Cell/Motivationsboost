'use server';

import { authorizeAI } from '@/lib/server/session';
import { callOpenAIForm } from '@/lib/server/openai-client';
import { ai } from '@/ai/genkit';
import {
  GenerateProfessionalPhotoInputSchema, GenerateProfessionalPhotoOutputSchema,
  type GenerateProfessionalPhotoInput, type GenerateProfessionalPhotoOutput,
} from '@/ai/schemas';

const styles: Record<string, string> = {
  business: 'formal business attire and neutral studio background',
  modern: 'smart-casual outfit, subtle office background',
  creative: 'professional creative clothing, simple textured background',
};

export async function generateProfessionalPhoto(input: GenerateProfessionalPhotoInput): Promise<GenerateProfessionalPhotoOutput> {
  input = GenerateProfessionalPhotoInputSchema.parse(input);
  await authorizeAI(input, 12_000_000);
  return generateProfessionalPhotoFlow(input);
}

const generateProfessionalPhotoFlow = ai.defineFlow({
  name: 'generateProfessionalPhotoFlow',
  inputSchema: GenerateProfessionalPhotoInputSchema,
  outputSchema: GenerateProfessionalPhotoOutputSchema,
}, async ({userPhoto, style, prompt: userPrompt}) => {
  // Explicit opt-in for the expensive feature. Text AI works without it.
  if (process.env.OPENAI_ENABLE_IMAGES !== 'true') {
    throw new Error('KI-Fotoeditor ist noch nicht freigeschaltet.');
  }
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(userPhoto);
  if (!match) throw new Error('Das hochgeladene Bild hat ein ungültiges Format.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 8_000_000 || bytes.length === 0) throw new Error('Bild ist zu gross oder leer.');
  const prompt = [
    'Edit this real applicant photo into a suitable professional CV portrait.',
    'Preserve identifiable facial features, age, hairstyle and skin tone; do not generate a different person.',
    `Use ${styles[style] || styles.business}.`,
    'Keep the result realistic, natural and non-deceptive.',
    userPrompt ? `Additional user preference: ${userPrompt}` : '',
  ].filter(Boolean).join(' ');
  const form = new FormData();
  form.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini');
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  form.append('quality', 'low');
  form.append('image', new Blob([bytes], {type: match[1]}), match[1] === 'image/jpeg' ? 'portrait.jpg' : match[1] === 'image/webp' ? 'portrait.webp' : 'portrait.png');
  const response = await callOpenAIForm('/images/edits', form);
  const payload = await response.json() as { data?: Array<{b64_json?: string}> };
  const base64 = payload.data?.[0]?.b64_json;
  if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) throw new Error('OpenAI hat kein Bild geliefert.');
  return {generatedPhoto: 'data:image/png;base64,' + base64};
});
