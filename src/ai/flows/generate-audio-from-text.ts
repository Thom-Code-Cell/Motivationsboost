'use server';

import { authorizeAI } from '@/lib/server/session';
import { callOpenAI } from '@/lib/server/openai-client';
import { ai } from '@/ai/genkit';
import {
  GenerateAudioFromTextInputSchema, GenerateAudioFromTextOutputSchema,
  type GenerateAudioFromTextInput, type GenerateAudioFromTextOutput,
} from '@/ai/schemas';

export async function generateAudioFromText(input: GenerateAudioFromTextInput): Promise<GenerateAudioFromTextOutput> {
  input = GenerateAudioFromTextInputSchema.parse(input);
  await authorizeAI(input);
  return generateAudioFromTextFlow(input);
}

const generateAudioFromTextFlow = ai.defineFlow({
  name: 'generateAudioFromTextFlow',
  inputSchema: GenerateAudioFromTextInputSchema,
  outputSchema: GenerateAudioFromTextOutputSchema,
}, async input => {
  if (!input.text.trim() || input.text.length > 4096) throw new Error('Sprachausgabe unterstützt 1 bis 4096 Zeichen.');
  const response = await callOpenAI('/audio/speech', {
    model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    voice: 'alloy',
    input: input.text,
    response_format: 'wav',
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('OpenAI lieferte keine gültige WAV-Datei.');
  }
  return { audioDataUri: 'data:audio/wav;base64,' + bytes.toString('base64') };
});
