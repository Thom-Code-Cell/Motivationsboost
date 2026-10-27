
'use server';
/**
 * @fileOverview A flow to convert text into speech using a Genkit model.
 *
 * - generateAudioFromText - A function that handles the text-to-speech conversion.
 * - GenerateAudioFromTextInput - The input type for the function.
 * - GenerateAudioFromTextOutput - The return type for the function.
 */

import { authorizeAI } from '@/lib/server/session';
import { ai } from '@/ai/genkit';
import { z } from 'zod/v3';
import { pcmToWav } from '@/lib/audio';
import {
  GenerateAudioFromTextInputSchema,
  GenerateAudioFromTextOutputSchema,
  type GenerateAudioFromTextInput,
  type GenerateAudioFromTextOutput,
  type Language,
} from '@/ai/schemas';


export async function generateAudioFromText(input: GenerateAudioFromTextInput): Promise<GenerateAudioFromTextOutput> {
  input = GenerateAudioFromTextInputSchema.parse(input);
  await authorizeAI(input);
  return generateAudioFromTextFlow(input);
}


const generateAudioFromTextFlow = ai.defineFlow(
  {
    name: 'generateAudioFromTextFlow',
    inputSchema: GenerateAudioFromTextInputSchema,
    outputSchema: GenerateAudioFromTextOutputSchema,
  },
  async (input) => {
    const voiceMap: Record<Language, 'Algenib' | 'Spica' | 'Enif' | 'Regulus'> = {
        'de': 'Algenib', // German
        'en': 'Spica',   // English
        'fr': 'Enif',    // French
        'it': 'Regulus', // Italian
    };
    const voice = voiceMap[input.language] || 'Algenib';

    const { media } = await ai.generate({
      model: process.env.GOOGLE_AI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
      prompt: input.text,
    });

    if (!media || !media.url) {
      throw new Error('No audio media was returned from the model.');
    }

    // The media URL is a data URI with base64-encoded raw PCM data.
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    // Convert the PCM buffer to a WAV buffer and then to a base64 string.
    const wavBase64 = Buffer.from(pcmToWav(audioBuffer)).toString('base64');

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
